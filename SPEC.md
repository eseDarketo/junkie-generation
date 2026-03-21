# PartyFace — Real-Time Singing Group Photo Installation

## Project Overview

**PartyFace** is an interactive party installation where a webcam at the entrance captures each guest's face. On a large screen, a cinematic camera slowly pans across a massive stylized group photo — like a graduation photo — featuring famous personalities and party guests, all lip-syncing to the music currently playing. Guests discover themselves in the "photo" and can share their singing avatar on social media.

This is a **hackathon MVP** — 8-hour build target. Zero AI/ML inference at runtime. Pure web tech illusion.

---

## Tech Stack

- **Framework:** Next.js (React)
- **3D/Canvas Rendering:** Three.js (for the Ken Burns camera viewport over a 2D scene)
- **Audio Analysis:** Web Audio API (native)
- **Face Detection:** face-api.js (browser-side, TensorFlow.js-based)
- **Image Processing:** HTML Canvas API (for cropping, filtering, compositing)
- **Real-time Sync:** Firebase Realtime Database (capture station → display sync)
- **Styling:** Tailwind CSS

---

## Architecture

```
┌─────────────────────┐        ┌──────────────────────────┐
│   CAPTURE STATION   │        │      DISPLAY SCREEN      │
│   /capture route    │        │      /display route       │
│                     │ Local  │                           │
│  - Webcam feed      │ API    │  - Three.js scene         │
│  - Face detection   │───────▶│  - Ken Burns camera       │
│  - Face crop        │ POST   │  - Face grid (slots)      │
│  - Style filter     │ /api/  │  - Lip-sync animation     │
│  - Upload face data │ faces  │  - Web Audio analyzer      │
└─────────────────────┘        └──────────────────────────┘
       [DEV B]                          [DEV A]
                                         │
                                         ▼
                               ┌──────────────────┐
                               │   SHARE PAGE     │
                               │   /share/[id]    │
                               │                  │
                               │  - Avatar preview│
                               │  - GIF export    │
                               │  - Social share  │
                               └──────────────────┘
                                    [DEV B]
```

---

## Project Structure

```
partyface/
├── public/
│   ├── faces/                    # Pre-loaded famous faces (cropped, filtered)
│   │   ├── bowie.png
│   │   ├── messi.png
│   │   ├── frida.png
│   │   └── ... (30-40 faces)
│   ├── mouths/                   # (OPTIONAL/V2) Mouth shape sprites (visemes)
│   │   ├── closed.png            # Only needed if mixing animation styles
│   │   ├── slightly-open.png
│   │   ├── open.png
│   │   ├── wide.png
│   │   ├── oh.png
│   │   └── smile.png
│   ├── music/                    # Background music tracks
│   │   └── track01.mp3
│   └── bodies/                   # Body/silhouette templates (optional)
│       └── template.png
├── src/
│   ├── app/
│   │   ├── page.tsx              # Landing/admin page
│   │   ├── capture/
│   │   │   └── page.tsx          # Webcam capture station
│   │   ├── display/
│   │   │   └── page.tsx          # Main display screen (the big screen)
│   │   └── share/
│   │       └── [id]/
│   │           └── page.tsx      # Individual avatar share page
│   ├── components/
│   │   ├── SceneRenderer.tsx     # Three.js scene with Ken Burns camera
│   │   ├── FaceSlot.tsx          # Individual face in the group photo
│   │   ├── LipSyncEngine.tsx     # Audio-reactive mouth animation controller (Canadian + sprite modes)
│   │   ├── CaptureStation.tsx    # Webcam + face detection UI
│   │   ├── FaceProcessor.ts      # Face crop + style filter pipeline
│   │   └── MusicPlayer.tsx       # Audio player + Web Audio analyzer
│   ├── lib/
│   │   ├── faceStore.ts           # In-memory face storage + API helpers
│   │   ├── faceSlots.ts          # Pre-defined face positions in the scene
│   │   ├── imageFilter.ts        # Canvas-based style filters
│   │   ├── audioAnalyzer.ts      # Web Audio API amplitude extraction
│   │   └── mouthMapper.ts        # Maps amplitude → animation params (rotation angle or mouth index)
│   └── types/
│       └── index.ts              # TypeScript types
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── next.config.js
```

