// ============================================================
// API Route: /api/identify — Server-side face matching
// ============================================================
// Receives a 128-dim face descriptor from the mobile client,
// compares against all stored guest descriptors server-side,
// and returns the best match (if any).
//
// The mobile client never downloads other guests' data.

import { NextRequest, NextResponse } from 'next/server';
import { getAllFaces } from '@/lib/faceStore';

const MATCH_THRESHOLD = 0.6;

function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const queryDescriptor: number[] | undefined = body.descriptor;

  if (
    !queryDescriptor ||
    !Array.isArray(queryDescriptor) ||
    queryDescriptor.length !== 128
  ) {
    return NextResponse.json(
      { match: null, error: 'Invalid descriptor: expected number[128]' },
      { status: 400 },
    );
  }

  const allFaces = getAllFaces();
  const facesWithDescriptors = allFaces.filter(
    (f) => f.descriptor && f.descriptor.length === 128,
  );

  if (facesWithDescriptors.length === 0) {
    return NextResponse.json({ match: null, guestCount: 0 });
  }

  let bestMatch: {
    id: string;
    distance: number;
    image: string;
    name?: string;
  } | null = null;

  for (const face of facesWithDescriptors) {
    const distance = euclideanDistance(queryDescriptor, face.descriptor!);
    if (
      distance < MATCH_THRESHOLD &&
      (!bestMatch || distance < bestMatch.distance)
    ) {
      bestMatch = { id: face.id, distance, image: face.image, name: face.name };
    }
  }

  return NextResponse.json({
    match: bestMatch
      ? { id: bestMatch.id, image: bestMatch.image, name: bestMatch.name }
      : null,
    guestCount: facesWithDescriptors.length,
  });
}
