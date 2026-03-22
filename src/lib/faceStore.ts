// ============================================================
// FaceStore: In-memory store for guest faces — DEV B
// ============================================================
// This is used by /api/faces and /api/identify handlers.

import type { StoredFace } from '@/types';

// In-memory array (clears on server restart)
const faces: StoredFace[] = [];

export function addFace(face: StoredFace) {
  // Keep only last 50 to avoid memory bloat
  faces.unshift(face);
  if (faces.length > 50) faces.pop();
}

export function getAllFaces(): StoredFace[] {
  return faces;
}

export function getFaces(since?: number): StoredFace[] {
  if (!since) return faces;
  return faces.filter((f) => f.timestamp > since);
}

export function getFacesSince(timestamp: number): StoredFace[] {
  return faces.filter((f) => f.timestamp > timestamp);
}

export function getFaceById(id: string): StoredFace | undefined {
  return faces.find((f) => f.id === id);
}

export function clearFaces(): void {
  faces.length = 0;
}
