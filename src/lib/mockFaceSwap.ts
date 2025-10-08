"use client";

import { SlideData } from "@/store/slides";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Temporary placeholder for the face-swap pipeline.
 *
 * When integrating Replicate:
 * 1. Scaffold a client via `npx create-replicate --model=cdingram/face-swap`.
 * 2. Move the generated helper into `src/lib/replicateClient.ts` (or similar).
 * 3. Replace this mock with a call to `replicate.run()` using the slide base image
 *    and the uploaded user portrait as inputs.
 */
export async function mockFaceSwap(
  slide: SlideData,
  _userImage: string | null,
): Promise<string> {
  await delay(1200);
  if (!slide.baseImage) {
    throw new Error("Missing base image");
  }

  return slide.baseImage;
}
