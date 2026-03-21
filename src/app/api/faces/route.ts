// ============================================================
// API Route: /api/faces — DEV B owns this file
// ============================================================

import { NextRequest, NextResponse } from "next/server";

// TODO (Dev B): Import from lib/faceStore and implement GET/POST handlers
// See SPEC.md § "Local API Routes" for the full contract.

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(req: NextRequest) {
  // TODO: return all faces, or faces since ?since=<timestamp>
  return NextResponse.json({ faces: [] });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(req: NextRequest) {
  // TODO: parse body, add face to store, return success
  return NextResponse.json({ success: true });
}