---

## Core Components — Detailed Specs

### 1. SceneRenderer.tsx — The Main Visual

This is the heart of the project. It renders the "group photo" and animates the camera.

**Implementation approach:**

- Use Three.js with an orthographic camera looking at a large 2D plane
- The "group photo" is a large canvas texture (e.g., 4000x2000 pixels) mapped onto a plane
- Face slots are positioned on this canvas at pre-defined coordinates
- The camera does a slow, smooth Ken Burns animation: panning left/right, zooming in/out on random face clusters, occasionally focusing on a single face
- Camera movement should use easing functions (sine or cubic) for cinematic feel
- The camera path can be pre-scripted as a series of keyframes: `{ x, y, zoom, duration }`

**Ken Burns keyframe example:**

```typescript
interface CameraKeyframe {
  x: number; // center X on the canvas (0-1 normalized)
  y: number; // center Y on the canvas (0-1 normalized)
  zoom: number; // 1 = full scene, 3 = close-up on a few faces
  duration: number; // seconds to interpolate to this keyframe
}

const cameraPath: CameraKeyframe[] = [
  { x: 0.2, y: 0.3, zoom: 1.5, duration: 8 },
  { x: 0.7, y: 0.5, zoom: 2.5, duration: 10 }, // zoom into a cluster
  { x: 0.5, y: 0.8, zoom: 1.2, duration: 6 },
  { x: 0.9, y: 0.2, zoom: 3.0, duration: 12 }, // close-up on one face
  // ... loops back to start
];
```

**Important:** When a new face is added (guest arrives), the SceneRenderer should smoothly integrate it — just place the face texture in the next available slot. No restart or re-render needed.

### 2. FaceSlot System — faceSlots.ts

Pre-defined positions for faces in the group photo, arranged like a graduation photo (rows, with people at different heights).

```typescript
interface FaceSlot {
  id: string;
  x: number; // X position on canvas (pixels)
  y: number; // Y position on canvas (pixels)
  scale: number; // Size multiplier (front row bigger, back row smaller)
  row: number; // Which row (for depth/overlap ordering)
  occupied: boolean;
  faceImage?: string; // Base64 or URL of the face image
  isFamous: boolean; // Pre-loaded celebrity vs. party guest
  label?: string; // Name (for famous faces, shown on hover/zoom)
}
```

Generate 40-50 slots arranged in 4-5 rows. Back rows have smaller scale, front rows larger. Slight random offset on X/Y to avoid a rigid grid look. Pre-populate 20 slots with famous faces. Leave 20-30 empty for party guests.

### 3. LipSyncEngine.tsx — Audio-Reactive Mouth Animation

**No AI needed.** Two animation modes, with "Canadian" as the MVP default.

---

#### MODE A: "South Park Canadian" Mouth (MVP DEFAULT — No assets needed)

Inspired by how Canadians speak in South Park: the face is split horizontally in half. The top half hinges upward (rotates around the split line) to create a Pac-Man-like mouth opening. This is the **primary animation mode** for the hackathon because it requires zero extra assets — just the face image itself.

**How it works:**

1. Each face image is split into two halves at ~55% from the top (just below the nose):
   - **Top half:** forehead, eyes, nose — this is the part that rotates
   - **Bottom half:** chin, jaw — stays fixed
2. In Three.js, each face slot becomes TWO meshes instead of one:
   - Bottom half: static, stays in place
   - Top half: pivot point is at its bottom edge (the split line). Rotates around this pivot.
