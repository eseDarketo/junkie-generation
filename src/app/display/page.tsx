// ============================================================
// /display — Main Display Screen — DEV A owns this file
// ============================================================
'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import MusicPlayer from '@/components/MusicPlayer';

// Dynamic import for Three.js (no SSR)
const SceneRenderer = dynamic(() => import('@/components/SceneRenderer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen bg-black flex items-center justify-center">
      <div className="text-white/30 text-2xl animate-pulse">
        Loading scene...
      </div>
    </div>
  ),
});

export default function DisplayPage() {
  const [openness, setOpenness] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const handleOpennessChange = useCallback((value: number) => {
    setOpenness(value);
  }, []);

  const handleTimeChange = useCallback((time: number) => {
    setElapsedTime(time);
  }, []);

  return (
    <main className="w-screen h-screen bg-black overflow-hidden">
      {/* Three.js scene — full screen */}
      <div className="w-full h-full">
        <SceneRenderer openness={openness} elapsedTime={elapsedTime} />
      </div>

      {/* Music player bar — fixed at bottom */}
      <MusicPlayer
        trackUrl="/music/the-real-slim-shady.mp3"
        vocalMapUrl="/music/the-real-vocals.json"
        onOpennessChange={handleOpennessChange}
        onTimeChange={handleTimeChange}
      />
    </main>
  );
}
