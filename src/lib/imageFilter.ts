// ============================================================
// imageFilter — Canvas-based style filters — DEV B
// ============================================================
// Filter pipeline:
//   0. Remove white/light background (brightness > 220 → transparent)
//   1. Convert to grayscale
//   2. Increase contrast (factor ~1.4-1.6)
//   3. Posterize (6 levels)
//   4. Optional: warm/sepia tint
//
// IMPORTANT: Same filter for BOTH famous faces AND guest captures.
// See SPEC.md § "imageFilter.ts" for full implementation details.

// TODO (Dev B): Implement applyStyleFilter function
