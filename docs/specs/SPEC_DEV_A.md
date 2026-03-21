# PartyFace — DEV A SPEC: Display & Animation

> **YOUR ROLE:** You are building the display screen — the main visual that runs on the big screen at the party. This is the "wow" factor.
>
> **There is another developer (Dev B) building the capture pipeline and API simultaneously.** Do NOT create or modify Dev B's files. You communicate through a shared API and shared types.

---

## Project Overview

PartyFace is an interactive party installation. On a large screen, a cinematic camera slowly pans across a massive stylized group photo — like a graduation photo — featuring famous personalities and party guests, all lip-syncing to the music currently playing using a "South Park Canadian" mouth animation (face split in half, top hinges open). Guests discover themselves in the "photo" when their faces are captured by a webcam and inserted live.

---

## Your Tech Stack

- **Framework:** Next.js (React) + TypeScript
- **3D Rendering:** Three.js via @react-three/fiber + @react-three/drei
- **Audio Analysis:** Web Audio API (native browser API)
- **Styling:** Tailwind CSS

---

## Files YOU Own (create and modify freely)

```
src/app/display/page.tsx            # Main display screen (the big screen)
src/app/page.tsx                    # Landing/admin page (simple, low priority)
src/components/SceneRenderer.tsx    # Three.js scene with Ken Burns camera
src/components/FaceSlot.tsx         # Individual face in the group photo (two meshes: top + bottom)
src/components/LipSyncEngine.tsx    # Audio-reactive Canadian mouth animation controller
src/components/MusicPlayer.tsx      # Audio player + Web Audio analyzer
src/lib/faceSlots.ts               # Pre-defined face positions in the scene
src/lib/audioAnalyzer.ts           # Web Audio API amplitude extraction
src/lib/mouthMapper.ts            # Maps amplitude → rotation angle
```

## Files You MUST NOT Modify (owned by Dev B)

```
src/app/capture/*                  # Webcam capture station
src/app/api/faces/*                # API route
src/app/share/*                    # Share page
src/components/CaptureStation.tsx
src/components/FaceProcessor.ts
src/lib/faceStore.ts
src/lib/imageFilter.ts
```

## Shared Files (coordinate changes with Dev B)

```
src/types/index.ts                 # Shared interfaces — agree before coding
package.json                       # Both devs add deps here
```

---

## The Shared Contract (agreed with Dev B)

```typescript
// src/types/index.ts

export interface StoredFace {
  id: string;
  image: string;         // Base64 PNG, cropped & filtered face
  timestamp: number;
  name?: string;         // Optional, for famous faces
}

export interface FaceSlot {
  id: string;
  x: number;             // X position on canvas (pixels)
  y: number;             // Y position on canvas (pixels)
  scale: number;         // Size multiplier (front row bigger, back row smaller)
  row: number;           // Which row (for depth/overlap ordering)
  occupied: boolean;
  faceImage?: string;    // Base64 or URL of the face image
  isFamous: boolean;     // Pre-loaded celebrity vs. party guest
  label?: string;        // Name (for famous faces)
  animationMode: 'canadian' | 'sprite';
}

// API you will CONSUME (Dev B builds it):
// GET /api/faces?since=<timestamp>  → { faces: StoredFace[] }
```

---

## Your Sprint Schedule

| Hour | Task | Deliverable |
|------|------|-------------|
| 1 | Project setup (with Dev B), Three.js scene with face grid using placeholder colored rectangles | Rectangles visible on screen in grid layout |
| 2 | Ken Burns camera animation + face split logic (each rectangle becomes two halves) | Cinematic pan/zoom working |
| 3 | Web Audio analyzer + Canadian mouth rotation mapped to amplitude | Faces doing South Park lip-sync to music! |
| 4 | Load real famous face PNGs from `/public/faces/`, tune camera path | 20 famous faces singing on screen |
| 5 | **INTEGRATION:** Wire up polling from `/api/faces` to receive live guest faces | New faces from Dev B appear on display |
| 6 | Polish: per-face enthusiasm variation, idle animation, camera cinematography | Smooth, cinematic experience |
| 7 | (STRETCH) Mouth sprite Mode B + random mode mixing per face | Visual variety |
| 8 | Demo prep, help with final integration | Presentable demo |

---

## Detailed Component Specs

### 1. SceneRenderer.tsx — The Main Visual

This is the heart of YOUR work. It renders the "group photo" and animates the camera.

**Implementation approach:**
- Use @react-three/fiber with an orthographic camera looking at a large 2D scene
- Face slots are textured quads (planes) positioned in 3D space, all on the same Z plane (flat collage)
- The camera does a slow, smooth Ken Burns animation: panning left/right, zooming in/out on random face clusters, occasionally focusing on a single face
- Camera movement uses easing functions (sine or cubic) for cinematic feel
- The camera path is pre-scripted as a series of keyframes

