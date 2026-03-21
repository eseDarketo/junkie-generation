// ============================================================
// FaceSlot — Individual face in the group photo — DEV A
// ============================================================
// Each face is TWO meshes for Canadian mouth animation:
//   - Bottom half: static
//   - Top half: rotates on a hinge (pivot at bottom edge)
//
// Uses pre-split textures for performance.

"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { FaceSlot as FaceSlotType } from "@/types";
import { FaceAnimParams, opennessToRotation } from "@/lib/mouthMapper";

interface FaceSlotProps {
  slot: FaceSlotType;
  openness: number; // current mouth openness 0-1
  animParams: FaceAnimParams;
  elapsedTime: number;
}

const FACE_BASE_SIZE = 180; // base pixel size of a face
const SPLIT_RATIO = 0.55; // split at 55% from top

// Placeholder colors by row for visual variety
const ROW_COLORS = ["#4a1a6b", "#1a4a6b", "#1a6b3a", "#6b4a1a", "#6b1a1a"];

export default function FaceSlotComponent({
  slot,
  openness,
  animParams,
  elapsedTime,
}: FaceSlotProps) {
  const topRef = useRef<THREE.Group>(null);
  const [topTexture, setTopTexture] = useState<THREE.Texture | null>(null);
  const [bottomTexture, setBottomTexture] = useState<THREE.Texture | null>(null);

  const faceWidth = FACE_BASE_SIZE * slot.scale;
  const faceHeight = FACE_BASE_SIZE * slot.scale * 1.25; // faces are taller than wide
  const topHeight = faceHeight * SPLIT_RATIO;
  const bottomHeight = faceHeight * (1 - SPLIT_RATIO);

  // Load and split face image into top/bottom textures
  useEffect(() => {
    if (!slot.faceImage) {
      setTopTexture(null);
      setBottomTexture(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const splitY = Math.floor(img.height * SPLIT_RATIO);

      // Top half canvas
      const topCanvas = document.createElement("canvas");
      topCanvas.width = img.width;
      topCanvas.height = splitY;
      const topCtx = topCanvas.getContext("2d")!;
      topCtx.drawImage(img, 0, 0, img.width, splitY, 0, 0, img.width, splitY);
      const tTex = new THREE.CanvasTexture(topCanvas);
      tTex.minFilter = THREE.LinearFilter;
      tTex.magFilter = THREE.LinearFilter;
      setTopTexture(tTex);

      // Bottom half canvas
      const bottomCanvas = document.createElement("canvas");
      bottomCanvas.width = img.width;
      bottomCanvas.height = img.height - splitY;
      const bottomCtx = bottomCanvas.getContext("2d")!;
      bottomCtx.drawImage(
        img,
        0,
        splitY,
        img.width,
        img.height - splitY,
        0,
        0,
        img.width,
        img.height - splitY
      );
      const bTex = new THREE.CanvasTexture(bottomCanvas);
      bTex.minFilter = THREE.LinearFilter;
      bTex.magFilter = THREE.LinearFilter;
      setBottomTexture(bTex);
    };
    img.src = slot.faceImage;
  }, [slot.faceImage]);

  // Placeholder material (used when no face image loaded)
  const placeholderColor = ROW_COLORS[slot.row % ROW_COLORS.length];

  // Animate top half rotation
  useFrame(() => {
    if (!topRef.current) return;

    const delayedTime = Math.max(0, elapsedTime - animParams.delayMs / 1000);
    const rotation = opennessToRotation(openness, animParams, delayedTime);
    topRef.current.rotation.z = rotation;
  });

  if (!slot.occupied) return null;

  return (
    <group position={[slot.x, -slot.y, slot.row * 0.1]}>
      {/* Bottom half — static */}
      <mesh position={[0, -topHeight / 2 - bottomHeight / 2, 0]}>
        <planeGeometry args={[faceWidth, bottomHeight]} />
        {bottomTexture ? (
          <meshBasicMaterial map={bottomTexture} transparent />
        ) : (
          <meshBasicMaterial color={placeholderColor} />
        )}
      </mesh>

      {/* Top half — rotates (pivot at bottom edge) */}
      <group ref={topRef} position={[0, -topHeight / 2, 0.01]}>
        {/* Offset mesh so it rotates around its bottom edge */}
        <mesh position={[0, topHeight / 2, 0]}>
          <planeGeometry args={[faceWidth, topHeight]} />
          {topTexture ? (
            <meshBasicMaterial map={topTexture} transparent />
          ) : (
            <meshBasicMaterial
              color={placeholderColor}
              opacity={0.85}
              transparent
            />
          )}
        </mesh>
      </group>

      {/* Label (visible on zoom) */}
      {slot.label && (
        <mesh position={[0, -faceHeight / 2 - 15, 0.05]}>
          <planeGeometry args={[faceWidth, 20]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      )}
    </group>
  );
}
