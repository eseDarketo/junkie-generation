// ============================================================
// API Route: /api/faces — DEV B owns this file
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { addFace, getFaces } from '@/lib/faceStore';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const since = searchParams.get('since');
  const timestamp = since ? parseInt(since) : 0;
  
  return NextResponse.json({ faces: getFaces(timestamp) });
}

export async function POST(req: NextRequest) {
  try {
    const { image, name } = await req.json();
    if (!image) throw new Error('No image provided');
    
    addFace(image, name || 'Guest');
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Bad Request' }, { status: 400 });
  }
}
