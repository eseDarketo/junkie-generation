# PartyFace

Real-Time Singing Group Photo Installation.

A webcam captures guests' faces at the entrance. On a large screen, a cinematic camera pans across a massive group photo featuring famous personalities and guests — all lip-syncing to the music.

## Quick Start

```bash
npm install --legacy-peer-deps
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the landing page.

### Routes

| Route         | Purpose                                         |
| ------------- | ----------------------------------------------- |
| `/`           | Landing / admin page                            |
| `/display`    | Main display screen (Three.js scene + lip-sync) |
| `/capture`    | Webcam capture station (face detection)         |
| `/share/[id]` | Individual avatar share page                    |

### Network Access

To access the capture station from another device on the same WiFi:

```bash
npx next dev -H 0.0.0.0
```

## Developer Ownership

| Dev                             | Owns                                                                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dev A** (Display & Animation) | `display/page.tsx`, `SceneRenderer`, `FaceSlot`, `LipSyncEngine`, `MusicPlayer`, `faceSlots.ts`, `audioAnalyzer.ts`, `mouthMapper.ts`, `page.tsx` |
| **Dev B** (Capture & API)       | `capture/page.tsx`, `api/faces/route.ts`, `share/[id]/page.tsx`, `CaptureStation`, `FaceProcessor`, `faceStore.ts`, `imageFilter.ts`              |
| **Shared**                      | `types/index.ts`, `package.json`, `public/faces/`, `public/music/`, `public/models/`                                                              |

See `SPEC.md` for the full specification.

## Assets Needed

- **Famous faces** (20+): Place cropped PNGs in `public/faces/`
- **Music tracks**: Place MP3s in `public/music/`
- **face-api.js models**: Download from [face-api.js weights](https://github.com/justadudewhohacks/face-api.js/tree/master/weights) into `public/models/`

## Tech Stack

Next.js 14 / React 18 / Three.js + @react-three/fiber / face-api.js / Tailwind CSS / Web Audio API
