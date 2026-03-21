// ============================================================
// LipSyncEngine — Manages per-face animation params — DEV A
// ============================================================
// Not a visual component. This is a hook that generates and
// manages per-face animation parameters (enthusiasm, delay, idle phase).
// The actual rendering happens in FaceSlot.

"use client";

import { useRef, useMemo } from "react";
import { FaceAnimParams, generateAnimParams } from "@/lib/mouthMapper";

/**
 * Hook that generates and caches animation parameters for each face slot.
 * Returns a function to get params by slot ID.
 */
export function useLipSyncParams() {
  const paramsMapRef = useRef<Map<string, FaceAnimParams>>(new Map());

  const getParamsForSlot = useMemo(
    () => (slotId: string): FaceAnimParams => {
      let params = paramsMapRef.current.get(slotId);
      if (!params) {
        params = generateAnimParams();
        paramsMapRef.current.set(slotId, params);
      }
      return params;
    },
    []
  );

  return getParamsForSlot;
}
