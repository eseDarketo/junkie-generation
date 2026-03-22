'use client';

import * as faceapi from 'face-api.js';
import { processFaceToCanvas } from '../../lib/faceProcessing';
import { applyStyleFilter } from '../../lib/imageFilter';

export async function processCapture(
  videoElement: HTMLVideoElement,
  _box: faceapi.Box,
  landmarks: faceapi.FaceLandmarks68,
): Promise<{ raw: string; filtered: string }> {
  // 400x400, head clipped, mouth at 28% from bottom
  const canvas = processFaceToCanvas(videoElement, landmarks);

  const rawData = canvas.toDataURL('image/png');
  applyStyleFilter(canvas);
  const filteredData = canvas.toDataURL('image/png');

  return { raw: rawData, filtered: filteredData };
}
