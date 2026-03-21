'use client';

import * as faceapi from 'face-api.js';
import { applyStyleFilter } from '../../lib/imageFilter';

export async function processCapture(
  videoElement: HTMLVideoElement,
  box: faceapi.Box
): Promise<string> {
  const { x, y, width, height } = box;

  // Add 20% padding
  const padding = 0.2;
  const padX = width * padding;
  const padY = height * padding;

  const cropCanvas = document.createElement('canvas');
  // Add padding around original bounding box
  const cropSize = Math.max(width + padX * 2, height + padY * 2);
  
  cropCanvas.width = 512;
  cropCanvas.height = 512;
  
  const ctx = cropCanvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  // Because the video element is visually scale-x: -1, we should be careful. 
  // However, videoElement pixels are NOT mirrored. It's just CSS.
  // The faceapi bounding box is relative to the un-mirrored pixels.
  // We draw the un-mirrored pixels into the canvas.
  
  ctx.drawImage(
    videoElement,
    x - padX, y - padY, cropSize, cropSize, // Source
    0, 0, 512, 512                          // Destination
  );

  // Apply visual style filter
  applyStyleFilter(cropCanvas);

  return cropCanvas.toDataURL('image/png');
}
