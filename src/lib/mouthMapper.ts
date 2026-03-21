// ============================================================
// mouthMapper — Maps openness to animation params — DEV A
// ============================================================
// For Canadian mode: openness (0-1) → rotation angle in radians
// Each face has per-face enthusiasm and delay for variety.

const MAX_ANGLE_DEGREES = 25;
const MAX_ANGLE_RAD = (MAX_ANGLE_DEGREES * Math.PI) / 180;

// Idle wobble parameters
const IDLE_AMPLITUDE_DEG = 1.5;
const IDLE_AMPLITUDE_RAD = (IDLE_AMPLITUDE_DEG * Math.PI) / 180;

export interface FaceAnimParams {
  enthusiasmFactor: number; // 0.6-1.0
  delayMs: number; // 50-300ms
  idlePhase: number; // random starting phase for idle wobble
}

/**
 * Generate random animation parameters for a face slot
 */
export function generateAnimParams(): FaceAnimParams {
  return {
    enthusiasmFactor: 0.6 + Math.random() * 0.4,
    delayMs: 50 + Math.random() * 250,
    idlePhase: Math.random() * Math.PI * 2,
  };
}

/**
 * Map openness (0-1) to rotation angle in radians for Canadian mouth
 * Applies per-face enthusiasm and idle wobble
 */
export function opennessToRotation(
  openness: number,
  params: FaceAnimParams,
  timeSeconds: number
): number {
  // Apply enthusiasm factor
  const adjustedOpenness = openness * params.enthusiasmFactor;

  // Base rotation from openness
  const baseRotation = adjustedOpenness * MAX_ANGLE_RAD;

  // Add subtle idle wobble when mouth is mostly closed
  const idleStrength = 1 - adjustedOpenness; // stronger when mouth is closed
  const idleWobble =
    Math.sin(timeSeconds * 2.5 + params.idlePhase) *
    IDLE_AMPLITUDE_RAD *
    idleStrength;

  return baseRotation + idleWobble;
}

/**
 * Map openness to mouth sprite index (0-5) for Sprite mode
 */
export function opennessToSpriteIndex(openness: number): number {
  if (openness < 0.1) return 0; // closed
  if (openness < 0.25) return 1; // slightly open
  if (openness < 0.45) return 2; // open
  if (openness < 0.65) return 3; // wide
  if (openness < 0.85) return 4; // oh-shape
  return 5; // smile/singing
}
