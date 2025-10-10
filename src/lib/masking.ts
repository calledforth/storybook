import { getReplicateClient } from "@/lib/replicate";

/**
 * Generate a segmentation mask for a given slide image using Replicate.
 * Returns a URL to a black/white mask image suitable for inpainting.
 */
export async function generateMaskForSlide(
  slideImageDataUrl: string,
  instruction = "segment the child",
): Promise<string> {
  const replicate = getReplicateClient();

  // Convert data URL to Blob and upload to Replicate Files API
  const base64 = slideImageDataUrl.includes(",") ? slideImageDataUrl.split(",")[1] : slideImageDataUrl;
  const buffer = Buffer.from(base64, "base64");
  const slideFile = await replicate.files.create(new Blob([buffer], { type: "image/png" }));

  const output = await replicate.run(
    "bytedance/sa2va-8b-image:956baf05a8a81ab47f1d0dac8eab6585b899790f342975a964840c4e9c63c7aa" as `${string}/${string}:${string}`,
    {
      input: {
        image: slideFile.urls.get,
        instruction,
      },
    },
  );

  // Normalize to URL string for various Replicate SDK/model shapes
  if (typeof output === "string") return output;

  // Some models return an array of FileOutput objects/strings
  if (Array.isArray(output) && output.length > 0) {
    const first = output[0];
    if (!first) return String(first);
    if (typeof first === "string") return first;
    if (first && typeof first === "object") {
      const firstObj = first as Record<string, unknown>;
      if (typeof firstObj.url === "function") return (firstObj.url as () => string)();
      if (typeof firstObj.url === "string") return firstObj.url;
      if (typeof firstObj.img === "string") return firstObj.img;
    }
  }

  // Some models return an object like { img: "...", response: "..." }
  if (output && typeof output === "object") {
    const anyOut = output as Record<string, unknown>;
    if (typeof anyOut.img === "string") return anyOut.img;
    const outputObj = anyOut.output as Record<string, unknown> | undefined;
    if (outputObj && typeof outputObj.img === "string") return outputObj.img;

    // If the model returned a stream/blob for img, convert to a URL by re-uploading
    const streamLike = anyOut.img || (outputObj && outputObj.img);
    if (streamLike && typeof streamLike === "object") {
      try {
        // Prefer native arrayBuffer if present; otherwise wrap in Response
        const streamObj = streamLike as { arrayBuffer?: () => Promise<ArrayBuffer> };
        const arrayBuffer: ArrayBuffer = typeof streamObj.arrayBuffer === "function"
          ? await streamObj.arrayBuffer()
          : await new Response(streamLike as BodyInit).arrayBuffer();

        const blob = new Blob([arrayBuffer], { type: "image/png" });
        const file = await replicate.files.create(blob);
        return file.urls.get;
      } catch (e) {
        console.error("[masking] Failed to convert stream-like mask to URL", e);
      }
    }
    if (typeof anyOut.url === "function") return anyOut.url();
    if (typeof anyOut.url === "string") return anyOut.url;
  }

  console.error("[masking] Unexpected mask output format", output);
  throw new Error("Unexpected mask output format");
}