3. `audioAnalyzer.ts` extracts current amplitude (0-1) from the Web Audio `AnalyserNode`
4. Amplitude maps to rotation angle for the top half:
   - `0.0` amplitude → `0°` rotation (mouth closed)
   - `1.0` amplitude → `25°` rotation (mouth wide open, like Pac-Man)
   - Use `amplitude * maxAngle` with slight easing for smooth motion
5. Each face gets a **random delay offset** (50-300ms) so they don't all open in unison
6. Each face gets a **random enthusiasm factor** (0.6-1.0) multiplied against the amplitude, so some faces are more animated than others
7. Optional: add very slight random "idle" movement (±1-2°) when amplitude is low, so faces don't look frozen during quiet parts

**Implementation detail for the split:**

```typescript
// When loading a face texture, create two cropped versions:
function splitFace(faceCanvas: HTMLCanvasElement): {
  top: HTMLCanvasElement;
  bottom: HTMLCanvasElement;
} {
  const splitY = Math.floor(faceCanvas.height * 0.55); // Split at 55% from top

  const topCanvas = document.createElement('canvas');
  topCanvas.width = faceCanvas.width;
  topCanvas.height = splitY;
  topCanvas
    .getContext('2d')!
    .drawImage(
      faceCanvas,
      0,
      0,
      faceCanvas.width,
      splitY,
      0,
      0,
      faceCanvas.width,
      splitY,
    );

  const bottomCanvas = document.createElement('canvas');
  bottomCanvas.width = faceCanvas.width;
  bottomCanvas.height = faceCanvas.height - splitY;
  bottomCanvas
    .getContext('2d')!
    .drawImage(
      faceCanvas,
      0,
      splitY,
      faceCanvas.width,
      faceCanvas.height - splitY,
      0,
      0,
      faceCanvas.width,
      faceCanvas.height - splitY,
    );

  return { top: topCanvas, bottom: bottomCanvas };
}

// In the Three.js scene, for each face slot:
// - bottomMesh: positioned at slot position, static
// - topMesh: positioned so its BOTTOM EDGE aligns with the TOP EDGE of bottomMesh
//   - Set topMesh.geometry to have its pivot at the bottom edge
//   - Or: use a Group, offset the mesh upward, rotate the group
//   - rotation.z = amplitude * maxAngle * enthusiasmFactor (in radians)
```

**Why this works so well:**

- Zero extra assets (no mouth sprites to prepare)
- Inherently comedic — the South Park Canadian mouth IS the joke
- Looks intentionally stylized, so quality concerns vanish
- Dead simple to implement: just two textured planes per face, one rotates
- Very recognizable visual — people immediately get the reference

---

#### MODE B: Mouth Sprite Overlay (V2 ENHANCEMENT — Extra assets required)

This is the more polished approach using pre-made mouth shape images overlaid on the face. **Implement this only if time permits after the Canadian mouth is working.** If implemented, randomly assign Mode A or Mode B to each face slot for visual variety.

**How it works:**

1. 6 mouth shape sprites (see assets checklist) are pre-loaded as textures
2. Amplitude maps to a mouth shape index:
   - `0.0 - 0.1` → closed (index 0)
   - `0.1 - 0.25` → slightly open (index 1)
   - `0.25 - 0.45` → open (index 2)
   - `0.45 - 0.65` → wide (index 3)
   - `0.65 - 0.85` → oh-shape (index 4)
   - `0.85 - 1.0` → smile/singing (index 5)
3. The mouth sprite is overlaid on the face at ~70-75% from the top, centered horizontally
4. Mouth sprite size is ~30-35% of face width

**Mixing modes:** If both modes are implemented, assign each face slot a random animation mode at creation time. This makes the scene more visually interesting — some faces do the Canadian hinge, others have proper mouth shapes. The `FaceSlot` type should include an `animationMode: 'canadian' | 'sprite'` field.

---

**Shared across both modes:**

