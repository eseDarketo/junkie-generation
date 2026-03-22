// ============================================================
// API Route: /api/faces — DEV B owns this file
// ============================================================

import {
  addFace,
  clearFaces,
  getAllFaces,
  getFacesSince,
} from '@/lib/faceStore';
import { NextRequest, NextResponse } from 'next/server';

// Prevent Next.js from caching API responses
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const since = req.nextUrl.searchParams.get('since');
  const faces = since ? getFacesSince(Number(since)) : getAllFaces();
  return NextResponse.json(
    { faces },
    {
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}

export async function DELETE() {
  clearFaces();
  return NextResponse.json({ success: true });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.image) {
      return NextResponse.json(
        { success: false, error: 'No image provided' },
        { status: 400 },
      );
    }

    const face = {
      id: body.id || crypto.randomUUID(),
      image: body.image,
      timestamp: Date.now(),
      name: body.name,
      descriptor: body.descriptor,
    };
    addFace(face);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Bad Request' },
      { status: 400 },
    );
  }
}
