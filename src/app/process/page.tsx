'use client';

// ============================================================
// /process — Batch processor for VIP faces in public/faces/
// ============================================================
// Loads each image, runs face-api.js detection, applies
// faceProcessing (400x400, mouth at 28% from bottom, head clipped),
// then saves the result back via the API.

import * as tf from '@tensorflow/tfjs';
import * as faceapi from 'face-api.js';
import { useCallback, useEffect, useState } from 'react';
import { processFaceToCanvas } from '../../lib/faceProcessing';
import { applyStyleFilter } from '../../lib/imageFilter';

interface ProcessResult {
  file: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  preview?: string;
  error?: string;
}

export default function ProcessPage() {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [files, setFiles] = useState<string[]>([]);
  const [results, setResults] = useState<ProcessResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // Load face-api models
  useEffect(() => {
    async function loadModels() {
      if (typeof window === 'undefined') return;
      try {
        if (tf.getBackend() !== 'webgl') {
          await tf.setBackend('webgl');
        }
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        ]);
        setModelsLoaded(true);
      } catch (err) {
        console.error('Failed to load models:', err);
      }
    }
    loadModels();
  }, []);

  // Fetch file list
  useEffect(() => {
    fetch('/api/faces/process')
      .then((r) => r.json())
      .then((data) => {
        setFiles(data.files || []);
        setResults(
          (data.files || []).map((f: string) => ({
            file: f,
            status: 'pending' as const,
          })),
        );
      });
  }, []);

  const processImage = useCallback(
    async (
      filename: string,
    ): Promise<{ preview: string } | { error: string }> => {
      // Load the image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error(`Failed to load ${filename}`));
        img.src = `/faces/${filename}`;
      });

      // Detect face + landmarks
      const detection = await faceapi
        .detectSingleFace(
          img,
          new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.3 }),
        )
        .withFaceLandmarks();

      if (!detection) {
        return { error: 'No face detected' };
      }

      // Process: 400x400, head clipped, mouth at 28% from bottom
      const canvas = processFaceToCanvas(img, detection.landmarks);

      // Apply style filter
      applyStyleFilter(canvas);

      const dataUrl = canvas.toDataURL('image/png');

      // Derive output filename: replace extension with .png, add "processed-" prefix
      const outName = 'processed-' + filename.replace(/\.\w+$/, '.png');

      // Save to server
      const res = await fetch('/api/faces/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: outName, image: dataUrl }),
      });

      if (!res.ok) {
        return { error: 'Failed to save' };
      }

      return { preview: dataUrl };
    },
    [],
  );

  const runAll = async () => {
    setIsRunning(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Skip already-processed files
      if (file.startsWith('processed-')) continue;

      setResults((prev) =>
        prev.map((r, idx) => (idx === i ? { ...r, status: 'processing' } : r)),
      );

      try {
        const result = await processImage(file);

        if ('error' in result) {
          setResults((prev) =>
            prev.map((r, idx) =>
              idx === i ? { ...r, status: 'error', error: result.error } : r,
            ),
          );
        } else {
          setResults((prev) =>
            prev.map((r, idx) =>
              idx === i ? { ...r, status: 'done', preview: result.preview } : r,
            ),
          );
        }
      } catch (err) {
        setResults((prev) =>
          prev.map((r, idx) =>
            idx === i ? { ...r, status: 'error', error: String(err) } : r,
          ),
        );
      }
    }

    setIsRunning(false);
  };

  const processSingle = async (index: number) => {
    const file = files[index];
    setResults((prev) =>
      prev.map((r, idx) =>
        idx === index ? { ...r, status: 'processing' } : r,
      ),
    );

    try {
      const result = await processImage(file);
      if ('error' in result) {
        setResults((prev) =>
          prev.map((r, idx) =>
            idx === index ? { ...r, status: 'error', error: result.error } : r,
          ),
        );
      } else {
        setResults((prev) =>
          prev.map((r, idx) =>
            idx === index
              ? { ...r, status: 'done', preview: result.preview }
              : r,
          ),
        );
      }
    } catch (err) {
      setResults((prev) =>
        prev.map((r, idx) =>
          idx === index ? { ...r, status: 'error', error: String(err) } : r,
        ),
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#0c0e10] text-[#f1f0f3] p-8">
      <h1 className="text-2xl font-bold text-[#8ff5ff] mb-2">
        Face Batch Processor
      </h1>
      <p className="text-[#aaabad] mb-6">
        Processes images in <code>public/faces/</code> → 400×400 PNG, head
        clipped, mouth at 28% from bottom, style filter applied.
      </p>

      <div className="mb-6 flex items-center gap-4">
        <span
          className={`text-sm ${modelsLoaded ? 'text-green-400' : 'text-yellow-400'}`}
        >
          {modelsLoaded ? '● Models loaded' : '⏳ Loading models...'}
        </span>

        <button
          onClick={runAll}
          disabled={!modelsLoaded || isRunning}
          className="px-6 py-2 bg-[#8ff5ff] text-[#0c0e10] font-bold rounded disabled:opacity-40"
        >
          {isRunning ? 'Processing...' : 'Process All'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {results.map((r, i) => (
          <div
            key={r.file}
            className="bg-[#171a1c] rounded-lg border border-[#46484a] p-3"
          >
            <p className="text-xs text-[#aaabad] truncate mb-2">{r.file}</p>

            <div className="flex gap-2 mb-2">
              {/* Original */}
              <div className="flex-1">
                <p className="text-[10px] text-[#aaabad] mb-1">Original</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/faces/${r.file}`}
                  alt={r.file}
                  className="w-full aspect-square object-cover rounded bg-[#232629]"
                />
              </div>

              {/* Processed */}
              <div className="flex-1">
                <p className="text-[10px] text-[#aaabad] mb-1">Processed</p>
                {r.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.preview}
                    alt="processed"
                    className="w-full aspect-square object-contain rounded"
                    style={{
                      background:
                        'repeating-conic-gradient(#232629 0% 25%, #171a1c 0% 50%) 50%/16px 16px',
                    }}
                  />
                ) : (
                  <div className="w-full aspect-square rounded bg-[#232629] flex items-center justify-center text-[10px] text-[#aaabad]">
                    {r.status === 'processing'
                      ? '⏳'
                      : r.status === 'error'
                        ? '❌'
                        : '—'}
                  </div>
                )}
              </div>
            </div>

            {/* Status + button */}
            <div className="flex items-center justify-between">
              <span
                className={`text-xs ${
                  r.status === 'done'
                    ? 'text-green-400'
                    : r.status === 'error'
                      ? 'text-red-400'
                      : r.status === 'processing'
                        ? 'text-yellow-400'
                        : 'text-[#aaabad]'
                }`}
              >
                {r.status === 'done'
                  ? '✓ Done'
                  : r.status === 'error'
                    ? r.error || 'Error'
                    : r.status === 'processing'
                      ? 'Processing...'
                      : 'Pending'}
              </span>

              {r.status !== 'processing' && (
                <button
                  onClick={() => processSingle(i)}
                  disabled={!modelsLoaded || isRunning}
                  className="text-xs text-[#8ff5ff] hover:underline disabled:opacity-40"
                >
                  {r.status === 'done' ? 'Redo' : 'Process'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {files.length === 0 && (
        <p className="text-[#aaabad] mt-8">
          No images found in public/faces/. Add some face images there first.
        </p>
      )}
    </div>
  );
}
