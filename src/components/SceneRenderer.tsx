// ============================================================
// SceneRenderer — Three.js scene with Ken Burns camera — DEV A
// ============================================================
"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import * as THREE from "three";
import type { FaceSlot as FaceSlotType, CameraKeyframe, StoredFace } from "@/types";
import { generateSlots, findEmptySlot, SCENE_WIDTH, SCENE_HEIGHT } from "@/lib/faceSlots";
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
function KenBurnsCamera() {
  const { camera } = useThree();
  const timeRef = useRef(0);
  const keyframeIndexRef = useRef(0);
  const keyframeTimeRef = useRef(0);

  useFrame((_, delta) => {
    if (!(camera instanceof THREE.OrthographicCamera)) return;

    timeRef.current += delta;
    const elapsed = timeRef.current - keyframeTimeRef.current;
    const currentIdx = keyframeIndexRef.current;
    const nextIdx = (currentIdx + 1) % CAMERA_PATH.length;
    const current = CAMERA_PATH[currentIdx];
    const next = CAMERA_PATH[nextIdx];

    let t = Math.min(elapsed / next.duration, 1);
    t = easeInOutSine(t);

    // Interpolate position and zoom
    const x = THREE.MathUtils.lerp(
      current.x * SCENE_WIDTH,
      next.x * SCENE_WIDTH,
      t
    );
    const y = THREE.MathUtils.lerp(
      -current.y * SCENE_HEIGHT,
      -next.y * SCENE_HEIGHT,
      t
    );
    const zoom = THREE.MathUtils.lerp(current.zoom, next.zoom, t);

    camera.position.x = x;
    camera.position.y = y;
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
  const lastPollRef = useRef(Date.now());

  // Initialize slots with placeholders on mount
  useEffect(() => {
    const initialSlots = generateSlots();

    // Pre-populate some slots as occupied with placeholder colors
    // These will be replaced by real famous face images later
    const slotsWithPlaceholders = initialSlots.map((slot, i) => {
      // Occupy first 20 slots as "famous faces" placeholders
      if (i < 20) {
        return {
          ...slot,
          occupied: true,
          isFamous: true,
          label: `Celebrity ${i + 1}`,
          animationMode: "canadian" as const,
        };
      }
      return slot;
    });

    setSlots(slotsWithPlaceholders);
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
              const empty = findEmptySlot(updated);
              if (empty) {
                const idx = updated.findIndex((s) => s.id === empty.id);
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
    <div className="w-full h-full">
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
        <KenBurnsCamera />
        <SceneContent
          slots={slots}
          openness={openness}
          elapsedTime={elapsedTime}
        />
      </Canvas>
    </div>
  );
}
