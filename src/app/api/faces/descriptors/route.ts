// ============================================================
// API Route: /api/faces/descriptors — DEPRECATED
// ============================================================
// Matching is now done server-side via POST /api/identify.
// This endpoint is kept for backward compatibility but should
// not be used by new code.

import { getAllFaces } from '@/lib/faceStore';
import { NextResponse } from 'next/server';

export async function GET() {
  const allFaces = getAllFaces();

  const facesWithDescriptors = allFaces
    .filter((f) => f.descriptor && f.descriptor.length > 0)
    .map((f) => ({ id: f.id, descriptor: f.descriptor }));

  return NextResponse.json({ faces: facesWithDescriptors });
}
