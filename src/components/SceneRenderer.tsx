// ============================================================
// SceneRenderer — Three.js scene with Ken Burns camera — DEV A
// ============================================================
"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useRef, useState, useEffect } from "react";
import * as THREE from "three";
import type { FaceSlot as FaceSlotType, CameraKeyframe, StoredFace } from "@/types";
import { generateSlots, findEmptySlot, SCENE_WIDTH, SCENE_HEIGHT, VIP_FACES, DUMMY_FACE } from "@/lib/faceSlots";
import { preloadFaces } from "@/lib/textureCache";
import FaceSlotComponent from "./FaceSlot";
import { useLipSyncParams } from "./LipSyncEngine";

// ---- Ken Burns Camera Path ----
const CAMERA_PATH: CameraKeyframe[] = [
  { x: 0.5, y: 0.5, zoom: 1.0, duration: 4 }, // start wide
  { x: 0.3, y: 0.3, zoom: 1.8, duration: 8 }, // pan to upper left cluster
  { x: 0.7, y: 0.5, zoom: 2.2, duration: 10 }, // zoom into right side
  { x: 0.5, y: 0.8, zoom: 1.5, duration: 6 }, // pull back, pan to front row
  { x: 0.2, y: 0.6, zoom: 2.8, duration: 12 }, // close-up on a face
  { x: 0.8, y: 0.3, zoom: 2.0, duration: 8 }, // pan to upper right
  { x: 0.5, y: 0.5, zoom: 1.2, duration: 6 }, // pull back to wide
  { x: 0.4, y: 0.7, zoom: 2.5, duration: 10 }, // zoom into front-left
  { x: 0.6, y: 0.2, zoom: 1.8, duration: 8 }, // back row sweep
  { x: 0.5, y: 0.5, zoom: 1.0, duration: 6 }, // reset wide
];

// Smooth easing function (sine)
function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

// ---- Camera Controller (inside Canvas) ----
function KenBurnsCamera({ overview }: { overview: boolean }) {
  const { camera, size } = useThree();
  const timeRef = useRef(0);
  const keyframeIndexRef = useRef(0);
  const keyframeTimeRef = useRef(0);
  const transitionRef = useRef(0); // 0 = ken burns, 1 = overview

  useFrame((_, delta) => {
    if (!(camera instanceof THREE.OrthographicCamera)) return;

    // Smooth transition between modes
    const target = overview ? 1 : 0;
    transitionRef.current += (target - transitionRef.current) * 0.03;
    const blend = transitionRef.current;

    // Ken Burns animation (keeps running so it resumes smoothly)
    timeRef.current += delta;
    const elapsed = timeRef.current - keyframeTimeRef.current;
    const currentIdx = keyframeIndexRef.current;
    const nextIdx = (currentIdx + 1) % CAMERA_PATH.length;
    const current = CAMERA_PATH[currentIdx];
    const next = CAMERA_PATH[nextIdx];

    let t = Math.min(elapsed / next.duration, 1);
    t = easeInOutSine(t);

    const kbX = THREE.MathUtils.lerp(
      current.x * SCENE_WIDTH,
      next.x * SCENE_WIDTH,
      t
    );
    const kbY = THREE.MathUtils.lerp(
      -current.y * SCENE_HEIGHT,
      -next.y * SCENE_HEIGHT,
      t
    );
    const kbZoom = THREE.MathUtils.lerp(current.zoom, next.zoom, t);

    // Overview: center on scene, zoom to fit
    const ovX = SCENE_WIDTH / 2;
    const ovY = -SCENE_HEIGHT / 2;
    // Calculate zoom to fit entire scene in viewport
    const zoomX = size.width / SCENE_WIDTH;
    const zoomY = size.height / SCENE_HEIGHT;
    const ovZoom = Math.min(zoomX, zoomY) * 0.85; // 85% to add padding

    // Blend between modes
    const x = THREE.MathUtils.lerp(kbX, ovX, blend);
    const y = THREE.MathUtils.lerp(kbY, ovY, blend);
    const zoom = THREE.MathUtils.lerp(kbZoom, ovZoom, blend);

    camera.position.set(x, y, 100);
    camera.lookAt(x, y, 0);
    camera.zoom = zoom;
    camera.updateProjectionMatrix();

    // Advance to next keyframe
    if (elapsed >= next.duration) {
      keyframeIndexRef.current = nextIdx;
      keyframeTimeRef.current = timeRef.current;
    }
  });

  return null;
}

