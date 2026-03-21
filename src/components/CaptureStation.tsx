// ============================================================
// CaptureStation — Webcam + face detection UI — DEV B
// ============================================================
// Flow:
//   1. Request webcam via getUserMedia
//   2. Run face-api.js detection every 500ms
//   3. On detection (confidence > 0.8): crop, filter, POST to /api/faces
//   4. 3-second cooldown between captures
//
// See SPEC.md § "CaptureStation.tsx" for full details.

"use client";

export default function CaptureStation() {
  // TODO (Dev B): Implement webcam capture + face detection
  return <div>TODO: Capture Station</div>;
}
