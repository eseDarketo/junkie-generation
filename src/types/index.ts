// ============================================================
// SHARED TYPES — Both Dev A and Dev B depend on these.
// Coordinate changes with both devs before modifying.
// ============================================================

export interface StoredFace {
  id: string;
  image: string; // Base64 PNG, cropped & filtered face
  timestamp: number;
  name?: string; // Optional, for famous faces
}

export interface FaceSlot {
  id: string;
  x: number; // X position on canvas (pixels)
  y: number; // Y position on canvas (pixels)
  scale: number; // Size multiplier (front row bigger, back row smaller)
  row: number; // Which row (for depth/overlap ordering)
  occupied: boolean;
  faceImage?: string; // Base64 or URL of the face image
  isFamous: boolean; // Pre-loaded celebrity vs. party guest
  label?: string; // Name (for famous faces, shown on hover/zoom)
  animationMode: 'canadian' | 'sprite';
}

export interface CameraKeyframe {
  x: number; // center X on the canvas (0-1 normalized)
  y: number; // center Y on the canvas (0-1 normalized)
  zoom: number; // 1 = full scene, 3 = close-up on a few faces
  duration: number; // seconds to interpolate to this keyframe
}

// API contract:
// POST /api/faces  — body: { image: string, name?: string }
//                  — response: { success: true }
// GET  /api/faces  — query: ?since=<timestamp> (optional)
//                  — response: { faces: StoredFace[] }
