# Feature Spec: Identify Page (`/identify`)

## Overview

After the party captures guests at the entrance, any guest can open `/identify` on their phone to **find themselves** among the captured faces. The page uses the front camera + face-api.js to extract a face descriptor locally, then sends it to the server for matching. **No guest data is downloaded to the phone.** Once matched, the guest is redirected to `/share/[id]` to view and share their singing avatar.

---

## User Flow

```
Guest opens /identify on phone
        │
        ▼
┌─────────────────────────┐
│  Load face-api.js       │
│  models (tiny detector,  │
│  landmarks, recognition) │
└────────┬────────────────┘
         ▼
┌─────────────────────────┐
│  Request front camera    │
│  Show live video feed    │
│  "Look at the camera     │
│   to find yourself!"     │
└────────┬────────────────┘
         ▼
┌─────────────────────────────────────────┐
│  Detection loop (every 800ms):          │
│  1. Detect face in video frame          │
│  2. Extract 128-dim face descriptor     │
│  3. POST descriptor to /api/identify    │
│     (server compares against stored)    │
│  4. Server returns match or null        │
└────────┬──────────────┬────────────────┘
         │              │
    Match found     No match after
         │          ~15 seconds
         ▼              ▼
┌──────────────┐  ┌──────────────────────┐
│ "Found you!" │  │ "Not found yet.      │
│  animation   │  │  Were you captured?"  │
│  (1.5s)      │  │  [Retry] [Browse All] │
└──────┬───────┘  └──────────────────────┘
       ▼
┌──────────────┐
│ Redirect to  │
│ /share/[id]  │
└──────────────┘
```

---

## Technical Design

### Face Descriptors

face-api.js's `faceRecognitionNet` produces a **128-dimensional Float32Array** (a "face descriptor") for each detected face. Two faces are the same person if the **Euclidean distance** between their descriptors is below a threshold.

- **Match threshold:** `< 0.6` (face-api.js standard; can be tuned)
- **Good match:** `< 0.4`
- **Definitely different:** `> 0.8`

### Changes to Existing Types

Add an optional `descriptor` field to `StoredFace`:

```typescript
export interface StoredFace {
  id: string;
  image: string; // Base64 PNG, cropped & filtered face
  timestamp: number;
  name?: string; // Optional, for famous faces
  descriptor?: number[]; // 128-dim face descriptor from face-api.js (serialized Float32Array)
}
```

This is backward-compatible — famous pre-loaded faces won't have descriptors (they aren't from real guests), and the existing capture flow can be updated to include descriptors when available.

### Changes to Capture Flow (CaptureStation / FaceProcessor)

When capturing a guest face, the pipeline should also:

1. Run `faceRecognitionNet` to extract the face descriptor
2. Serialize it as `Array.from(descriptor)` (number[])
3. Include `descriptor` in the POST to `/api/faces`

### New API Endpoint

**`POST /api/identify`** — Server-side face matching. The phone sends only its own descriptor (~512 bytes), the server compares against all stored guest descriptors and returns the best match:

```typescript
// Request body:
{ descriptor: number[] } // 128-dim face descriptor

// Response:
{
  match: { id: string } | null,
  guestCount: number
}
```

**Why server-side:** The phone never downloads other guests' images or descriptors. Matching logic and threshold are centralized. Only ~512 bytes are sent per scan attempt.

### Additional face-api.js Model Required

The identify page and updated capture flow require:

- **`face_recognition_model`** — `face_recognition_model-shard1` + `face_recognition_model-shard2` + manifest

Download from: https://github.com/justadudewhohacks/face-api.js/tree/master/weights  
Place in: `public/models/`

(This is in addition to the already-required `tinyFaceDetector` and `faceLandmark68Net`.)

---

## Component: IdentifyStation.tsx

**Route:** `/identify` — mobile-first, opened by guests on their phones.

### Props / Dependencies

- face-api.js models: `tinyFaceDetector`, `faceLandmark68Net`, `faceRecognitionNet`
- API: `POST /api/identify`
- Navigation: `next/navigation` for redirect to `/share/[id]`

### State Machine

```
LOADING → SCANNING → MATCHED → REDIRECTING
                  ↘ NOT_FOUND (after timeout)
                       ↘ SCANNING (retry)
```

| State       | UI                                                         |
| ----------- | ---------------------------------------------------------- |
| LOADING     | "Loading face recognition..." with spinner                 |
| SCANNING    | Live camera feed + pulsing scan overlay + "Look at camera" |
| MATCHED     | Green highlight + "Found you!" + matched face preview      |
| NOT_FOUND   | "Not found" message + Retry button + Browse All link       |
| REDIRECTING | Brief transition, then navigate to `/share/[id]`           |

### Matching Algorithm (Server-Side)

Matching happens in `POST /api/identify`. The server iterates all stored face descriptors and finds the best match via Euclidean distance:

```typescript
function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

// Match threshold: < 0.6
// Returns the face with the lowest distance below threshold, or null
```

The client only sends its own descriptor and receives a single ID back.

### Request Strategy

- Each scan (~800ms interval) extracts a descriptor and POSTs to `/api/identify`
- Requests are serialized — a new request is not sent until the previous one completes
- No client-side caching of other guests' data
- Server handles freshness: if a guest is captured mid-scan, the next POST will find them

### Performance Notes

- Comparing 128-dim vectors against 20-30 stored faces is instant (~0.1ms) on the server
- The bottleneck is face detection + descriptor extraction on the phone (~100-200ms per frame)
- 800ms detection interval accounts for extraction time + network round-trip
- Each POST payload is ~512 bytes (128 floats); response is ~50 bytes

---

## File Ownership

| File                                 | Owner                               |
| ------------------------------------ | ----------------------------------- |
| `src/app/identify/page.tsx`          | New (you)                           |
| `src/components/IdentifyStation.tsx` | New (you)                           |
| `src/app/api/identify/route.ts`      | New (you)                           |
| `src/types/index.ts`                 | Shared — add `descriptor` field     |
| `src/lib/faceStore.ts`               | Dev B — needs `descriptor` support  |
| `src/components/CaptureStation.tsx`  | Dev B — needs descriptor extraction |

---

## Mobile UX Considerations

- Request **front-facing camera** (`facingMode: 'user'`)
- Full-viewport video feed (no chrome)
- Large, readable text overlays
- Haptic feedback on match (if supported via `navigator.vibrate`)
- Works in both portrait and landscape
- Graceful fallback if camera is denied: show a "Browse All Guests" option with a gallery view

---

## Edge Cases

| Scenario                          | Handling                                                 |
| --------------------------------- | -------------------------------------------------------- |
| Guest not yet captured            | Timeout → "Not found" with instruction to visit entrance |
| Multiple matches (twins, similar) | Return best match (lowest distance)                      |
| Poor lighting on phone            | Show tip: "Move to a well-lit area"                      |
| Camera permission denied          | Show manual browse/search fallback                       |
| No stored faces yet               | "No guests captured yet. Check back soon!"               |
| Famous face matched               | Skip — only match against faces with descriptors         |
