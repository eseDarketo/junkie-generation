export function applyStyleFilter(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Faster pipeline mapping exactly to DEV B Specification
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i], g = data[i + 1], b = data[i + 2];

    // Remove white/light background
    const brightness = (r + g + b) / 3;
    if (brightness > 220) {
      data[i + 3] = 0; // Set transparent
      continue;
    }

    // Grayscale
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;

    // Contrast
    const contrastFactor = 1.5;
    let val = ((gray - 128) * contrastFactor) + 128;
    val = Math.max(0, Math.min(255, val));

    // Posterize
    const levels = 6;
    val = Math.round(val / (255 / levels)) * (255 / levels);

    // Minor tint adjustment
    data[i] = Math.min(255, val * 1.1);   // R
    data[i + 1] = Math.min(255, val * 0.9); // G
    data[i + 2] = Math.min(255, val * 0.7); // B
    data[i + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}
