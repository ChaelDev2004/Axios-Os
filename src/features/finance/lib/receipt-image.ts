export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageQuality {
  brightness: number;
  sharpness: number;
  isTooDark: boolean;
  isTooBright: boolean;
  isBlurry: boolean;
}

export interface PreparedImage {
  canvas: HTMLCanvasElement;
  quality: ImageQuality;
}

type DrawableSource = ImageBitmap | HTMLImageElement;

const OCR_MAX_SIDE = 2000;
const OCR_MIN_SIDE = 1200;
const STORAGE_MAX_SIDE = 1600;
const STORAGE_QUALITY = 0.8;
const DARK_THRESHOLD = 55;
const BRIGHT_THRESHOLD = 220;
const BLUR_THRESHOLD = 40;

export async function loadImage(blob: Blob): Promise<DrawableSource> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(blob, { imageOrientation: "from-image" });
    } catch {
      /* fall through to <img> decoding */
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function releaseImage(source: DrawableSource) {
  if ("close" in source) source.close();
}

function sourceSize(source: DrawableSource) {
  return "naturalWidth" in source
    ? { width: source.naturalWidth, height: source.naturalHeight }
    : { width: source.width, height: source.height };
}

function drawScaled(
  source: DrawableSource,
  maxSide: number,
  crop?: CropRect,
  minSide = 0
): HTMLCanvasElement {
  const { width, height } = sourceSize(source);
  const sx = crop ? Math.round(crop.x * width) : 0;
  const sy = crop ? Math.round(crop.y * height) : 0;
  const sw = crop ? Math.max(1, Math.round(crop.width * width)) : width;
  const sh = crop ? Math.max(1, Math.round(crop.height * height)) : height;

  const longest = Math.max(sw, sh);
  let scale = Math.min(1, maxSide / longest);
  if (minSide && longest < minSide) scale = minSide / longest;

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported on this device.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function toGrayscale(data: Uint8ClampedArray, length: number): Uint8ClampedArray {
  const gray = new Uint8ClampedArray(length);
  for (let i = 0, p = 0; i < length; i++, p += 4) {
    gray[i] = (data[p] * 299 + data[p + 1] * 587 + data[p + 2] * 114) / 1000;
  }
  return gray;
}

function percentile(histogram: Uint32Array, total: number, fraction: number): number {
  const target = total * fraction;
  let count = 0;
  for (let v = 0; v < 256; v++) {
    count += histogram[v];
    if (count >= target) return v;
  }
  return 255;
}

function laplacianVariance(gray: Uint8ClampedArray, width: number, height: number): number {
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const i = y * width + x;
      const lap = gray[i - width] + gray[i + width] + gray[i - 1] + gray[i + 1] - 4 * gray[i];
      sum += lap;
      sumSq += lap * lap;
      n++;
    }
  }
  if (!n) return 0;
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

function median3x3(src: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(src);
  const w = new Uint8Array(9);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      w[0] = src[i - width - 1];
      w[1] = src[i - width];
      w[2] = src[i - width + 1];
      w[3] = src[i - 1];
      w[4] = src[i];
      w[5] = src[i + 1];
      w[6] = src[i + width - 1];
      w[7] = src[i + width];
      w[8] = src[i + width + 1];
      w.sort();
      out[i] = w[4];
    }
  }
  return out;
}

export async function preprocessForOcr(blob: Blob, crop?: CropRect): Promise<PreparedImage> {
  const source = await loadImage(blob);
  try {
    const canvas = drawScaled(source, OCR_MAX_SIDE, crop, OCR_MIN_SIDE);
    const ctx = canvas.getContext("2d")!;
    const { width, height } = canvas;
    const image = ctx.getImageData(0, 0, width, height);
    const length = width * height;
    const gray = toGrayscale(image.data, length);

    const histogram = new Uint32Array(256);
    let total = 0;
    for (let i = 0; i < length; i++) {
      histogram[gray[i]]++;
      total += gray[i];
    }
    const brightness = total / length;
    const sharpness = laplacianVariance(gray, width, height);

    const low = percentile(histogram, length, 0.02);
    const high = percentile(histogram, length, 0.98);
    const range = Math.max(1, high - low);
    for (let i = 0; i < length; i++) {
      gray[i] = ((gray[i] - low) * 255) / range;
    }

    const cleaned = median3x3(gray, width, height);
    for (let i = 0, p = 0; i < length; i++, p += 4) {
      image.data[p] = image.data[p + 1] = image.data[p + 2] = cleaned[i];
      image.data[p + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);

    return {
      canvas,
      quality: {
        brightness,
        sharpness,
        isTooDark: brightness < DARK_THRESHOLD,
        isTooBright: brightness > BRIGHT_THRESHOLD,
        isBlurry: sharpness < BLUR_THRESHOLD,
      },
    };
  } finally {
    releaseImage(source);
  }
}

export function rotateCanvas180(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const rotated = document.createElement("canvas");
  rotated.width = canvas.width;
  rotated.height = canvas.height;
  const ctx = rotated.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported on this device.");
  ctx.translate(canvas.width, canvas.height);
  ctx.rotate(Math.PI);
  ctx.drawImage(canvas, 0, 0);
  return rotated;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = "image/jpeg", quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode image."))),
      type,
      quality
    );
  });
}

export async function compressForStorage(blob: Blob, crop?: CropRect): Promise<Blob> {
  const source = await loadImage(blob);
  try {
    return await canvasToBlob(drawScaled(source, STORAGE_MAX_SIDE, crop), "image/jpeg", STORAGE_QUALITY);
  } finally {
    releaseImage(source);
  }
}
