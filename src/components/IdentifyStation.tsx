// ============================================================
// IdentifyStation — Camera-based face identification UI
// ============================================================
// Lets a guest use their phone camera to find their captured
// avatar. Extracts a face descriptor locally, then sends it
// to the server for matching — no guest data is downloaded.
//
// See docs/specs/features/IDENTIFY_PAGE.md for full spec.

'use client';

import * as faceapi from 'face-api.js';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

type IdentifyState = 'loading' | 'scanning' | 'matched' | 'not_found' | 'error';

const SCAN_INTERVAL_MS = 800;
const TIMEOUT_MS = 20_000;

const colors = {
  background: 'bg-[#0c0e10]',
  surfaceMed: 'bg-[#171a1c]',
  surfaceLow: 'bg-[#111416]',
  surfaceLowest: 'bg-[#000000]',
  onSurfaceVariant: 'text-[#aaabad]',
  outlineVariant: 'border-[#46484a]',
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function IdentifyStation() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const matchingRef = useRef(false);

  const [state, setState] = useState<IdentifyState>('loading');
  const [scanCount, setScanCount] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [guestCount, setGuestCount] = useState(0);
  const [matchedImage, setMatchedImage] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIMEOUT_MS / 1000);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
  }, []);

  const onMatch = useCallback(
    (id: string, image?: string, name?: string) => {
      cleanup();
      setState('matched');
      if (image) setMatchedImage(image);

      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 200]);
      }

      // Cache the matched face data so the share page reads it instantly
      // without needing a second API call (avoids Turbopack module isolation issues)
      if (image) {
        try {
          sessionStorage.setItem(
            `jg_face_${id}`,
            JSON.stringify({ id, image, name, timestamp: Date.now() }),
          );
        } catch {
          // sessionStorage full or blocked — share page will fall back to API
        }
      }

      // Brief pause so the user sees their matched avatar before navigating
      setTimeout(() => {
        router.push(`/share/${encodeURIComponent(id)}`);
      }, 1800);
    },
    [cleanup, router],
  );

  const startScanning = useCallback(async () => {
    setState('loading');
    setScanCount(0);
    setConfidence(0);
    setTimeLeft(TIMEOUT_MS / 1000);
    setMatchedImage(null);

    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
      ]);
    } catch {
      setState('error');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setState('error');
      return;
    }

    setState('scanning');

    // Countdown timer
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) return 0;
        return t - 1;
      });
    }, 1000);

    // Timeout
    timeoutRef.current = setTimeout(() => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      setState('not_found');
    }, TIMEOUT_MS);

    // Detection loop
    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;
      if (matchingRef.current) return;

      try {
        const detection = await faceapi
          .detectSingleFace(
            videoRef.current,
            new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }),
          )
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (!detection) return;

        setScanCount((c) => c + 1);
        setConfidence(Math.round(detection.detection.score * 100));

        matchingRef.current = true;
        const res = await fetch('/api/identify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            descriptor: Array.from(detection.descriptor),
          }),
        });
        const data = await res.json();
        matchingRef.current = false;

        if (data.guestCount) setGuestCount(data.guestCount);

        if (data.match) {
          onMatch(data.match.id, data.match.image, data.match.name);
        }
      } catch {
        matchingRef.current = false;
      }
    }, SCAN_INTERVAL_MS);
  }, [onMatch]);

  useEffect(() => {
    startScanning();
    return cleanup;
  }, [startScanning, cleanup]);

  const isActive = state === 'scanning';

  return (
    <>
      {/* ─── Main scanner UI ─────────────────────────────────── */}
      <div
        className={`h-[100dvh] w-full ${colors.background} text-[#f1f0f3] font-sans selection:bg-[#8ff5ff] selection:text-[#005d63] relative overflow-hidden flex flex-col`}
      >
        {/* Header */}
        <header className="flex-none flex justify-between items-center px-4 h-12 bg-[#0c0e10]/90 backdrop-blur-xl border-b border-[#8ff5ff]/10 z-50">
          <div className="flex items-center gap-3">
            <span className="text-[#8ff5ff] font-bold tracking-tighter text-lg">
              ID_SYS
            </span>
            <div className="h-3 w-px bg-[#46484a]/30"></div>
            <span className="uppercase tracking-[0.05em] text-[10px] font-bold text-[#8ff5ff]">
              {state === 'loading'
                ? 'INITIALIZING'
                : state === 'scanning'
                  ? 'SCANNING'
                  : state === 'matched'
                    ? 'MATCH_FOUND'
                    : state === 'not_found'
                      ? 'NO_MATCH'
                      : 'SYS_ERROR'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div
              className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#8ff5ff] animate-pulse shadow-[0_0_8px_#8ff5ff]' : state === 'matched' ? 'bg-green-400 shadow-[0_0_8px_#4ade80]' : 'bg-[#46484a]'}`}
            ></div>
            <span className="text-[9px] text-[#aaabad] font-mono">
              {new Date().toISOString().substring(11, 19)}
            </span>
          </div>
        </header>

        {/* Status Strip */}
        <div
          className={`flex-none h-7 bg-[#232629] flex items-center justify-between px-4 border-b ${colors.outlineVariant}/20`}
        >
          <div className="flex items-center gap-2">
            <div
              className={`w-1.5 h-1.5 rounded-full bg-[#8ff5ff] ${isActive ? 'animate-pulse' : 'opacity-30'} shadow-[0_0_6px_#8ff5ff]`}
            ></div>
            <span className="text-[9px] text-[#aaabad] tracking-tight">
              {isActive ? 'FACE_DETECT: ACTIVE' : 'FACE_DETECT: STANDBY'}
            </span>
          </div>
          <span className="text-[9px] text-[#8ff5ff] font-bold tracking-widest">
            {isActive ? `T-${timeLeft}s` : '---'}
          </span>
        </div>

        {/* Camera Viewport — fills remaining space */}
        <div className="flex-1 relative overflow-hidden">
          {/* Video */}
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`absolute inset-0 h-full w-full object-cover transform scale-x-[-1] transition-opacity duration-700 ${
              isActive
                ? 'opacity-80 grayscale'
                : state === 'matched'
                  ? 'opacity-40 grayscale'
                  : 'opacity-20 grayscale'
            }`}
          />

          {/* Scan line */}
          {isActive && (
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#8ff5ff]/5 to-transparent h-[2px] w-full animate-[scan_3s_linear_infinite] pointer-events-none"></div>
          )}

          {/* HUD Overlay */}
          <div className="absolute inset-0 p-4 flex flex-col justify-between pointer-events-none z-10">
            {/* Top corners */}
            <div className="flex justify-between items-start">
              <div className="flex flex-col gap-1">
                <div className="w-6 h-6 border-t-2 border-l-2 border-[#8ff5ff]"></div>
                <span className="text-[#8ff5ff] text-[8px] font-bold tracking-widest">
                  {isActive ? 'IDENT_ACTIVE' : 'IDENT_OFFLINE'}
                </span>
              </div>
              <div className="flex flex-col gap-1 items-end">
                <div className="w-6 h-6 border-t-2 border-r-2 border-[#8ff5ff]"></div>
                <span className="text-[#aaabad] text-[8px]">MODE: SELF_ID</span>
              </div>
            </div>

            {/* Central reticle */}
            {(isActive || state === 'loading') && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-56 flex items-center justify-center">
                {/* Reticle corners */}
                <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-[#8ff5ff]"></div>
                <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-[#8ff5ff]"></div>
                <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-[#8ff5ff]"></div>
                <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-[#8ff5ff]"></div>

                {/* Crosshair dots */}
                <div className="grid grid-cols-3 gap-6 opacity-30">
                  {[...Array(9)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 h-1 bg-[#8ff5ff] rounded-full"
                    ></div>
                  ))}
                </div>

                {/* Reticle label */}
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <span
                    className={`text-[8px] font-black tracking-widest px-2 py-0.5 backdrop-blur-sm border border-[#8ff5ff]/20 bg-[#0c0e10]/70 ${
                      confidence > 0 ? 'text-[#8ff5ff]' : 'text-[#8ff5ff]/40'
                    }`}
                  >
                    {state === 'loading'
                      ? 'LOADING_MODELS...'
                      : confidence > 0
                        ? `LOCK: ${confidence}%`
                        : 'AWAITING_SUBJECT'}
                  </span>
                </div>
              </div>
            )}

            {/* Match overlay */}
            {state === 'matched' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  {/* Match indicator ring */}
                  <div className="w-32 h-32 rounded-full border-2 border-green-400 shadow-[0_0_30px_rgba(74,222,128,0.3)] flex items-center justify-center overflow-hidden">
                    {matchedImage ? (
                      <img
                        src={matchedImage}
                        className="w-full h-full object-cover"
                        alt="Match"
                      />
                    ) : (
                      <div className="text-4xl text-green-400 font-black">
                        ✓
                      </div>
                    )}
                  </div>
                  <div className="bg-[#0c0e10]/80 backdrop-blur-sm border border-green-400/30 px-6 py-3 rounded-lg text-center">
                    <p className="text-green-400 text-xs font-black tracking-widest uppercase">
                      SUBJECT_IDENTIFIED
                    </p>
                    <p className="text-[#aaabad] text-[9px] mt-1 tracking-wide">
                      REDIRECTING_TO_SHARE...
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Not found overlay */}
            {state === 'not_found' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
                <div className="flex flex-col items-center gap-4 bg-[#0c0e10]/90 backdrop-blur-sm border border-[#46484a]/30 px-8 py-6 rounded-lg text-center max-w-xs">
                  <div className="w-16 h-16 rounded-full border-2 border-red-500/40 flex items-center justify-center">
                    <span className="text-red-400 text-2xl font-black">✕</span>
                  </div>
                  <p className="text-red-400 text-xs font-black tracking-widest uppercase">
                    SUBJECT_NOT_FOUND
                  </p>
                  <p className="text-[#aaabad] text-[9px] leading-relaxed">
                    No matching biometric profile located. Ensure you were
                    captured at the entrance station.
                  </p>
                  <button
                    onClick={() => startScanning()}
                    className="mt-2 bg-gradient-to-r from-[#8ff5ff] to-[#00deec] text-[#005d63] font-black px-8 py-3 rounded-lg tracking-[0.15em] shadow-[0_0_20px_rgba(143,245,255,0.2)] hover:scale-105 transition-all outline-none uppercase text-xs"
                  >
                    RETRY_SCAN
                  </button>
                </div>
              </div>
            )}

            {/* Error overlay */}
            {state === 'error' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
                <div className="flex flex-col items-center gap-4 bg-[#0c0e10]/90 backdrop-blur-sm border border-red-500/20 px-8 py-6 rounded-lg text-center max-w-xs">
                  <div className="w-16 h-16 rounded-full border-2 border-red-500/40 flex items-center justify-center">
                    <span className="text-red-400 text-2xl font-black">!</span>
                  </div>
                  <p className="text-red-400 text-xs font-black tracking-widest uppercase">
                    SYS_ERROR
                  </p>
                  <p className="text-[#aaabad] text-[9px] leading-relaxed">
                    Failed to initialize camera or recognition models. Check
                    permissions and try again.
                  </p>
                  <button
                    onClick={() => startScanning()}
                    className="mt-2 bg-gradient-to-r from-[#8ff5ff] to-[#00deec] text-[#005d63] font-black px-8 py-3 rounded-lg tracking-[0.15em] shadow-[0_0_20px_rgba(143,245,255,0.2)] hover:scale-105 transition-all outline-none uppercase text-xs"
                  >
                    REINITIALIZE
                  </button>
                </div>
              </div>
            )}

            {/* Bottom corners */}
            <div className="flex justify-between items-end">
              <div className="w-6 h-6 border-b-2 border-l-2 border-[#8ff5ff]"></div>
              <div className="w-6 h-6 border-b-2 border-r-2 border-[#8ff5ff]"></div>
            </div>
          </div>
        </div>

        {/* Bottom Stats Panel */}
        <div
          className={`flex-none ${colors.surfaceMed} border-t ${colors.outlineVariant}/20 p-4 space-y-3`}
        >
          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3">
            <div
              className={`${colors.surfaceLow} p-2.5 rounded border ${colors.outlineVariant}/10`}
            >
              <p className="text-[7px] text-[#aaabad] font-bold uppercase tracking-widest mb-0.5">
                SCANS
              </p>
              <p className="text-base font-black text-[#8ff5ff]">{scanCount}</p>
            </div>
            <div
              className={`${colors.surfaceLow} p-2.5 rounded border ${colors.outlineVariant}/10`}
            >
              <p className="text-[7px] text-[#aaabad] font-bold uppercase tracking-widest mb-0.5">
                CONFIDENCE
              </p>
              <p className="text-base font-black text-[#8ff5ff]">
                {confidence > 0 ? `${confidence}%` : '---'}
              </p>
            </div>
            <div
              className={`${colors.surfaceLow} p-2.5 rounded border ${colors.outlineVariant}/10`}
            >
              <p className="text-[7px] text-[#aaabad] font-bold uppercase tracking-widest mb-0.5">
                GUESTS
              </p>
              <p className="text-base font-black text-[#8ff5ff]">
                {guestCount > 0 ? guestCount : '---'}
              </p>
            </div>
          </div>

          {/* Status indicators */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#8ff5ff] shadow-[0_0_6px_#8ff5ff]' : 'bg-[#46484a]'}`}
                ></div>
                <span className="text-[8px] font-bold tracking-widest">
                  CAMERA
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#8ff5ff] shadow-[0_0_6px_#8ff5ff]"></div>
                <span className="text-[8px] font-bold tracking-widest">
                  MODELS
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#8ff5ff] shadow-[0_0_6px_#8ff5ff]' : 'bg-[#46484a]'}`}
                ></div>
                <span className="text-[8px] font-bold tracking-widest">
                  UPLINK
                </span>
              </div>
            </div>
            <span className="text-[8px] text-[#8ff5ff] font-bold tracking-widest">
              {isActive ? 'SYSTEM_ACTIVE' : 'STANDBY'}
            </span>
          </div>
        </div>

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
    </>
  );
}
