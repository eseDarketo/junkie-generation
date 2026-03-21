// ============================================================
// audioAnalyzer — Vocal map lookup + Web Audio amplitude — DEV A
// ============================================================
// Primary mode: look up mouth cue from pre-processed vocal map JSON
// Fallback mode: extract RMS amplitude from Web Audio AnalyserNode

import type { MouthCue, VocalMap } from "@/types";

let cachedVocalMap: VocalMap | null = null;

/**
 * Load and cache the vocal map JSON
 */
export async function loadVocalMap(url: string): Promise<VocalMap> {
  if (cachedVocalMap) return cachedVocalMap;
  const res = await fetch(url);
  cachedVocalMap = await res.json();
  return cachedVocalMap!;
}

/**
 * Binary search for the mouth cue at a given time
 */
export function getMouthCueAtTime(
  cues: MouthCue[],
  time: number
): MouthCue | null {
  let low = 0;
  let high = cues.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const cue = cues[mid];

    if (time >= cue.start && time < cue.end) {
      return cue;
    } else if (time < cue.start) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  return null;
}

/**
 * Map a mouth shape letter (Rhubarb/Preston Blair) to an openness value (0-1)
 *
 * X = silence (closed)
 * A = closed mouth (M, B, P)
 * B = slightly open
 * C = open (EH, AH)
 * D = wide open (AA)
 * E = rounded (OH, OO)
 * F = upper teeth on lower lip (F, V)
 * G = teeth together (EE, S)
 * H = tongue visible (L, TH)
 */
export function mouthShapeToOpenness(shape: string): number {
  switch (shape) {
    case "X":
      return 0.0;
    case "A":
      return 0.05;
    case "B":
      return 0.25;
    case "C":
      return 0.55;
    case "D":
      return 0.9;
    case "E":
      return 0.5;
    case "F":
      return 0.3;
    case "G":
      return 0.2;
    case "H":
      return 0.35;
    default:
      return 0.0;
  }
}

/**
 * Fallback: extract RMS amplitude from a Web Audio AnalyserNode
 */
export function getAmplitude(analyser: AnalyserNode): number {
  const data = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(data);

  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    const normalized = (data[i] - 128) / 128;
    sum += normalized * normalized;
  }

  return Math.sqrt(sum / data.length);
}