**Ken Burns keyframe system:**
```typescript
interface CameraKeyframe {
  x: number;          // center X on the canvas (0-1 normalized)
  y: number;          // center Y on the canvas (0-1 normalized)
  zoom: number;       // 1 = full scene, 3 = close-up on a few faces
  duration: number;   // seconds to interpolate to this keyframe
}

const cameraPath: CameraKeyframe[] = [
  { x: 0.2, y: 0.3, zoom: 1.5, duration: 8 },
  { x: 0.7, y: 0.5, zoom: 2.5, duration: 10 },  // zoom into a cluster
  { x: 0.5, y: 0.8, zoom: 1.2, duration: 6 },
  { x: 0.9, y: 0.2, zoom: 3.0, duration: 12 },   // close-up on one face
  // ... loops back to start
];
```

**Important:** When a new face is added (guest arrives), just place the face texture in the next available slot. No restart or re-render needed.

### 2. faceSlots.ts — Face Grid Layout

Pre-defined positions for faces, arranged like a graduation photo (rows, different heights).

Generate 40-50 slots arranged in 4-5 rows. Back rows have smaller scale, front rows larger. Slight random offset on X/Y to avoid a rigid grid look. Pre-populate 20 slots with famous faces (from `/public/faces/`). Leave 20-30 empty for party guests.

### 3. LipSyncEngine / FaceSlot — South Park Canadian Mouth

Each face is split horizontally at ~55% from the top (just below the nose). The top half hinges upward like a Pac-Man mouth.

**Each face slot = TWO meshes:**
- **Bottom half:** static, stays in place (chin, jaw)
- **Top half:** rotates around its bottom edge (forehead, eyes, nose)

**Implementation:**
```typescript
function splitFace(faceCanvas: HTMLCanvasElement): { top: HTMLCanvasElement, bottom: HTMLCanvasElement } {
  const splitY = Math.floor(faceCanvas.height * 0.55);

  const topCanvas = document.createElement('canvas');
  topCanvas.width = faceCanvas.width;
  topCanvas.height = splitY;
  topCanvas.getContext('2d')!.drawImage(faceCanvas, 0, 0, faceCanvas.width, splitY, 0, 0, faceCanvas.width, splitY);

  const bottomCanvas = document.createElement('canvas');
  bottomCanvas.width = faceCanvas.width;
  bottomCanvas.height = faceCanvas.height - splitY;
  bottomCanvas.getContext('2d')!.drawImage(faceCanvas, 0, splitY, faceCanvas.width, faceCanvas.height - splitY, 0, 0, faceCanvas.width, faceCanvas.height - splitY);

  return { top: topCanvas, bottom: bottomCanvas };
}
```

**Animation mapping:**
- Amplitude `0.0` → rotation `0°` (closed)
- Amplitude `1.0` → rotation `25°` (wide open)
- Each face gets a random delay offset (50-300ms) — don't sync them all
- Each face gets a random enthusiasm factor (0.6-1.0) multiplied against amplitude
- Add slight idle movement (±1-2°) during quiet parts

**Three.js pivot approach:** Use a Group for the top half. Position the mesh inside the group so the pivot is at the bottom edge. Rotate the group.

### 4. MusicPlayer.tsx + audioAnalyzer.ts

- Play tracks from `/public/music/`
- Create Web Audio `AudioContext` and `AnalyserNode`
- Connect: `audioElement → analyserNode → destination`
- Expose amplitude via shared React context or ref

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
  return Math.sqrt(sum / data.length); // RMS amplitude, 0-1
}
```

### 5. Polling for New Guest Faces

Poll Dev B's API every 2.5 seconds to receive new guest faces:

```typescript
const [lastPoll, setLastPoll] = useState(Date.now());

useEffect(() => {
  const interval = setInterval(async () => {
    const res = await fetch(`/api/faces?since=${lastPoll}`);
    const { faces } = await res.json();
    if (faces.length > 0) {
      faces.forEach(face => addFaceToScene(face));
      setLastPoll(Date.now());
    }
  }, 2500);
  return () => clearInterval(interval);
}, [lastPoll]);
```

When a new face arrives: load the base64 image as a texture, split it, place both halves in the next empty slot, start animating.

---

## Visual Design Notes

- **Background:** Dark, textured (old yearbook, dark auditorium). Use `/public/background.jpg` or generate a dark gradient.
- **Face arrangement:** Organic, not a rigid grid. Stagger rows, vary spacing. Front row ~2x size of back row.
- **Style:** High-contrast black & white with slight warm tint. Think Andy Warhol meets class photo.
- **Camera movement:** Slow, deliberate, with occasional pauses on interesting clusters. Documentary-style.

---

## Testing Before Integration (Hours 1-4)

You can test your display completely independently:
1. Use placeholder colored rectangles first (hour 1)
2. Swap in real famous face PNGs from `/public/faces/` (hour 4)
3. For testing the polling before Dev B's API exists, add a simple test function that manually adds a face to the scene
4. The display should look great and be demo-worthy on its own before any integration

---

## Dependencies You Need

```json
{
  "three": "^0.160.0",
  "@react-three/fiber": "^8.0.0",
  "@react-three/drei": "^9.0.0",
  "@types/three": "^0.160.0"
}
```
