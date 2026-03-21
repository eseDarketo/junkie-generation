// ============================================================
// Starburst — Art deco radiating rays driven by audio
// ============================================================
"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SCENE_WIDTH, SCENE_HEIGHT } from "@/lib/faceSlots";

interface StarburstProps {
  openness: number;
}

const NUM_RAYS = 24;
const RAY_LENGTH = Math.max(SCENE_WIDTH, SCENE_HEIGHT) * 1.2;
const BASE_THIN_WIDTH = 0.025;
const BASE_THICK_WIDTH = 0.05;
const MAX_WIDTH_BOOST = 0.04; // how much thicker rays get at full openness

export default function Starburst({ openness }: StarburstProps) {
  const groupRef = useRef<THREE.Group>(null);
  const raysRef = useRef<THREE.Mesh[]>([]);
  const smoothOpenness = useRef(0);

  // Pre-compute ray angles
  const rayConfigs = useMemo(() => {
    return Array.from({ length: NUM_RAYS }, (_, i) => ({
      angle: (i / NUM_RAYS) * Math.PI * 2,
      isThick: i % 2 === 0,
    }));
  }, []);

  // Rebuild ray geometry for a given angle width
  const buildRayShape = (angle: number, halfWidth: number) => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(
      Math.cos(angle - halfWidth) * RAY_LENGTH,
      Math.sin(angle - halfWidth) * RAY_LENGTH
    );
    shape.lineTo(
      Math.cos(angle + halfWidth) * RAY_LENGTH,
      Math.sin(angle + halfWidth) * RAY_LENGTH
    );
    shape.lineTo(0, 0);
    return new THREE.ShapeGeometry(shape);
  };

  useFrame((state) => {
    if (!groupRef.current) return;

    const time = state.clock.elapsedTime;

    // Smooth interpolation toward target openness (like CSS transition)
    const lerpSpeed = 0.08; // lower = smoother/slower, higher = snappier
    smoothOpenness.current += (openness - smoothOpenness.current) * lerpSpeed;
    const smooth = smoothOpenness.current;

    // Steady rotation speed
    groupRef.current.rotation.z = time * 0.05;

    // Update each ray: opacity + thickness
    raysRef.current.forEach((mesh, i) => {
      if (!mesh) return;
      const { isThick, angle } = rayConfigs[i];
      const material = mesh.material as THREE.MeshBasicMaterial;

      // Opacity: low base, increases with smoothed openness
      const baseOpacity = isThick ? 0.05 : 0.025;
      const maxOpacity = isThick ? 0.25 : 0.15;
      material.opacity = baseOpacity + smooth * (maxOpacity - baseOpacity);

      // Thickness: smoothly interpolated
      const baseWidth = isThick ? BASE_THICK_WIDTH : BASE_THIN_WIDTH;
      const currentWidth = baseWidth + smooth * MAX_WIDTH_BOOST;
      mesh.geometry.dispose();
      mesh.geometry = buildRayShape(angle, currentWidth);
    });
  });

  // Initial geometries
  const initialGeometries = useMemo(() => {
    return rayConfigs.map(({ angle, isThick }) => {
      const baseWidth = isThick ? BASE_THICK_WIDTH : BASE_THIN_WIDTH;
      return buildRayShape(angle, baseWidth);
    });
  }, [rayConfigs]);

  return (
    <group
      ref={groupRef}
      position={[SCENE_WIDTH / 2, -SCENE_HEIGHT / 2, -0.5]}
    >
      {rayConfigs.map(({ isThick }, i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) raysRef.current[i] = el;
          }}
          geometry={initialGeometries[i]}
        >
          <meshBasicMaterial
            color="#000000"
            transparent
            opacity={isThick ? 0.05 : 0.025}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}