// ---- Scene Content (inside Canvas) ----
function SceneContent({
  slots,
  openness,
  elapsedTime,
}: {
  slots: FaceSlotType[];
  openness: number;
  elapsedTime: number;
}) {
  const getParamsForSlot = useLipSyncParams();

  return (
    <>
      {/* Dark background plane */}
      <mesh position={[SCENE_WIDTH / 2, -SCENE_HEIGHT / 2, -1]}>
        <planeGeometry args={[SCENE_WIDTH * 1.5, SCENE_HEIGHT * 1.5]} />
        <meshBasicMaterial color="#0a0a0a" />
      </mesh>

      {/* Subtle grid lines for depth (optional visual) */}
      <mesh position={[SCENE_WIDTH / 2, -SCENE_HEIGHT / 2, -0.5]}>
        <planeGeometry args={[SCENE_WIDTH * 1.2, SCENE_HEIGHT * 1.2]} />
        <meshBasicMaterial color="#111111" />
      </mesh>

      {/* Render all face slots */}
      {slots.map((slot) => (
        <FaceSlotComponent
          key={slot.id}
          slot={slot}
          openness={openness}
          animParams={getParamsForSlot(slot.id)}
          elapsedTime={elapsedTime}
        />
      ))}
    </>
  );
}

// ---- Main SceneRenderer (exported) ----
interface SceneRendererProps {
  openness: number;
  elapsedTime: number;
}

export default function SceneRenderer({
  openness,
  elapsedTime,
}: SceneRendererProps) {
  const [slots, setSlots] = useState<FaceSlotType[]>([]);
  const [overview, setOverview] = useState(false);
  const lastPollRef = useRef(Date.now());

  // Initialize slots and preload all face images before rendering
  useEffect(() => {
    async function init() {
      // Preload ALL images first, wait for completion
      const allUrls = [DUMMY_FACE, ...VIP_FACES.map((v) => v.file)];
      await preloadFaces(allUrls);

      const initialSlots = generateSlots();

      // Assign VIPs to specific slot indices spread evenly
      const vipSlotIndices: number[] = [];
      const step = Math.floor(initialSlots.length / VIP_FACES.length);
      for (let v = 0; v < VIP_FACES.length; v++) {
        vipSlotIndices.push(v * step + Math.floor(step / 2));
      }

      const slotsWithFaces = initialSlots.map((slot, i) => {
        const vipIdx = vipSlotIndices.indexOf(i);
        if (vipIdx !== -1) {
          return {
            ...slot,
            occupied: true,
            isFamous: true,
            faceImage: VIP_FACES[vipIdx].file,
            label: VIP_FACES[vipIdx].label,
            animationMode: "canadian" as const,
          };
        }
        return {
          ...slot,
          occupied: true,
          isFamous: false,
          faceImage: DUMMY_FACE,
          animationMode: "canadian" as const,
        };
      });

      setSlots(slotsWithFaces);
    }

    init();
  }, []);

  // Poll /api/faces for new guest faces
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/faces?since=${lastPollRef.current}`);
        const { faces } = (await res.json()) as { faces: StoredFace[] };

        if (faces && faces.length > 0) {
          setSlots((prev) => {
            const updated = [...prev];
            for (const face of faces) {
              // Find a dummy slot (non-VIP, still showing generic face)
              const dummy = updated.find(
                (s) => !s.isFamous && s.faceImage === DUMMY_FACE
              ) || findEmptySlot(updated);
              if (dummy) {
                const idx = updated.findIndex((s) => s.id === dummy.id);
                if (idx !== -1) {
                  updated[idx] = {
                    ...updated[idx],
                    occupied: true,
                    faceImage: face.image,
                    isFamous: false,
                    label: face.name,
                  };
                }
              }
            }
            return updated;
          });
          lastPollRef.current = Date.now();
        }
      } catch {
        // API not available yet (Dev B hasn't built it) — that's fine
      }
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full relative">
      {/* Overview toggle button */}
      <button
        onClick={() => setOverview((v) => !v)}
        className="absolute top-4 right-4 z-10 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-lg border border-white/20 transition-all"
      >
        {overview ? "Ken Burns" : "Full Scene"}
      </button>

      <Canvas
        orthographic
        camera={{
          position: [SCENE_WIDTH / 2, -SCENE_HEIGHT / 2, 100],
          zoom: 1,
          near: 0.1,
          far: 1000,
        }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: "#0a0a0a" }}
      >
        <KenBurnsCamera overview={overview} />
        <SceneContent
          slots={slots}
          openness={openness}
          elapsedTime={elapsedTime}
        />
      </Canvas>
    </div>
  );
}
