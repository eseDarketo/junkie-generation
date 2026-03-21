export function applyStyleFilter(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Faster pipeline mapping exactly to DEV B Specification
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i],
      g = data[i + 1],
      b = data[i + 2];

    // Softer background removal (avoid aliasing)
    const brightness = (r + g + b) / 3;
    if (brightness > 240) {
      data[i + 3] = 0; // Transparent for pure whites/overexposed
      continue;
    }

    // High Quality Weighted Grayscale
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;

    // Smoother Contrast Curve
    const contrastFactor = 1.25;
    let val = (gray - 128) * contrastFactor + 128;
    val = Math.max(0, Math.min(255, val));

    // High Quality Posterize (more levels for smoothness)
    const levels = 32;
    val = Math.round(val / (255 / (levels - 1))) * (255 / (levels - 1));

    // Balanced Monochromatic Tint (High Tech Cyan)
    data[i] = val * 0.9; // R
    data[i + 1] = val; // G
    data[i + 2] = val * 1.05; // B
    data[i + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}
