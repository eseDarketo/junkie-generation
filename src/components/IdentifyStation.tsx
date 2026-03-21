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

export default function IdentifyStation() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const matchingRef = useRef(false); // prevent overlapping API calls

  const [state, setState] = useState<IdentifyState>('loading');
  const [statusText, setStatusText] = useState('Loading face recognition…');
  const [scanCount, setScanCount] = useState(0);

  const cleanup = useCallback(() => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
  }, []);

  const onMatch = useCallback(
    (id: string) => {
      cleanup();
      setState('matched');
      setStatusText('Found you!');

      if (navigator.vibrate) {
        navigator.vibrate(200);
      }

      setTimeout(() => {
        router.push(`/share/${encodeURIComponent(id)}`);
      }, 1500);
    },
    [cleanup, router],
  );

  const startScanning = useCallback(async () => {
    // Load face-api.js models (needed to extract descriptor from live camera)
    try {
      setStatusText('Loading face recognition…');
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
      ]);
    } catch {
      setState('error');
      setStatusText('Failed to load face recognition models.');
      return;
    }

    // Request front camera
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
      setStatusText(
        'Camera access denied. Please allow camera access and try again.',
      );
      return;
    }

    setState('scanning');
    setStatusText('Look at the camera to find yourself…');

    // Timeout
    timeoutRef.current = setTimeout(() => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      setState('not_found');
      setStatusText('Could not find you among captured guests.');
    }, TIMEOUT_MS);

    // Detection loop: extract descriptor locally, match on server
    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;
      if (matchingRef.current) return; // skip if previous call still in-flight

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

        // Send descriptor to server for matching (128 floats ≈ 512 bytes)
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

        if (data.match) {
          onMatch(data.match.id);
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

  const handleRetry = () => {
    setState('loading');
    setScanCount(0);
    startScanning();
  };

  return (
    <div className="relative flex h-[100dvh] w-full flex-col items-center justify-center bg-black text-white overflow-hidden">
      <video
        ref={videoRef}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
          state === 'scanning' ? 'opacity-100' : 'opacity-30'
        }`}
        autoPlay
        muted
        playsInline
      />

      {state === 'scanning' && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-64 w-64 rounded-full border-4 border-white/40 animate-pulse" />
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center gap-4 p-6 text-center">
        {state === 'loading' && (
          <>
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
            <p className="text-lg">{statusText}</p>
          </>
        )}

        {state === 'scanning' && (
          <div className="mt-auto mb-12 rounded-xl bg-black/60 px-6 py-4 backdrop-blur-sm">
            <p className="text-xl font-semibold">{statusText}</p>
            {scanCount > 0 && (
              <p className="mt-1 text-xs text-gray-500">Scans: {scanCount}</p>
            )}
          </div>
        )}

        {state === 'matched' && (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-green-900/80 px-8 py-6 backdrop-blur-sm">
            <div className="text-5xl">🎉</div>
            <p className="text-2xl font-bold">Found you!</p>
            <p className="text-sm text-green-200">
              Redirecting to your avatar…
            </p>
          </div>
        )}

        {state === 'not_found' && (
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-gray-900/80 px-8 py-6 backdrop-blur-sm">
            <p className="text-xl font-semibold">{statusText}</p>
            <p className="text-sm text-gray-400">
              Make sure you were captured at the entrance station first.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleRetry}
                className="rounded-lg bg-white px-6 py-2 font-medium text-black transition-colors hover:bg-gray-200"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {state === 'error' && (
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-red-900/80 px-8 py-6 backdrop-blur-sm">
            <p className="text-xl font-semibold">Something went wrong</p>
            <p className="text-sm text-red-200">{statusText}</p>
            <button
              onClick={handleRetry}
              className="rounded-lg bg-white px-6 py-2 font-medium text-black transition-colors hover:bg-gray-200"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
