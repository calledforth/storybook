"use client";

interface ComposeOptions {
  characterWidthRatio?: number;
  bottomPaddingRatio?: number;
  horizontalShiftRatio?: number;
  backgroundThreshold?: number;
}

const DEFAULT_OPTIONS: Required<ComposeOptions> = {
  characterWidthRatio: 0.42,
  bottomPaddingRatio: 0.06,
  horizontalShiftRatio: 0,
  backgroundThreshold: 240,
};

async function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read image data"));
    reader.readAsDataURL(blob);
  });
}

function normalizeSourceInput(source: string | Blob): { kind: "blob"; blob: Blob } | { kind: "string"; src: string } {
  if (source instanceof Blob) {
    return { kind: "blob", blob: source };
  }

  const src = String(source ?? "");
  return { kind: "string", src };
}

async function normalizeSource(source: string | Blob): Promise<string> {
  const normalized = normalizeSourceInput(source);

  if (normalized.kind === "blob") {
    return readBlobAsDataUrl(normalized.blob);
  }

  if (normalized.src.startsWith("data:") || normalized.src.startsWith("blob:")) {
    return normalized.src;
  }

  const response = await fetch(normalized.src, { mode: "cors" });
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }
  const blob = await response.blob();
  return readBlobAsDataUrl(blob);
}

async function loadImage(source: string | Blob): Promise<HTMLImageElement> {
  const resolvedSrc = await normalizeSource(source);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = resolvedSrc;
  });
}

function toDataUrl(canvas: HTMLCanvasElement) {
  return canvas.toDataURL("image/png");
}

// Legacy local background removal (unused now that we use Replicate)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function removeBackground(canvas: HTMLCanvasElement, threshold: number) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;
  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const { data } = imageData;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const isNearWhite = r > threshold && g > threshold && b > threshold;
    const maxChannel = Math.max(r, g, b);
    const minChannel = Math.min(r, g, b);
    const lowVariance = maxChannel - minChannel < 15;

    if (isNearWhite || lowVariance) {
      data[i + 3] = 0;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

export async function prepareSlideAssets(
  baseImage: string,
  characterImage: string,
  options: ComposeOptions = {},
) {
  const config = { ...DEFAULT_OPTIONS, ...options };

  const [base, character] = await Promise.all([
    loadImage(baseImage),
    loadImage(characterImage),
  ]);

  // Character image already has background removed by server
  // Just composite it onto the base
  const composedCanvas = document.createElement("canvas");
  composedCanvas.width = base.width;
  composedCanvas.height = base.height;
  const composedCtx = composedCanvas.getContext("2d");
  if (!composedCtx) {
    throw new Error("Unable to create drawing context");
  }

  composedCtx.drawImage(base, 0, 0, base.width, base.height);

  const targetWidth = base.width * config.characterWidthRatio;
  const aspectRatio = character.height / character.width;
  const targetHeight = targetWidth * aspectRatio;
  const x = (base.width - targetWidth) / 2 + base.width * config.horizontalShiftRatio;
  const y = base.height - targetHeight - base.height * config.bottomPaddingRatio;

  composedCtx.imageSmoothingEnabled = true;
  composedCtx.imageSmoothingQuality = "high";

  composedCtx.drawImage(character, x, y, targetWidth, targetHeight);

  const composedImage = toDataUrl(composedCanvas);

  return {
    characterImage, // Return the already-cleaned image from server
    composedImage,
  };
}


