// ============================================================
// FaceStore: In-memory store for guest faces — DEV B
// ===================================
// This is used by /api/faces POST/GET handlers.

export interface StoredFace {
  id: string;
  image: string; // base64
  name: string;
  timestamp: number;
}

// In-memory array (clears on server restart)
const faces: StoredFace[] = [];

export function addFace(image: string, name: string = 'Guest'): StoredFace {
  const newFace: StoredFace = {
    id: Math.random().toString(36).substring(2, 9),
    image,
    name,
    timestamp: Date.now(),
  };
  
  // Keep only last 50 to avoid memory bloat
  faces.unshift(newFace);
  if (faces.length > 50) faces.pop();
  
  return newFace;
}

export function getFaces(since?: number): StoredFace[] {
  if (!since) return faces;
  return faces.filter(f => f.timestamp > since);
}
