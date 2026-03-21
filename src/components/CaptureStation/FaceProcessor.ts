'use client';

import * as faceapi from 'face-api.js';
import { applyStyleFilter } from '../../lib/imageFilter';

export async function processCapture(
  videoElement: HTMLVideoElement,
  box: faceapi.Box,
  landmarks: faceapi.FaceLandmarks68
): Promise<string> {
  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = 512;
  cropCanvas.height = 512;
  const ctx = cropCanvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  // 1. Get key landmarks for alignment
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();

  const getCenter = (pts: faceapi.Point[]) => ({
    x: pts.reduce((sum, p) => sum + p.x, 0) / pts.length,
    y: pts.reduce((sum, p) => sum + p.y, 0) / pts.length
  });

  const lCenter = getCenter(leftEye);
  const rCenter = getCenter(rightEye);

  // 2. Alignment math
  const dx = rCenter.x - lCenter.x;
  const dy = rCenter.y - lCenter.y;
  const angle = Math.atan2(dy, dx);
  const eyeDistance = Math.sqrt(dx * dx + dy * dy);

  // Target scale so eye distance is approx 140px in the 512x512 canvas
  const scale = 140 / eyeDistance;

  // Midpoint between eyes in source
  const midX = (lCenter.x + rCenter.x) / 2;
  const midY = (lCenter.y + rCenter.y) / 2;

  // 3. Transformation
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Move origin to canvas target (center horizontal, 35% vertical)
  ctx.translate(256, 180);
  // Neutralize head roll
  ctx.rotate(-angle);
  // Rescale face
  ctx.scale(scale, scale);
  // Center source eyes on origin
  ctx.translate(-midX, -midY);

  // Draw full frame (the transform handles the crop)
  ctx.drawImage(videoElement, 0, 0);
  ctx.restore();

  // Apply visual style filter
  applyStyleFilter(cropCanvas);

  return cropCanvas.toDataURL('image/png');
}
