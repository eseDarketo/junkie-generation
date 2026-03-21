# PartyFace — DEV B SPEC: Capture Pipeline & API

> **YOUR ROLE:** You are building the face capture system and the API that connects it to the display. You handle everything from webcam → face detection → image processing → serving faces to the display screen.
>
> **There is another developer (Dev A) building the display and animation simultaneously.** Do NOT create or modify Dev A's files. You communicate through a shared API and shared types.

---

## Project Overview

PartyFace is an interactive party installation. A webcam at the entrance captures guests' faces, processes them through a style filter (grayscale, high-contrast, posterized), and serves them to a display screen via a local API. The display (built by Dev A) shows these faces in a group photo doing "South Park Canadian" lip-sync animation. Your job is to get the faces in — detected, cropped, styled, and served.

---

## Your Tech Stack

- **Framework:** Next.js (React) + TypeScript
- **Face Detection:** face-api.js (browser-side, TensorFlow.js-based)
- **Image Processing:** HTML Canvas API (cropping, filtering, compositing)
- **Styling:** Tailwind CSS

---

## Files YOU Own (create and modify freely)

```
src/app/capture/page.tsx           # Webcam capture station page
src/app/api/faces/route.ts         # API route — the bridge between capture and display
src/app/share/[id]/page.tsx        # Share page (stretch goal)
src/components/CaptureStation.tsx   # Webcam + face detection UI
src/components/FaceProcessor.ts     # Face crop + style filter pipeline
src/lib/faceStore.ts               # In-memory face storage
src/lib/imageFilter.ts             # Canvas-based style filters
```

## Files You MUST NOT Modify (owned by Dev A)

```
src/app/display/*                  # Display screen
src/components/SceneRenderer.tsx
src/components/FaceSlot.tsx
src/components/LipSyncEngine.tsx
src/components/MusicPlayer.tsx
src/lib/faceSlots.ts
src/lib/audioAnalyzer.ts
src/lib/mouthMapper.ts
```

## Shared Files (coordinate changes with Dev A)

```
src/types/index.ts                 # Shared interfaces — agree before coding
package.json                       # Both devs add deps here
```

---

## The Shared Contract (agreed with Dev A)

```typescript
// src/types/index.ts

export interface StoredFace {
  id: string;
  image: string; // Base64 PNG, cropped & filtered face
  timestamp: number;
  name?: string; // Optional, for famous faces
}

// API you will BUILD (Dev A consumes it):
// POST /api/faces        — body: { image: string, name?: string }
//                        — response: { success: true }
// GET  /api/faces        — query: ?since=<timestamp> (optional)
//                        — response: { faces: StoredFace[] }
```

---

## Your Sprint Schedule

| Hour | Task                                                                       | Deliverable                             |
| ---- | -------------------------------------------------------------------------- | --------------------------------------- |
| 1    | Project setup (with Dev A), `/api/faces` route + in-memory store           | API responding to GET/POST              |
| 2    | CaptureStation: webcam access, face-api.js model loading, detection loop   | Faces being detected in browser         |
| 3    | Face cropping with padding + debug page showing raw → detected → cropped   | Visual pipeline debug tool              |
| 4    | imageFilter.ts: white bg removal → grayscale → contrast → posterize        | Styled faces ready for display          |
| 5    | **INTEGRATION:** POST captured faces to API, test with Dev A's display     | Faces flowing from webcam to big screen |
| 6    | Tune filter params, detection confidence, cooldown timing based on display | Polished capture experience             |
| 7    | (STRETCH) Share page `/share/[id]` with avatar preview + QR code           | Social sharing feature                  |
| 8    | Demo prep, help with final integration                                     | Presentable demo                        |

---

## Detailed Component Specs

### 1. API Route — `/api/faces/route.ts` (BUILD THIS FIRST)

This is the bridge. Build it in the first 30 minutes so both you and Dev A can work independently.

**In-memory store (`lib/faceStore.ts`):**

```typescript
// Simple module-level storage. Resets on server restart — fine for hackathon.

import { StoredFace } from '@/types';

let faces: StoredFace[] = [];

export function addFace(face: StoredFace) {
  faces.push(face);
}

export function getAllFaces(): StoredFace[] {
  return faces;
}

export function getFacesSince(timestamp: number): StoredFace[] {
  return faces.filter((f) => f.timestamp > timestamp);
}
```

**API route (`app/api/faces/route.ts`):**

```typescript
import { addFace, getAllFaces, getFacesSince } from '@/lib/faceStore';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const since = req.nextUrl.searchParams.get('since');
  const faces = since ? getFacesSince(Number(since)) : getAllFaces();
  return NextResponse.json({ faces });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  addFace({
    id: body.id || crypto.randomUUID(),
    image: body.image,
    timestamp: Date.now(),
    name: body.name,
  });
  return NextResponse.json({ success: true });
}
```

**Test it works:** `curl -X POST http://localhost:3000/api/faces -H "Content-Type: application/json" -d '{"image":"test123"}'` then `curl http://localhost:3000/api/faces` should return the face.

