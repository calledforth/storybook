"use client";

import { StorySlide } from "@/data/storybooks";

export async function loadSlidesFromPdf(
  pdfUrl: string,
  slides: StorySlide[],
): Promise<Record<string, string>> {
  // Use the ESM API; Turbopack/Next supports this entry
  const { getDocument, GlobalWorkerOptions } = await import("pdfjs-dist");
  if (typeof window === "undefined") {
    return {};
  }

  if (!GlobalWorkerOptions.workerSrc) {
    GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
  }

  const loadingTask = getDocument(pdfUrl);
  const pdf = await loadingTask.promise;

  const slideImages: Record<string, string> = {};

  for (const slide of slides) {
    const page = await pdf.getPage(slide.pdfPage);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) {
      continue;
    }

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, canvas, viewport } as any).promise;

    slideImages[slide.id] = canvas.toDataURL("image/png");
  }

  return slideImages;
}