- `MusicPlayer` component plays the current track and feeds audio to a Web Audio `AnalyserNode`
- Every animation frame, `audioAnalyzer.ts` extracts the current RMS amplitude (0-1 range)
- Each face slot applies its own delay offset and enthusiasm factor to the shared amplitude
- During silence or quiet parts, faces should still have subtle idle animation (very slight movement)

### 4. CaptureStation.tsx — Webcam Face Capture

**Route:** `/capture` — runs on a separate device (laptop/tablet) at the entrance.

**Flow:**

1. On page load, request webcam access via `navigator.mediaDevices.getUserMedia`
2. Show live video feed on screen (subtle, not the main attraction)
3. Run face-api.js detection continuously (every 500ms is fine)
4. When a face is detected with confidence > 0.8:
   - Capture the video frame to a canvas
   - Use face-api.js landmarks to get the face bounding box
   - Add padding (20% on each side) for a natural crop
   - Apply the style filter (see imageFilter.ts below)
   - Convert to base64 PNG
   - Generate a unique ID for this guest
   - POST to local API: `fetch('/api/faces', { method: 'POST', body: JSON.stringify({ image: base64 }) })`
5. Show a brief "captured!" flash on screen (optional)
6. Cooldown of 3 seconds before capturing the next face (prevent duplicates)
7. The capture station should have a **white or well-lit background** behind where guests stand/walk. This matches the white-background standard used for famous face images and makes face detection more reliable
8. The capture should work somewhat automatically — the idea is guests walk past and their faces are grabbed without them actively posing

**face-api.js models needed (loaded from public/models/):**

- `tinyFaceDetector` — fast face detection
- `faceLandmark68Net` — for face bounding box refinement

### 5. imageFilter.ts — Style Filter Pipeline

Apply a consistent visual style to all faces so celebrity PNGs and webcam captures look cohesive.

**Recommended filter stack (applied via Canvas 2D context):**

```typescript
function applyStyleFilter(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d');

  // 0. Remove white/light background: pixels with brightness > 220 → transparent or scene bg color
  // This handles the standardized white-background face images

  // 1. Convert to grayscale
  // Use ctx.getImageData/putImageData, iterate pixels:
  // gray = 0.299*r + 0.587*g + 0.114*b

  // 2. Increase contrast (makes it look more graphic/illustrated)
  // For each pixel: newValue = ((value - 128) * contrastFactor) + 128
  // Use contrastFactor of ~1.4 - 1.6

  // 3. Apply slight posterize effect (reduce tonal range)
  // levels = 6
  // newValue = Math.round(value / (255/levels)) * (255/levels)

  // 4. Optional: add a sepia/warm tint
  // r = gray * 1.1, g = gray * 0.9, b = gray * 0.7

  return canvas;
}
```

This creates a high-contrast, slightly posterized, vintage look. All faces — whether from Google Images or a webcam — will look like they belong in the same "world."

**BACKGROUND STANDARD: All face images (both famous faces and webcam captures) should be on a WHITE or LIGHT background.** The capture station will use a white/well-lit background behind guests. Famous face PNGs should also be sourced with white/light backgrounds for consistency. The filter pipeline should account for this — the posterize + contrast steps will handle normalizing the white background into the scene's dark aesthetic. Consider adding a step that detects near-white pixels (above a brightness threshold) and replaces them with transparency or the scene's background color before applying the style filter.

**IMPORTANT:** The SAME filter must be applied to both pre-loaded famous faces AND captured guest faces. For famous faces, run the filter at build time or on first load and cache the results.

### 6. Local API Routes — Sync Layer (Same Machine, No Firebase)

Both the capture station (`/capture`) and the display (`/display`) run on the **same Next.js server on the same machine**. No external services needed. Communication happens through Next.js API routes with an in-memory store.

**API Routes:**

