// ============================================================
// FaceSlot — Individual face in the group photo — DEV A
// ============================================================
// Each face slot is TWO meshes (for Canadian mouth animation):
//   - Bottom half: static
//   - Top half: rotates on a hinge (pivot at bottom edge)
//
// Props should include the FaceSlot data + current amplitude.
// See SPEC.md § "LipSyncEngine" for the split/rotation logic.

'use client';

import { FaceAnimParams, opennessToRotation } from '@/lib/mouthMapper';
import { getSplitTextures } from '@/lib/textureCache';
import type { FaceSlot as FaceSlotType } from '@/types';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

const BODY_IMAGES = ['/bodies/suit-one.png', '/bodies/suit-two.png'];

interface FaceSlotProps {
  slot: FaceSlotType;
  openness: number;
  animParams: FaceAnimParams;
  elapsedTime: number;
}

const FACE_BASE_SIZE = 180;
const SPLIT_RATIO = 0.82; // 2/3 top, 1/3 bottom — cut at mouth level

export default function FaceSlotComponent({
  slot,
  openness,
  animParams,
  elapsedTime,
}: FaceSlotProps) {
  const topRef = useRef<THREE.Group>(null);
  const [topTexture, setTopTexture] = useState<THREE.Texture | null>(null);
  const [bottomTexture, setBottomTexture] = useState<THREE.Texture | null>(
    null,
  );
  const [bodyTexture, setBodyTexture] = useState<THREE.Texture | null>(null);
  const [loadKey, setLoadKey] = useState(0);

  // Deterministic body assignment based on slot id hash
  const bodyImage = useMemo(() => {
    const hash = slot.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return BODY_IMAGES[hash % BODY_IMAGES.length];
  }, [slot.id]);

  const faceWidth = FACE_BASE_SIZE * slot.scale;
  const faceHeight = FACE_BASE_SIZE * slot.scale;
  const bodyHeight = faceWidth; // 1:1 body image, same width as face
  const topHeight = faceHeight * SPLIT_RATIO;
  const bottomHeight = faceHeight * (1 - SPLIT_RATIO);

  useEffect(() => {
    if (!slot.faceImage) return;

    getSplitTextures(slot.faceImage)
      .then(({ top, bottom }) => {
        setTopTexture(top);
        setBottomTexture(bottom);
        setLoadKey((k) => k + 1);
      })
      .catch((err) => {
        console.error(err.message);
      });
  }, [slot.faceImage]);

  // Load body texture
  useEffect(() => {
    new THREE.TextureLoader().load(
      bodyImage,
      (tex) => {
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.needsUpdate = true;
        setBodyTexture(tex);
      },
      undefined,
      (err) => console.error('Body load failed:', bodyImage, err),
    );
  }, [bodyImage]);

  // Max hinge rotation in radians (~30 degrees fully open)
  const MAX_HINGE_ANGLE = 0.52;

  useFrame(() => {
    if (!topRef.current) return;

    const delayedTime = Math.max(0, elapsedTime - animParams.delayMs / 1000);
    const rotation = opennessToRotation(openness, animParams, delayedTime);
    const normalizedOpen = rotation / 0.44;
    const angle = normalizedOpen * MAX_HINGE_ANGLE;

    // Rotate around Z axis (hinge at bottom edge — top flips up like South Park mouth)
    topRef.current.rotation.z = -angle;
  });

  if (!slot.occupied) return null;

  return (
    <group position={[slot.x, -slot.y, 0]}>
      {/* Top half — rotates on hinge at bottom-right corner */}
      <group ref={topRef} position={[faceWidth / 2, -topHeight / 2, 0.01]}>
        {/* Mesh offset up and left so group origin is at bottom-right corner */}
        <mesh
          key={`top-${loadKey}`}
          position={[-faceWidth / 2, topHeight / 2, 0]}
        >
          <planeGeometry args={[faceWidth, topHeight]} />
          <meshBasicMaterial
            color={topTexture ? '#ffffff' : '#1a1a1a'}
            map={topTexture}
          />
        </mesh>
      </group>

      {/* Bottom half — static */}
      <mesh
        key={`bottom-${loadKey}`}
        position={[0, -topHeight / 2 - bottomHeight / 2, 0]}
      >
        <planeGeometry args={[faceWidth, bottomHeight]} />
        <meshBasicMaterial
          color={bottomTexture ? '#ffffff' : '#1a1a1a'}
          map={bottomTexture}
        />
      </mesh>

      {/* Body — sits below the face, overlaps slightly, behind head */}
      <mesh
        key={`body-${bodyTexture ? 'loaded' : 'pending'}`}
        position={[
          0,
          -topHeight / 2 - bottomHeight - bodyHeight / 2 + bottomHeight * 0.6,
          -0.01,
        ]}
      >
        <planeGeometry args={[faceWidth, bodyHeight]} />
        <meshBasicMaterial
          color={bodyTexture ? '#ffffff' : '#ff0000'}
          map={bodyTexture}
          transparent
        />
      </mesh>
    </group>
  );
}
