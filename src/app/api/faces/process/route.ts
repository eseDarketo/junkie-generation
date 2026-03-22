// ============================================================
// API Route: /api/faces/process — Batch-process VIP face images
// ============================================================
// Receives a processed face image + filename and writes it to public/faces/

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';

export const dynamic = 'force-dynamic';

const ALLOWED_DIR = path.join(process.cwd(), 'public', 'faces');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { filename, image } = body;

    if (!filename || !image) {
      return NextResponse.json(
        { error: 'Missing filename or image' },
        { status: 400 },
      );
    }

    // Sanitize filename — only allow alphanumeric, hyphens, underscores, dots
    const safeName = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '');
    if (!safeName || safeName.startsWith('.')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    // Ensure output dir exists
    if (!existsSync(ALLOWED_DIR)) {
      mkdirSync(ALLOWED_DIR, { recursive: true });
    }

    // Strip data URL prefix if present
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const outputPath = path.join(ALLOWED_DIR, safeName);
    writeFileSync(outputPath, buffer);

    return NextResponse.json({ success: true, path: `/faces/${safeName}` });
  } catch {
    return NextResponse.json(
      { error: 'Failed to process image' },
      { status: 500 },
    );
  }
}

/** GET: List all face files in public/faces/ */
export async function GET() {
  try {
    const { readdirSync } = await import('fs');
    const files = readdirSync(ALLOWED_DIR).filter((f) =>
      /\.(png|jpg|jpeg|webp)$/i.test(f),
    );
    return NextResponse.json({ files });
  } catch {
    return NextResponse.json({ files: [] });
  }
}