```
POST /api/faces          — CaptureStation sends a new face here
GET  /api/faces           — Display polls this to get all faces
GET  /api/faces?since=<timestamp>  — Display polls for only NEW faces since last check
```

**In-memory store (`faceStore.ts`):**

```typescript
// lib/faceStore.ts
// Simple module-level storage. Resets when the server restarts, which is fine for a hackathon.

interface StoredFace {
  id: string;
  image: string; // Base64 PNG, cropped & filtered face
  timestamp: number;
  name?: string; // Optional, for famous faces
}

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

**API route implementation (`app/api/faces/route.ts`):**

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

**Display polling:**
The display page polls `GET /api/faces?since=<lastTimestamp>` every 2-3 seconds. When new faces come back, it adds them to the next empty slot. Simple and reliable.

```typescript
// In the display component:
const [lastPoll, setLastPoll] = useState(Date.now());

useEffect(() => {
  const interval = setInterval(async () => {
    const res = await fetch(`/api/faces?since=${lastPoll}`);
    const { faces } = await res.json();
    if (faces.length > 0) {
      faces.forEach((face) => addFaceToScene(face));
      setLastPoll(Date.now());
    }
  }, 2500); // poll every 2.5 seconds
  return () => clearInterval(interval);
}, [lastPoll]);
```

**CaptureStation push:**
After processing a face, the capture station simply POSTs to the local API:

```typescript
await fetch('/api/faces', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ image: base64Face }),
});
```

**Why this works for the MVP:**

- Zero external dependencies (no Firebase account, no API keys, no env vars)
- Both routes run on `localhost:3000` — same machine, same server
- In-memory storage is fast and simple. Data doesn't survive server restart, but that's fine for a demo
- The capture station can be opened in a second browser tab/window, or on a phone on the same WiFi pointing at `<local-ip>:3000/capture`

### 7. MusicPlayer.tsx — Audio Playback + Analysis

**Responsibilities:**

- Play music tracks from `/public/music/`
- Create Web Audio `AudioContext` and `AnalyserNode`
- Connect: `audioElement → analyserNode → destination`
- Expose current amplitude via a shared ref or context
- Support playlist with auto-advance

```typescript
// audioAnalyzer.ts
export function getAmplitude(analyser: AnalyserNode): number {
  const data = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(data);

  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    const normalized = (data[i] - 128) / 128;
    sum += normalized * normalized;
  }

  return Math.sqrt(sum / data.length); // RMS amplitude, 0-1 range
}
```

### 8. Share Page — /share/[id]

**Nice-to-have for the hackathon.** If time permits:

- Shows the guest's filtered face with lip-sync animation playing
- Uses `HTMLCanvasElement.captureStream()` + MediaRecorder to export a short GIF/video
- "Share on Instagram" button (just opens IG with the image)
- QR code displayed on the main screen links here

---

## Visual Design Notes

- **Background of the group photo:** A dark, textured background (think old yearbook page, dark auditorium, or concert stage). This should be a single large image used as the backdrop.
- **Face arrangement:** Organic, not a rigid grid. Stagger rows, vary spacing slightly. Front row faces are ~2x the size of back row faces to create depth.
- **Style:** High-contrast black & white with slight warm tint. Think Andy Warhol meets class photo.
- **The camera movement should feel cinematic:** Slow, deliberate, with occasional pauses on interesting clusters. Think documentary-style.

---

## Developer Ownership & Parallel Workflow

This project is built by **two developers working in parallel** on the same codebase. Each dev owns specific files and routes. **Do NOT modify files owned by the other dev.** The integration point is the `/api/faces` API route and the shared types in `types/index.ts`.

### DEV A — Display & Animation (the "wow" screen)

**Owns these files:**

```
src/app/display/page.tsx
src/app/page.tsx                  # Landing/admin page
src/components/SceneRenderer.tsx
src/components/FaceSlot.tsx
src/components/LipSyncEngine.tsx
src/components/MusicPlayer.tsx
src/lib/faceSlots.ts
src/lib/audioAnalyzer.ts
src/lib/mouthMapper.ts
```

**Responsibilities:**

- Three.js scene setup with @react-three/fiber
- Ken Burns camera animation (keyframe system with easing)
- Face grid layout (40-50 slots, 4-5 rows, graduation photo arrangement)
- South Park Canadian mouth animation (face split + rotation on audio amplitude)
- Web Audio API integration (AnalyserNode, amplitude extraction)
- Music playback (MusicPlayer component)
- Polling `/api/faces` to receive new guest faces and placing them in empty slots
- Visual polish: per-face enthusiasm variation, idle animation, camera path tuning

**Sprint schedule:**
| Hour | Task |
|------|------|
| 1 | Project setup (both devs together), Three.js scene with face grid using placeholder rectangles |
| 2 | Ken Burns camera + face split logic (top/bottom halves as two meshes) |
| 3 | Web Audio analyzer + Canadian mouth rotation mapped to amplitude |
| 4 | Load real famous face PNGs, tune camera path and animation |
| 5 | Wire up polling from `/api/faces`, integrate live guest faces from Dev B |
| 6 | Polish: enthusiasm variation, idle animation, camera cinematography |
| 7 | (STRETCH) Mouth sprite Mode B + random mode mixing |
| 8 | Demo prep |

### DEV B — Capture Pipeline & API

**Owns these files:**

```
src/app/capture/page.tsx
src/app/api/faces/route.ts
src/app/share/[id]/page.tsx
src/components/CaptureStation.tsx
src/components/FaceProcessor.ts
src/lib/faceStore.ts
src/lib/imageFilter.ts
```

**Responsibilities:**

- `/api/faces` API route (GET and POST) with in-memory store
- Webcam capture station (getUserMedia, face-api.js detection loop)
- Face detection, cropping, and bounding box extraction
- Image style filter pipeline (white bg removal → grayscale → contrast → posterize)
- Posting processed faces to the local API
- Share page (stretch goal): individual avatar view, GIF export, QR code

**Sprint schedule:**
| Hour | Task |
|------|------|
| 1 | Project setup (both devs together), `/api/faces` route + in-memory store |
| 2 | CaptureStation: webcam access, face-api.js model loading, detection loop |
| 3 | Face cropping with padding + debug page showing raw → detected → cropped |
| 4 | imageFilter.ts: white bg removal, grayscale, contrast, posterize pipeline |
| 5 | Integration: POST captured faces to API, test with Dev A's display |
| 6 | Tune filter params, detection confidence, cooldown timing based on display |
| 7 | (STRETCH) Share page `/share/[id]`, QR code generation |
| 8 | Demo prep |

### SHARED (agree on these in the first 30 minutes)

**Shared files (both devs may read, coordinate changes):**

```
src/types/index.ts               # Shared TypeScript interfaces
package.json                     # Dependencies
public/faces/                    # Famous face images
public/music/                    # Music tracks
public/models/                   # face-api.js model weights
```

**The contract between Dev A and Dev B:**

```typescript
// types/index.ts — AGREE ON THIS BEFORE SPLITTING UP

