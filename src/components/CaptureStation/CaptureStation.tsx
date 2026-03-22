'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { processCapture } from './FaceProcessor';
import { DetectionData, useFaceDetection } from './useFaceDetection';
import { useWebcam } from './useWebcam';

const MATCH_THRESHOLD = 0.6;

function euclideanDistance(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

function isKnownFace(descriptor: Float32Array, known: Float32Array[]): boolean {
  return known.some((k) => euclideanDistance(descriptor, k) < MATCH_THRESHOLD);
}

// Custom colors mapped to arbitrary tailwind values to avoid dirtying global configs
const colors = {
  background: 'bg-[#0c0e10]',
  surface: 'bg-[#0c0e10]', // same as background based on spec
  surfaceHigh: 'bg-[#232629]',
  surfaceMed: 'bg-[#171a1c]',
  surfaceLow: 'bg-[#111416]',
  surfaceLowest: 'bg-[#000000]',
  primary: 'text-[#8ff5ff]',
  bgPrimary: 'bg-[#8ff5ff]',
  borderPrimary: 'border-[#8ff5ff]',
  primaryDim: 'to-[#00deec]', // for gradient
  onSurface: 'text-[#f1f0f3]',
  onSurfaceVariant: 'text-[#aaabad]',
  outlineVariant: 'border-[#46484a]',
};

// Font imports through google fonts from layout
// But we can just use normal sans if they aren't loaded, or standard tailwind classes
// for the cyber feel we use uppercase, tracking-widest, font-mono or sans.

export function CaptureStation() {
  const { videoRef, stream, isInitializing, error, startWebcam, stopWebcam } =
    useWebcam();
  const [status, setStatus] = useState<
    'idle' | 'starting' | 'active' | 'error'
  >('idle');
  const { modelsLoaded, detections, samples } = useFaceDetection(
    videoRef,
    status === 'active',
  );
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [localArchive, setLocalArchive] = useState<
    Array<{ id: string; image: string; descriptor?: number[] }>
  >([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const knownDescriptors = useRef<Map<string, Float32Array>>(new Map());

  // Initial load of archive
  useEffect(() => {
    const existing = JSON.parse(localStorage.getItem('captured_faces') || '[]');
    // Migrate old format (array of strings) to new format (array of objects)
    const migrated = existing.map(
      (
        item: string | { id: string; image: string; descriptor?: number[] },
        idx: number,
      ) => {
        if (typeof item === 'string') {
          return { id: `face_${Date.now()}_${idx}`, image: item };
        }
        return item;
      },
    );
    setLocalArchive(migrated);

    // Rebuild knownDescriptors from stored data
    knownDescriptors.current.clear();
    for (const face of migrated) {
      if (face.descriptor) {
        knownDescriptors.current.set(
          face.id,
          new Float32Array(face.descriptor),
        );
      }
    }
  }, []);

  // Filter detections to only new (unknown) faces
  const getNewFaces = (dets: DetectionData[]): DetectionData[] =>
    dets.filter(
      (d) =>
        d.descriptor &&
        !isKnownFace(
          d.descriptor,
          Array.from(knownDescriptors.current.values()),
        ),
    );

  // Capture only faces not previously seen
  const handleCapture = useCallback(async () => {
    const newFaces = getNewFaces(detections);
    if (newFaces.length === 0 || !videoRef.current) return;

    setIsCapturing(true);
    try {
      const capturePromises = newFaces.map(async (det) => {
        const result = await processCapture(
          videoRef.current!,
          det.box,
          det.landmarks,
        );

        const faceId = `face_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        // 1. POST to /api/faces (filtered version for Dev A)
        await fetch('/api/faces', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: faceId,
            image: result.filtered,
            name: 'Guest',
            descriptor: det.descriptor ? Array.from(det.descriptor) : undefined,
          }),
        });

        // 2. Save to Local Storage with ID and descriptor
        const existingString = localStorage.getItem('captured_faces');
        const existing = existingString ? JSON.parse(existingString) : [];
        const updated = [
          {
            id: faceId,
            image: result.filtered,
            descriptor: det.descriptor ? Array.from(det.descriptor) : undefined,
          },
          ...existing,
        ].slice(0, 10);
        localStorage.setItem('captured_faces', JSON.stringify(updated));

        // 3. Remember this face
        if (det.descriptor) {
          knownDescriptors.current.set(faceId, det.descriptor);
        }

        return {
          raw: result.raw,
          filtered: result.filtered,
          updated,
          id: faceId,
        };
      });

      const results = await Promise.all(capturePromises);

      if (results.length > 0) {
        setCapturedImage(results[0].filtered);
        setRawImage(results[0].raw);
        setLocalArchive(results[0].updated);

        toast.success('MULTI_DATA_UPLINK', {
          description: `${results.length} new biometric profile(s) transmitted.`,
          duration: 2000,
        });
      }
    } catch (err) {
      console.error('Capture error:', err);
      toast.error('CAPTURE_ERROR', {
        description: 'Failed to process group biometric data.',
      });
    } finally {
      setIsCapturing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detections]);

  // Auto-shutter: fires when new (unknown) faces appear
  useEffect(() => {
    if (status !== 'active' || isCapturing) return;
    if (getNewFaces(detections).length > 0) {
      handleCapture();
    }
  }, [detections, handleCapture, status, isCapturing]);

  // Delete a single face by ID
  const handleDeleteFace = async (faceId: string) => {
    try {
      // Remove from API
      await fetch(`/api/faces/${faceId}`, {
        method: 'DELETE',
      });

      // Remove from local state and storage
      const updated = localArchive.filter((f) => f.id !== faceId);
      setLocalArchive(updated);
      localStorage.setItem('captured_faces', JSON.stringify(updated));

      // Remove the descriptor so face can be registered again
      knownDescriptors.current.delete(faceId);

      toast.success('FACE_DELETED', {
        description: 'Biometric profile removed.',
        duration: 1500,
      });
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('DELETE_ERROR', {
        description: 'Failed to delete face.',
      });
    }
  };

  useEffect(() => {
    if (isInitializing) setStatus('starting');
    else if (error) setStatus('error');
    else if (stream) setStatus('active');
    else setStatus('idle');
  }, [isInitializing, stream, error]);

  const toggleSystem = () => {
    if (stream) {
      stopWebcam();
    } else {
      startWebcam();
    }
  };

  useEffect(() => {
    if (error) {
      toast.error('Error con la cámara', {
        description: error.message || 'No se pudo acceder.',
      });
    }
  }, [error]);

  return (
    <div
      className={`min-h-screen ${colors.background} ${colors.onSurface} font-sans selection:bg-[#8ff5ff] selection:text-[#005d63] relative overflow-x-hidden`}
    >
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-14 bg-[#0c0e10]/80 backdrop-blur-xl border-b border-[#8ff5ff]/10 shadow-[0_0_20px_rgba(143,245,255,0.04)]">
        <div className="flex items-center gap-4">
          <span className="text-[#8ff5ff] font-bold tracking-tighter text-xl">
            SYS_REF_04
          </span>
          <div className="h-4 w-px bg-[#46484a]/30"></div>
          <span className="uppercase tracking-[0.05em] text-sm font-bold text-[#8ff5ff]">
            TERMINAL_ACTIVE
          </span>
        </div>
        <div className="hidden md:flex gap-8 items-center h-full">
          <nav className="flex gap-6 h-full items-center">
            <span className="text-[#8ff5ff] border-b-2 border-[#8ff5ff] h-full flex items-center text-[10px] uppercase font-bold tracking-widest">
              LIVE_SCAN
            </span>
          </nav>
        </div>
      </header>

      {/* Main Content Canvas (No Sidebar) */}
      <main className="pt-14 min-h-screen relative overflow-hidden">
        {/* Status Bar */}
        <div
          className={`w-full h-8 ${colors.surfaceHigh} flex items-center justify-between px-6 border-b ${colors.outlineVariant}/20`}
        >
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div
                className={`w-1.5 h-1.5 rounded-full ${colors.bgPrimary} ${stream ? 'animate-pulse' : 'opacity-30'} shadow-[0_0_8px_#8ff5ff]`}
              ></div>
              <span
                className={`text-[10px] ${colors.onSurfaceVariant} font-medium tracking-tight`}
              >
                {status === 'active' ? 'LATENCY: 12ms' : 'LATENCY: N/A'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 hidden sm:flex">
            <span className="text-[10px] text-[#8ff5ff] font-bold tracking-widest uppercase">
              ENCRYPTION: AES-256_ACTIVE
            </span>
            <span className={`text-[10px] ${colors.onSurfaceVariant}`}>
              UTC: {new Date().toISOString().substring(11, 19)}
            </span>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1600px] mx-auto">
          {/* Central Capture Area */}
          <div className="lg:col-span-8 space-y-4">
            <div
              className={`relative aspect-video ${colors.surfaceLowest} border ${colors.borderPrimary}/20 rounded-lg overflow-hidden group`}
            >
              {!stream && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-[#46484a] z-10">
                  <span className="text-xl mb-2 font-mono uppercase tracking-widest">
                    {status === 'idle'
                      ? 'CAMERA_OFFLINE'
                      : status === 'starting'
                        ? 'INITIALIZING...'
                        : 'ERROR'}
                  </span>
                </div>
              )}

              {/* Video Element replacing img */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-1000 ${stream ? 'opacity-80 grayscale' : 'opacity-0'}`}
              />

              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#8ff5ff]/5 to-transparent h-[2px] w-full animate-[scan_3s_linear_infinite]"></div>

              {/* HUD Overlay */}
              <div className="absolute inset-0 p-4 sm:p-8 flex flex-col justify-between pointer-events-none">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <div className="w-8 h-8 border-t-2 border-l-2 border-[#8ff5ff]"></div>
                    <div className="text-[#8ff5ff] text-xs font-bold tracking-widest">
                      {stream ? 'SCAN_ACTIVE [L_77]' : 'SCAN_OFFLINE'}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <div className="w-8 h-8 border-t-2 border-r-2 border-[#8ff5ff]"></div>
                    <div className="text-[#aaabad] text-[10px]">
                      CAM_ID: SEC_401
                    </div>
                  </div>
                </div>

                {/* Dynamic tracking reticles for multiple faces */}
                {stream &&
                  detections.map((det, idx) => {
                    const detKey = `${Math.round(det.box.x)}-${Math.round(det.box.y)}-${Math.round(det.box.width)}-${Math.round(det.box.height)}`;
                    return (
                      <div
                        key={detKey}
                        style={{
                          position: 'absolute',
                          left: `${100 - ((det.box.x + det.box.width) / (videoRef.current?.videoWidth || 1)) * 100}%`,
                          top: `${(det.box.y / (videoRef.current?.videoHeight || 1)) * 100}%`,
                          width: `${(det.box.width / (videoRef.current?.videoWidth || 1)) * 100}%`,
                          height: `${(det.box.height / (videoRef.current?.videoHeight || 1)) * 100}%`,
                        }}
                        className="border border-[#8ff5ff] transition-all duration-100 pointer-events-none flex items-center justify-center shadow-[0_0_15px_rgba(143,245,255,0.2)]"
                      >
                        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#8ff5ff]"></div>
                        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#8ff5ff]"></div>
                        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#8ff5ff]"></div>
                        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#8ff5ff]"></div>

                        <div className="absolute -bottom-5 left-0 whitespace-nowrap text-[#8ff5ff] text-[7px] font-black tracking-widest bg-[#0c0e10]/80 px-1 py-0.5 backdrop-blur-sm border border-[#8ff5ff]/20">
                          ID_{idx.toString().padStart(2, '0')}{' '}
                          {(det.confidence * 100).toFixed(0)}%
                        </div>
                      </div>
                    );
                  })}

                {/* Default searching reticle when no faces */}
                {stream && detections.length === 0 && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-64 border border-[#8ff5ff]/10 flex items-center justify-center opacity-50">
                    <span className="text-[10px] text-[#8ff5ff]/30 font-bold tracking-[0.3em] uppercase animate-pulse">
                      Scanning_Area
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-end">
                  <div className="w-8 h-8 border-b-2 border-l-2 border-[#8ff5ff]"></div>
                  <div className="w-8 h-8 border-b-2 border-r-2 border-[#8ff5ff]"></div>
                </div>
              </div>
            </div>

            {/* Footer Action */}
            <div
              className={`flex flex-col sm:flex-row gap-4 items-center justify-between ${colors.surfaceMed} p-6 rounded-lg border ${colors.outlineVariant}/10`}
            >
              <div>
                <h3 className="text-[#8ff5ff] text-sm font-bold tracking-widest mb-1">
                  OPERATIONAL_CONTROL
                </h3>
                <p className={`${colors.onSurfaceVariant} text-xs max-w-sm`}>
                  Ensure subject face is within the primary bounding box before
                  initializing sequence.
                </p>
              </div>
              <button
                onClick={toggleSystem}
                disabled={isInitializing}
                className={`grow sm:grow-0 bg-gradient-to-r ${!stream ? `from-[#8ff5ff] ${colors.primaryDim} text-[#005d63]` : `from-red-900 to-red-800 text-red-100`} font-black px-12 py-4 rounded-lg tracking-[0.15em] shadow-[0_0_20px_rgba(143,245,255,0.2)] hover:scale-105 transition-all outline-none uppercase font-mono`}
              >
                {isInitializing
                  ? 'LOADING_LINK...'
                  : !stream
                    ? 'SYSTEM_OFFLINE // INITIALIZE'
                    : 'SYSTEM_ACTIVE // TERMINATE_LINK'}
              </button>
            </div>
          </div>

          {/* Right Processing Panel */}
          <div className="lg:col-span-4 space-y-6">
            <div
              className={`${colors.surfaceMed} border ${colors.outlineVariant}/10 rounded-lg p-6 flex flex-col gap-6`}
            >
              <div
                className={`flex items-center justify-between border-b ${colors.outlineVariant}/10 pb-4`}
              >
                <span className="text-[#8ff5ff] font-bold text-xs tracking-widest">
                  PROCESSING PIPELINE
                </span>
              </div>

              {/* RAW SOURCE */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span
                    className={`text-[10px] ${colors.onSurfaceVariant} font-bold`}
                  >
                    RAW_SOURCE
                  </span>
                  <span className="text-[10px] text-[#8ff5ff]">
                    {stream ? 'LIVE' : 'STANDBY'}
                  </span>
                </div>
                <div
                  className={`h-32 ${colors.surfaceLowest} rounded border ${colors.outlineVariant}/20 overflow-hidden relative`}
                >
                  {rawImage ? (
                    <img
                      src={rawImage}
                      className="w-full h-full object-cover"
                      alt="Raw Source"
                    />
                  ) : stream ? (
                    <div className="w-full h-full bg-slate-800 animate-pulse">
                      <div className="absolute bottom-2 left-2 flex gap-1">
                        <div className="w-1 h-3 bg-[#8ff5ff]/40"></div>
                        <div className="w-1 h-5 bg-[#8ff5ff]/40"></div>
                        <div className="w-1 h-2 bg-[#8ff5ff]/40"></div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#46484a] text-xs font-mono">
                      NO_SIGNAL
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0c0e10]/80 to-transparent"></div>
                </div>
              </div>

              {/* BIOMETRIC OUTPUT */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span
                    className={`text-[10px] ${colors.onSurfaceVariant} font-bold`}
                  >
                    BIOMETRIC_OUTPUT
                  </span>
                  <span className="text-[10px] text-[#8ff5ff]">WAITING</span>
                </div>
                <div
                  className={`h-48 ${colors.surfaceLowest} rounded border border-[#8ff5ff]/20 overflow-hidden relative group`}
                >
                  {capturedImage ? (
                    <img
                      src={capturedImage}
                      className="w-full h-full object-cover contrast-150 brightness-75"
                      alt="Biometric Output"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[#8ff5ff]/50 font-mono text-[10px] tracking-widest">
                        PENDING_FACE_DATA
                      </span>
                    </div>
                  )}

                  {/* Digital Artifacts */}
                  <div className="absolute inset-0 pointer-events-none border-2 border-[#8ff5ff]/10"></div>
                  <div className="absolute top-4 right-4 text-[8px] font-mono text-[#8ff5ff] bg-[#0c0e10]/80 p-1 border border-[#8ff5ff]/20">
                    FR_ID: ---
                  </div>
                  {/* Tracking Overlays */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 border border-dashed border-[#8ff5ff]/30 rounded-full"></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div
                  className={`${colors.surfaceLow} p-3 rounded border ${colors.outlineVariant}/10`}
                >
                  <p
                    className={`text-[8px] ${colors.onSurfaceVariant} font-bold uppercase tracking-widest mb-1`}
                  >
                    SUBJECTS
                  </p>
                  <p className="text-lg font-black text-[#8ff5ff]">
                    {detections.length}
                  </p>
                </div>
                <div
                  className={`${colors.surfaceLow} p-3 rounded border ${colors.outlineVariant}/10`}
                >
                  <p
                    className={`text-[8px] ${colors.onSurfaceVariant} font-bold uppercase tracking-widest mb-1`}
                  >
                    SCAN_OPS
                  </p>
                  <p className="text-lg font-black text-[#8ff5ff]">{samples}</p>
                </div>
              </div>
            </div>

            {/* Status Indicators */}
            <div
              className={`${colors.surfaceMed} border ${colors.outlineVariant}/10 rounded-lg p-4 space-y-3`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${stream ? 'bg-[#8ff5ff] shadow-[0_0_8px_#8ff5ff]' : 'bg-[#46484a]'}`}
                  ></div>
                  <span className="text-[10px] font-bold tracking-widest">
                    SENSOR_CONNECT
                  </span>
                </div>
                <span
                  className={`text-[9px] font-bold ${stream ? 'text-[#8ff5ff]' : 'text-[#46484a]'}`}
                >
                  {stream ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${stream ? 'bg-[#8ff5ff] shadow-[0_0_8px_#8ff5ff]' : 'bg-[#46484a]'}`}
                  ></div>
                  <span className="text-[10px] font-bold tracking-widest uppercase">
                    UPLINK_STATUS
                  </span>
                </div>
                <span
                  className={`text-[9px] font-bold ${stream ? 'text-[#8ff5ff]' : 'text-[#46484a]'}`}
                >
                  {stream ? 'SECURE' : 'OFFLINE'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#8ff5ff] shadow-[0_0_8px_#8ff5ff]"></div>
                  <span className="text-[10px] font-bold tracking-widest">
                    MODEL_LOAD
                  </span>
                  <div
                    className={`w-16 h-1 ${colors.surfaceLowest} rounded-full overflow-hidden`}
                  >
                    <div
                      className={`h-full bg-[#8ff5ff] ${modelsLoaded ? 'w-full' : 'w-1/3 animate-pulse'}`}
                    ></div>
                  </div>
                </div>
                <span className="text-[9px] text-[#8ff5ff] font-bold">
                  {modelsLoaded ? 'READY' : 'LOADING'}
                </span>
              </div>
            </div>

            {/* Local Archive Module */}
            <div
              className={`${colors.surfaceMed} border ${colors.outlineVariant}/10 rounded-lg p-6 flex flex-col gap-4`}
            >
              <div
                className={`flex items-center justify-between border-b ${colors.outlineVariant}/10 pb-4`}
              >
                <span className="text-[#8ff5ff] font-bold text-xs tracking-widest uppercase">
                  LOCAL_BIOMETRIC_ARCHIVE
                </span>
                <span className="text-[9px] text-[#aaabad]">
                  {localArchive.length}/10
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {localArchive.length > 0 ? (
                  localArchive.map((item) => (
                    <div
                      key={item.id}
                      className={`aspect-square relative rounded border ${colors.outlineVariant}/20 overflow-hidden group`}
                    >
                      <img
                        src={item.image}
                        className="w-full h-full object-cover grayscale brightness-75 hover:brightness-100 transition-all duration-300"
                        alt="Archive"
                      />
                      <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                      {/* Delete button - appears on hover */}
                      <button
                        onClick={() => handleDeleteFace(item.id)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 shadow-lg"
                        title="Delete face"
                      >
                        ×
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="col-span-4 h-20 flex items-center justify-center border border-dashed border-[#46484a]/30 rounded">
                    <span className="text-[9px] text-[#46484a] uppercase tracking-widest">
                      Archive empty
                    </span>
                  </div>
                )}
              </div>
              {localArchive.length > 0 && (
                <button
                  onClick={async () => {
                    try {
                      // Delete all faces from API
                      await Promise.all(
                        localArchive.map((item) =>
                          fetch(`/api/faces/${item.id}`, { method: 'DELETE' }),
                        ),
                      );

                      localStorage.removeItem('captured_faces');
                      setLocalArchive([]);
                      knownDescriptors.current.clear();

                      toast.success('ARCHIVE_CLEARED', {
                        description: 'All biometric profiles removed.',
                        duration: 1500,
                      });
                    } catch (err) {
                      console.error('Clear error:', err);
                      toast.error('CLEAR_ERROR', {
                        description: 'Failed to clear archive.',
                      });
                    }
                  }}
                  className="text-[8px] text-red-500/50 hover:text-red-500 uppercase font-bold tracking-widest text-right transition-colors"
                >
                  Clear Archive
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
      `,
        }}
      />
    </div>
  );
}
