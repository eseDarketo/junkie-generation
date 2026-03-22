// ============================================================
// FaceStore: In-memory store for guest faces — DEV B
// ============================================================
// This is used by /api/faces and /api/identify handlers.
//
// ⚠️  IMPORTANT: We anchor the array to `globalThis` so that all
// route handlers share the SAME instance across Turbopack's
// per-module hot-reload boundaries. Without this, /api/faces
// (POST) and /api/faces/[id] (GET) each get an independent empty
// array and faces "disappear" between routes without a restart.

import type { StoredFace } from '@/types';

declare global {
  // eslint-disable-next-line no-var
  var __faceStore: StoredFace[] | undefined;
}

// Re-use the existing array across hot-reloads; create once on first load.
const faces: StoredFace[] =
  globalThis.__faceStore ?? (globalThis.__faceStore = []);

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
