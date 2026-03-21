// ============================================================
// faceSlots — Pre-defined face positions in the scene — DEV A
// ============================================================
// 45 slots across 5 rows, graduation photo layout.
// Scene canvas is 4000x2000 pixels.
// Back rows smaller, front rows larger. Slight random offsets.

import type { FaceSlot } from "@/types";

const SCENE_WIDTH = 4000;
const SCENE_HEIGHT = 2000;

// Pre-loaded famous faces (VIPs)
export const VIP_FACES: Array<{ file: string; label: string }> = [
  { file: "/faces/vip-bad-bunny-compressed.jpg", label: "Bad Bunny" },
  { file: "/faces/vip-david-bowie-compressed.jpg", label: "David Bowie" },
  { file: "/faces/vip-dua-compressed.jpg", label: "Dua Lipa" },
  { file: "/faces/vip-lio-messi-compressed.jpg", label: "Lio Messi" },
  { file: "/faces/vip-nina-simone-compressed.jpg", label: "Nina Simone" },
  { file: "/faces/vip-rick-rubin-compressed.jpg", label: "Rick Rubin" },
  { file: "/faces/vip-til-compressed.jpg", label: "Til" },
  { file: "/faces/vip-ye-compressed.jpeg", label: "Ye" },
];

// Generic placeholder face for empty slots
export const DUMMY_FACE = "/faces/dummy-face-compressed.jpeg";

// Row configurations: [y position (0-1), scale, number of faces]
const ROW_CONFIG: Array<{ y: number; scale: number; count: number }> = [
  { y: 0.12, scale: 0.55, count: 8 },  // Row 0: back row (smallest)
  { y: 0.28, scale: 0.65, count: 7 },  // Row 1
  { y: 0.46, scale: 0.75, count: 7 },  // Row 2: middle
  { y: 0.65, scale: 0.88, count: 6 },  // Row 3
  { y: 0.85, scale: 1.0, count: 6 },   // Row 4: front row (largest)
];

// Deterministic pseudo-random offset based on slot index
function seededOffset(index: number, range: number): number {
  const sin = Math.sin(index * 127.1 + 311.7);
  return (sin - Math.floor(sin)) * range * 2 - range;
}

/**
 * Generate all face slot positions
 */
export function generateSlots(): FaceSlot[] {
  const slots: FaceSlot[] = [];
  let slotIndex = 0;

  for (let row = 0; row < ROW_CONFIG.length; row++) {
    const config = ROW_CONFIG[row];
    const count = config.count;

    for (let col = 0; col < count; col++) {
      // Distribute evenly with padding on edges
      const xNorm = (col + 1) / (count + 1);
      const xOffset = seededOffset(slotIndex, 30); // ±30px jitter
      const yOffset = seededOffset(slotIndex + 100, 15); // ±15px jitter

      slots.push({
        id: `slot-${row}-${col}`,
        x: xNorm * SCENE_WIDTH + xOffset,
        y: config.y * SCENE_HEIGHT + yOffset,
        scale: config.scale + seededOffset(slotIndex + 200, 0.03), // slight scale variation
        row,
        occupied: false,
        isFamous: false,
        animationMode: "canadian",
      });

      slotIndex++;
    }
  }

  return slots;
}

/**
 * Find the next empty slot (prefer front rows first for guests)
 */
export function findEmptySlot(slots: FaceSlot[]): FaceSlot | null {
  // Search from front row (row 4) to back row (row 0) for guest placement
  for (let row = ROW_CONFIG.length - 1; row >= 0; row--) {
    const empty = slots.find((s) => s.row === row && !s.occupied);
    if (empty) return empty;
  }
  return null;
}

export { SCENE_WIDTH, SCENE_HEIGHT };
