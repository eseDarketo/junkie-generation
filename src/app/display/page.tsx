// ============================================================
// /display — Main Display Screen — DEV A owns this file
// ============================================================
'use client';

import MusicPlayer from '@/components/MusicPlayer';
import dynamic from 'next/dynamic';
import { useCallback, useMemo, useState } from 'react';

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

const SONGS = [
  {
    id: 'the-real',
    label: 'The Real Slim Shady',
    track: '/music/the-real-slim-shady.mp3',
    vocalMap: '/music/the-real-vocals.json',
  },
  {
    id: 'last',
    label: 'Last Nite',
    track: '/music/last.mp3',
    vocalMap: '/music/last-vocals.json',
  },
];

export default function DisplayPage() {
  const [openness, setOpenness] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [songId, setSongId] = useState(SONGS[0].id);

  const currentSong = useMemo(
    () => SONGS.find((s) => s.id === songId)!,
    [songId],
  );

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
        key={songId}
        trackUrl={currentSong.track}
        vocalMapUrl={currentSong.vocalMap}
        onOpennessChange={handleOpennessChange}
        onTimeChange={handleTimeChange}
        songSelector={
          <select
            value={songId}
            onChange={(e) => setSongId(e.target.value)}
            className="bg-white/10 text-white text-xs rounded px-2 py-1 border border-white/20 cursor-pointer outline-none"
          >
            {SONGS.map((s) => (
              <option key={s.id} value={s.id} className="bg-black text-white">
                {s.label}
              </option>
            ))}
          </select>
        }
      />
    </main>
  );
}
