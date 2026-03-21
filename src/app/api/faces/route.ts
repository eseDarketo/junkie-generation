// ============================================================
// API Route: /api/faces — DEV B owns this file
// ============================================================

import { addFace, getAllFaces, getFacesSince } from '@/lib/faceStore';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const since = req.nextUrl.searchParams.get('since');
  const faces = since ? getFacesSince(Number(since)) : getAllFaces();
  return NextResponse.json({ faces });
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

    addFace({
      id: body.id || crypto.randomUUID(),
      image: body.image,
      timestamp: Date.now(),
      name: body.name,
      descriptor: body.descriptor,
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Bad Request' },
      { status: 400 },
    );
  }
}
