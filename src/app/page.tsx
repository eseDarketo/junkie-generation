// ============================================================
// Landing / Admin Page — DEV A owns this file
// ============================================================

import { APP_VERSION } from '@/lib/version';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="text-center space-y-8">
        <h1 className="text-6xl font-bold tracking-tight">Junkie Generation</h1>
        <p className="text-xl text-gray-400">
          Real-Time Singing Group Photo Installation
        </p>

        <div className="flex gap-6 justify-center mt-8">
          <Link
            href="/display"
            className="px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition"
          >
            Open Display
          </Link>
          <Link
            href="/capture"
            className="px-6 py-3 border border-white font-semibold rounded-lg hover:bg-white hover:text-black transition"
          >
            Open Capture Station
          </Link>
          <Link
            href="/identify"
            className="px-6 py-3 border border-white font-semibold rounded-lg hover:bg-white hover:text-black transition"
          >
            Find Yourself
          </Link>
        </div>

        <div className="mt-12 text-sm text-gray-600 space-y-1">
          <p>
            <code>/display</code> — Main screen (Three.js scene + lip-sync)
          </p>
          <p>
            <code>/capture</code> — Webcam station (face detection + capture)
          </p>
          <p>
            <code>/identify</code> — Find yourself via camera
          </p>
          <p>
            <code>/share/[id]</code> — Individual avatar share page
          </p>
        </div>

        <div className="mt-16 pt-6 border-t border-gray-800 text-xs text-gray-700">
          <p>Version: {APP_VERSION}</p>
        </div>
      </div>
    </main>
  );
}
