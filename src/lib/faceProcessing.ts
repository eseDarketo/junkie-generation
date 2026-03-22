// ============================================================
// faceProcessing — Normalize faces to 400x400 with mouth at 28% from bottom
// ============================================================
// Takes an image source + face-api.js landmarks, and:
//   1. Clips head shape (jaw + forehead curve) — removes neck/background
//   2. Positions face so mouth center is at 28% from bottom (y=288)
//   3. Outputs 400x400 transparent PNG
//
// Used by both live capture and the VIP batch processor.

import type * as faceapi from 'face-api.js';

/** Output canvas size */
export const OUTPUT_SIZE = 400;

/** Mouth center target: 28% from bottom = 72% from top = pixel 288 */
const MOUTH_TARGET_Y = Math.round(OUTPUT_SIZE * 0.72);

function getCenter(pts: faceapi.Point[]): { x: number; y: number } {
  return {
    x: pts.reduce((sum, p) => sum + p.x, 0) / pts.length,
    y: pts.reduce((sum, p) => sum + p.y, 0) / pts.length,
  };
}

/**
 * Core face processing: clips head, normalizes to 400x400, mouth at 28% from bottom.
 *
 * @param source - The source image (video element, image element, or canvas)
 * @param landmarks - face-api.js 68-point landmarks
 * @returns 400x400 canvas with transparent background, head clipped, mouth at 28% height
 */
export function processFaceToCanvas(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  landmarks: faceapi.FaceLandmarks68,
): HTMLCanvasElement {
  const output = document.createElement('canvas');
  output.width = OUTPUT_SIZE;
  output.height = OUTPUT_SIZE;
  const ctx = output.getContext('2d')!;

  // --- Landmark extraction ---
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();
  const mouth = landmarks.getMouth();
  const jaw = landmarks.getJawOutline();

  const lCenter = getCenter(leftEye);
  const rCenter = getCenter(rightEye);
  const mouthCenter = getCenter(mouth);

  // --- Alignment math ---
  const dx = rCenter.x - lCenter.x;
  const dy = rCenter.y - lCenter.y;
  const angle = Math.atan2(dy, dx);
  const eyeDistance = Math.sqrt(dx * dx + dy * dy);

  // Midpoint between eyes in source coords
  const eyeMidX = (lCenter.x + rCenter.x) / 2;
  const eyeMidY = (lCenter.y + rCenter.y) / 2;

  // --- Calculate scale ---
  // We want the face to fit comfortably in 400x400.
  // Use eye distance as the reference — target ~110px between eyes in output.
  const targetEyeDistance = 110;
  const scale = targetEyeDistance / eyeDistance;

  // --- Calculate where mouth ends up after transform ---
  // After rotation and scale, we need to figure out the mouth's position
  // relative to the eye midpoint, then place the whole face so mouth hits y=288.

  // Mouth position relative to eye midpoint (in source coords)
  const mouthRelX = mouthCenter.x - eyeMidX;
  const mouthRelY = mouthCenter.y - eyeMidY;

  // Apply rotation to mouth-relative position
  const cosA = Math.cos(-angle);
  const sinA = Math.sin(-angle);
  const mouthRotX = mouthRelX * cosA - mouthRelY * sinA;
  const mouthRotY = mouthRelX * sinA + mouthRelY * cosA;

  // After scale, mouth offset from eye midpoint in output coords
  const mouthOutputOffsetX = mouthRotX * scale;
  const mouthOutputOffsetY = mouthRotY * scale;

  // We want mouth at (OUTPUT_SIZE/2, MOUTH_TARGET_Y)
  // So eye midpoint should be placed at:
  const eyeTargetX = OUTPUT_SIZE / 2 - mouthOutputOffsetX;
  const eyeTargetY = MOUTH_TARGET_Y - mouthOutputOffsetY;

  // --- Draw with clipping ---
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Set up transform: translate → rotate → scale → source offset
  ctx.translate(eyeTargetX, eyeTargetY);
  ctx.rotate(-angle);
  ctx.scale(scale, scale);
  ctx.translate(-eyeMidX, -eyeMidY);

  // --- HEAD CLIPPING PATH (in source pixel space) ---
  const headHeightOffset = eyeDistance * 1.8;

  ctx.beginPath();
  // Jawline
  ctx.moveTo(jaw[0].x, jaw[0].y);
  for (let i = 1; i < jaw.length; i++) {
    ctx.lineTo(jaw[i].x, jaw[i].y);
  }
  // Right side of forehead
  ctx.lineTo(jaw[16].x, jaw[16].y - headHeightOffset * 0.5);
  // Top curve across head (generous to capture hair)
  ctx.quadraticCurveTo(
    eyeMidX,
    eyeMidY - headHeightOffset * 2.2,
    jaw[0].x,
    jaw[0].y - headHeightOffset * 0.5,
  );
  ctx.closePath();
  ctx.clip();

  // Draw source image
  ctx.drawImage(source, 0, 0);
  ctx.restore();

  return output;
}

/**
 * Convenience: process face and return base64 PNG.
 */
export function processFaceToBase64(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  landmarks: faceapi.FaceLandmarks68,
): string {
  const canvas = processFaceToCanvas(source, landmarks);
  return canvas.toDataURL('image/png');
}
