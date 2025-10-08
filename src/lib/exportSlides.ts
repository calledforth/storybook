"use client";

import { PDFDocument, rgb } from "pdf-lib";
import { SlideData } from "@/store/slides";

async function getImageBytesAndType(src: string): Promise<{ bytes: Uint8Array; mime: string }> {
  // Handle data URLs explicitly
  if (src.startsWith("data:")) {
    const match = /^data:([^;]+);base64,(.*)$/i.exec(src);
    if (!match) throw new Error("Unsupported data URL");
    const mime = match[1].toLowerCase();
    const base64 = match[2];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return { bytes, mime };
  }

  // Fallback to fetch and use Blob type
  const res = await fetch(src);
  const blob = await res.blob();
  const mime = (blob.type || res.headers.get("Content-Type") || "image/png").toLowerCase();
  const buffer = await blob.arrayBuffer();
  return { bytes: new Uint8Array(buffer), mime };
}

export async function exportSlidesToPdf(slides: SlideData[]): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();

  for (const slide of slides) {
    const imageData = slide.resultImage ?? slide.baseImage;
    if (!imageData) continue;

    const { bytes, mime } = await getImageBytesAndType(imageData);

    const image = mime.includes("png")
      ? await pdfDoc.embedPng(bytes)
      : await pdfDoc.embedJpg(bytes);

    const { width, height } = image.scale(1);
    const page = pdfDoc.addPage([width, height]);

    // Draw the image directly on the page
    page.drawImage(image, {
      x: 0,
      y: 0,
      width,
      height,
    });

    // Optional border (invisible for now but keeps parity with previous intent)
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      borderColor: rgb(0.1, 0.1, 0.1),
      borderWidth: 0,
    });
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: "application/pdf" });
}
