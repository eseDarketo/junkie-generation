// ============================================================
// MusicPlayer — Audio playback + vocal map sync — DEV A
// ============================================================
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { VocalMap } from "@/types";
import { loadVocalMap, getMouthCueAtTime, mouthShapeToOpenness } from "@/lib/audioAnalyzer";

interface MusicPlayerProps {
  trackUrl: string;
  vocalMapUrl: string;
  onOpennessChange: (openness: number) => void;
  onTimeChange?: (time: number) => void;
}

export default function MusicPlayer({
  trackUrl,
  vocalMapUrl,
  onOpennessChange,
  onTimeChange,
}: MusicPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const vocalMapRef = useRef<VocalMap | null>(null);
  const animFrameRef = useRef<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Load vocal map
  useEffect(() => {
    loadVocalMap(vocalMapUrl).then((map) => {
      vocalMapRef.current = map;
      setIsLoaded(true);
    });
  }, [vocalMapUrl]);

  // Animation loop: read currentTime → lookup mouth cue → emit openness
  const tick = useCallback(() => {
    const audio = audioRef.current;
    const vocalMap = vocalMapRef.current;

    if (audio && vocalMap && !audio.paused) {
      const time = audio.currentTime;
      setCurrentTime(time);
      onTimeChange?.(time);

      const cue = getMouthCueAtTime(vocalMap.mouthCues, time);
      const openness = cue ? mouthShapeToOpenness(cue.value) : 0;
      onOpennessChange(openness);
    }

    animFrameRef.current = requestAnimationFrame(tick);
  }, [onOpennessChange, onTimeChange]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [tick]);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      await audio.play();
      setIsPlaying(true);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, []);

  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = Number(e.target.value);
      setCurrentTime(audio.currentTime);
    },
    []
  );

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm border-t border-white/10 px-6 py-3">
      <audio
        ref={audioRef}
        src={trackUrl}
        preload="auto"
        onLoadedMetadata={() => {
          if (audioRef.current) setDuration(audioRef.current.duration);
        }}
        onEnded={() => setIsPlaying(false)}
      />

      <div className="max-w-2xl mx-auto flex items-center gap-4">
        {/* Play/Pause button */}
        <button
          onClick={togglePlay}
          disabled={!isLoaded}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-black hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          {isPlaying ? (
            <svg width="14" height="16" viewBox="0 0 14 16" fill="currentColor">
              <rect x="1" y="1" width="4" height="14" rx="1" />
              <rect x="9" y="1" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg width="14" height="16" viewBox="0 0 14 16" fill="currentColor">
              <polygon points="2,1 13,8 2,15" />
            </svg>
          )}
        </button>

        {/* Time + seek bar */}
        <span className="text-xs text-gray-400 font-mono w-10 text-right flex-shrink-0">
          {formatTime(currentTime)}
        </span>

        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="flex-1 h-1 accent-white cursor-pointer"
        />

        <span className="text-xs text-gray-400 font-mono w-10 flex-shrink-0">
          {formatTime(duration)}
        </span>

        {/* Track info */}
        <div className="text-xs text-gray-500 flex-shrink-0 hidden sm:block">
          {isLoaded ? "The Real Slim Shady" : "Loading..."}
        </div>
      </div>
    </div>
  );
}
