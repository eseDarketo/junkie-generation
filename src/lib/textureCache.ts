// ============================================================
// textureCache — Preloads and caches split face textures — DEV A
// ============================================================
import * as THREE from "three";

const SPLIT_RATIO = 0.82; // 2/3 top, 1/3 bottom — cut at mouth level

interface SplitTextures {
  top: THREE.Texture;
  bottom: THREE.Texture;
}

const cache = new Map<string, SplitTextures>();
const loading = new Map<string, Promise<SplitTextures>>();

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load: ${src}`));
    img.src = src;
  });
}

async function loadWithRetry(src: string, retries = 2): Promise<HTMLImageElement> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await loadImage(attempt === 0 ? src : `${src}?r=${attempt}`);
    } catch (e) {
      if (attempt === retries) throw e;
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(`Failed after retries: ${src}`);
}

function splitImage(img: HTMLImageElement): SplitTextures {
  const splitY = Math.floor(img.height * SPLIT_RATIO);

  const topCanvas = document.createElement("canvas");
  topCanvas.width = img.width;
  topCanvas.height = splitY;
  topCanvas.getContext("2d")!.drawImage(
    img, 0, 0, img.width, splitY, 0, 0, img.width, splitY
  );
  const topTex = new THREE.CanvasTexture(topCanvas);
  topTex.minFilter = THREE.LinearFilter;
  topTex.magFilter = THREE.LinearFilter;

  const bottomCanvas = document.createElement("canvas");
  bottomCanvas.width = img.width;
  bottomCanvas.height = img.height - splitY;
  bottomCanvas.getContext("2d")!.drawImage(
    img, 0, splitY, img.width, img.height - splitY,
    0, 0, img.width, img.height - splitY
  );
  const bottomTex = new THREE.CanvasTexture(bottomCanvas);
  bottomTex.minFilter = THREE.LinearFilter;
  bottomTex.magFilter = THREE.LinearFilter;

  return { top: topTex, bottom: bottomTex };
}

/**
 * Get split textures for a face image URL.
 * Results are cached — same URL always returns the same textures.
 */
export function getSplitTextures(src: string): Promise<SplitTextures> {
  // Return from cache immediately if available
  const cached = cache.get(src);
  if (cached) return Promise.resolve(cached);

  // Return in-flight promise if already loading
  const inflight = loading.get(src);
  if (inflight) return inflight;

  // Start loading
  const promise = loadWithRetry(src).then((img) => {
    const textures = splitImage(img);
    cache.set(src, textures);
    loading.delete(src);
    return textures;
  }).catch((err) => {
    loading.delete(src);
    throw err;
  });

  loading.set(src, promise);
  return promise;
}

/**
 * Preload a list of image URLs sequentially to avoid overwhelming the browser.
 */
export async function preloadFaces(urls: string[]): Promise<void> {
  const unique = urls.filter((url, i) => urls.indexOf(url) === i);
  // Load sequentially to avoid overwhelming browser
  for (const url of unique) {
    try {
      await getSplitTextures(url);
    } catch (err) {
      console.error("Preload failed:", url, err);
    }
  }
}