interface StoredFace {
  id: string;
  image: string; // Base64 PNG, cropped & filtered face
  timestamp: number;
  name?: string; // Optional, for famous faces
}

interface FaceSlot {
  id: string;
  x: number;
  y: number;
  scale: number;
  row: number;
  occupied: boolean;
  faceImage?: string;
  isFamous: boolean;
  label?: string;
  animationMode: 'canadian' | 'sprite';
}

// API contract:
// POST /api/faces  — body: { image: string, name?: string }
//                  — response: { success: true }
// GET  /api/faces  — query: ?since=<timestamp> (optional)
//                  — response: { faces: StoredFace[] }
```

### Git Workflow

Both devs work on **separate branches**, merging at integration points:

1. **Hour 1:** Both devs work together on `main` for initial project setup (create-next-app, install deps, create shared types, folder structure)
2. **Hours 2-4:** Dev A on `feature/display`, Dev B on `feature/capture`
3. **Hour 5:** Merge both branches into `main`, test integration
4. **Hours 6-8:** Both can work on `main` or continue on feature branches

**Merge conflicts should be minimal** since file ownership doesn't overlap. The only potential conflict is `package.json` if both devs add dependencies — resolve by keeping both.

---

## Implementation Priority (8-Hour Sprint — Combined View)

| Hour | Dev A (Display)                                              | Dev B (Capture)                                            | Milestone                           |
| ---- | ------------------------------------------------------------ | ---------------------------------------------------------- | ----------------------------------- |
| 1    | Project setup together, Three.js scene with placeholder grid | Project setup together, `/api/faces` route + store         | Skeleton running                    |
| 2    | Ken Burns camera + face split into two meshes                | Webcam capture + face-api.js detection loop                | Both sides functional independently |
| 3    | Web Audio analyzer + Canadian mouth animation                | Face cropping + debug preview page                         | Faces singing on display!           |
| 4    | Load real famous faces, tune camera path                     | Image filter pipeline (bg removal → grayscale → posterize) | Both sides polished independently   |
| 5    | **INTEGRATION:** Wire polling from `/api/faces`              | **INTEGRATION:** POST faces to API, test with display      | Full pipeline end-to-end!           |
| 6    | Polish: enthusiasm variation, idle animation, cinematography | Tune filter, confidence, cooldown based on display         | Smooth experience                   |
| 7    | (STRETCH) Mouth sprite Mode B                                | (STRETCH) Share page + QR code                             | Extra features                      |
| 8    | Demo prep                                                    | Demo prep                                                  | Presentable demo                    |

---

## Key Dependencies (package.json)

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "three": "^0.160.0",
    "@react-three/fiber": "^8.0.0",
    "@react-three/drei": "^9.0.0",
    "face-api.js": "^0.22.2"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/three": "^0.160.0",
    "tailwindcss": "^3.0.0"
  }
}
```

