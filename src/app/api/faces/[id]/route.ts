// ============================================================
// API Route: /api/faces/[id] — Get a single face by ID
// ============================================================

import { getFaceById } from '@/lib/faceStore';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const face = getFaceById(id);

  if (!face) {
    return NextResponse.json({ error: 'Face not found' }, { status: 404 });
  }

  return NextResponse.json(
    { face },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