### 2. CaptureStation.tsx — Webcam Face Capture

**Route:** `/capture` — during the event this runs in a browser tab on the same machine (or a second device on the same WiFi).

**Flow:**

1. On page load, request webcam via `navigator.mediaDevices.getUserMedia`
2. Show live video feed
3. Load face-api.js models from `/public/models/`:
   - `tinyFaceDetector` — fast detection
   - `faceLandmark68Net` — bounding box refinement
4. Run detection every 500ms
5. When face detected with confidence > 0.8:
   - Capture video frame to canvas
   - Get face bounding box from face-api.js landmarks
   - Add 20% padding on each side for natural crop
   - Pass to imageFilter.ts for style processing
   - Convert to base64 PNG
   - POST to `/api/faces`
6. Cooldown of 3 seconds between captures (prevent duplicates)
7. Optional: show "Captured!" flash on screen

**face-api.js models needed in `public/models/`:**
Download from https://github.com/justadudewhohacks/face-api.js/tree/master/weights

- `tiny_face_detector_model-shard1` + manifest
- `face_landmark_68_model-shard1` + manifest

### 3. imageFilter.ts — Style Filter Pipeline

This is critical for visual cohesion. All faces (famous + guests) must look like they belong in the same world.

**BACKGROUND STANDARD:** All face images use WHITE or LIGHT backgrounds. The capture station has a white/well-lit background behind guests. Famous faces are sourced with white backgrounds.

**Filter pipeline (applied via Canvas 2D context):**

```typescript
export function applyStyleFilter(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i],
      g = data[i + 1],
      b = data[i + 2];

    // Step 0: Remove white/light background
    // If pixel brightness > 220, set alpha to 0 (transparent)
    const brightness = (r + g + b) / 3;
    if (brightness > 220) {
      data[i + 3] = 0; // transparent
      continue;
    }

    // Step 1: Convert to grayscale
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;

    // Step 2: Increase contrast (factor 1.4-1.6)
    const contrastFactor = 1.5;
    let val = (gray - 128) * contrastFactor + 128;
    val = Math.max(0, Math.min(255, val));

    // Step 3: Posterize (reduce tonal range)
    const levels = 6;
    val = Math.round(val / (255 / levels)) * (255 / levels);

    // Step 4: Optional sepia/warm tint
    data[i] = Math.min(255, val * 1.1); // R
    data[i + 1] = Math.min(255, val * 0.9); // G
    data[i + 2] = Math.min(255, val * 0.7); // B
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}
```

**Build a debug page** (can be a simple section on `/capture` or a `/test` route) that shows the pipeline visually: raw webcam frame → detected face box → cropped face → filtered face, side by side. This lets you iterate on filter quality without needing the display.

### 4. FaceProcessor.ts — Crop + Process Pipeline

Orchestrates the full flow from raw webcam frame to styled face:

```typescript
export async function processCapture(
  videoElement: HTMLVideoElement,
  detection: faceapi.FaceDetection,
): Promise<string> {
  // 1. Get bounding box from detection
  const { x, y, width, height } = detection.box;

  // 2. Add 20% padding
  const padding = 0.2;
  const padX = width * padding;
  const padY = height * padding;

  // 3. Crop face from video frame to a canvas
  const cropCanvas = document.createElement('canvas');
  const cropSize = Math.max(width + padX * 2, height + padY * 2);
  cropCanvas.width = 512; // standardize size
  cropCanvas.height = 512;
  const ctx = cropCanvas.getContext('2d')!;
  ctx.drawImage(
    videoElement,
    x - padX,
    y - padY,
    cropSize,
    cropSize,
    0,
    0,
    512,
    512,
  );

  // 4. Apply style filter
  applyStyleFilter(cropCanvas);

  // 5. Return as base64
  return cropCanvas.toDataURL('image/png');
}
```

### 5. Share Page — /share/[id] (STRETCH GOAL)

If time permits after hour 6:

- Route: `/share/[id]` where id matches the face's id in the store
- Shows the guest's filtered face with a simple CSS animation mimicking the Canadian mouth
- Uses `HTMLCanvasElement.captureStream()` + MediaRecorder to export a short clip
- "Share on Instagram" button (opens IG story/post flow with the image)
- Generate a QR code (use a library like `qrcode` or `qrcode.react`) linking to this page
- Display the QR code on the main screen

---

## Testing Before Integration (Hours 1-4)

You can test your entire pipeline independently:

1. **Hour 1:** Test API with curl or Postman — POST a test face, GET it back
2. **Hour 2:** Test webcam capture — see face detections drawn on the video feed
3. **Hour 3:** Test cropping — see cropped faces displayed on the debug page
4. **Hour 4:** Test filter — see the full pipeline from raw → styled output
5. **Hour 5:** Integration with Dev A — POST real faces, see them on the display

---

## Dependencies You Need

```json
{
  "face-api.js": "^0.22.2"
}
```

Optional for stretch goals:

```json
{
  "qrcode.react": "^3.0.0"
}
```