---

## Face-api.js Model Files

Download these model files and place them in `public/models/`:

- `tiny_face_detector_model-shard1` (+ manifest)
- `face_landmark_68_model-shard1` (+ manifest)

Source: https://github.com/justadudewhohacks/face-api.js/tree/master/weights

---

## Environment Variables

No environment variables needed for the MVP. Everything runs locally on the same machine. If you need the capture station accessible from another device on the same WiFi, just run Next.js with `next dev -H 0.0.0.0` to expose on the local network.

---

## Notes for AI-Assisted Development

- **Start with the display screen** (`/display` route). Get the Three.js scene rendering static faces with Ken Burns camera first. This is the core visual — everything else feeds into it.
- **Use @react-three/fiber** for React-Three.js integration instead of raw Three.js. It's more ergonomic with React and Next.js.
- **For the face grid**, start with simple `<mesh>` planes with texture maps. Each face is a textured quad positioned in 3D space (but all on the same Z plane, like a flat collage).
- **Lip-sync MVP is the "Canadian mouth"**: split each face texture into top/bottom halves. The top half rotates on a hinge (pivot at the bottom edge) based on audio amplitude. This is the South Park Canadian speaking animation. No mouth sprites needed. Each face = 2 meshes. Only add mouth sprite mode as a stretch goal.
- **No external services needed.** The capture station and display communicate through a Next.js API route with in-memory storage. No Firebase, no database, no env vars. Both run on `localhost:3000`.
- **The style filter is critical for visual cohesion.** Without it, celebrity PNGs and webcam grabs will look jarring together. Apply it early and consistently.
- **Test with at least 3-4 pre-loaded famous faces before building the capture station.** The display must look good on its own before adding the real-time capture flow.
