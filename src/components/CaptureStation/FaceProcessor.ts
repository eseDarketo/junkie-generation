'use client';

import * as faceapi from 'face-api.js';
import { applyStyleFilter } from '../../lib/imageFilter';

export async function processCapture(
  videoElement: HTMLVideoElement,
  box: faceapi.Box,
  landmarks: faceapi.FaceLandmarks68,
): Promise<{ raw: string; filtered: string }> {
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
    y: pts.reduce((sum, p) => sum + p.y, 0) / pts.length,
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

  // 3. Transformation & Masking
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // --- TRANSFORMATION ---
  // Move origin to canvas target (center horizontal, 35% vertical)
  ctx.translate(256, 180);
  // Neutralize head roll
  ctx.rotate(-angle);
  // Rescale face
  ctx.scale(scale, scale);
  // Center source eyes on origin
  ctx.translate(-midX, -midY);

  // --- HEAD CLIPPING PATH (In Video Pixel Space) ---
  const jaw = landmarks.getJawOutline();
  const lEyebrow = landmarks.getLeftEyeBrow();
  const rEyebrow = landmarks.getRightEyeBrow();

  ctx.beginPath();
  // Follow jawline
  ctx.moveTo(jaw[0].x, jaw[0].y);
  for (let i = 1; i < jaw.length; i++) ctx.lineTo(jaw[i].x, jaw[i].y);
  
  // High head/hair area estimation
  // We offset upwards relative to eye distance to capture forehead and hair
  const headHeightOffset = eyeDistance * 1.8; 
  
  // Right side of forehead
  ctx.lineTo(jaw[16].x, jaw[16].y - headHeightOffset * 0.5);
  // Top curve across head
  ctx.quadraticCurveTo(
    midX, midY - headHeightOffset * 2.2,
    jaw[0].x, jaw[0].y - headHeightOffset * 0.5
  );
  ctx.lineTo(jaw[0].x, jaw[0].y);
  ctx.closePath();

  // Apply clip before drawing
  ctx.clip();

  // Draw full frame (the transform handles the crop)
  ctx.drawImage(videoElement, 0, 0);
  ctx.restore();

  // Apply visual style filter (respects transparency now)
  const rawData = cropCanvas.toDataURL('image/png');
  applyStyleFilter(cropCanvas);
  const filteredData = cropCanvas.toDataURL('image/png');

  return { raw: rawData, filtered: filteredData };
}
