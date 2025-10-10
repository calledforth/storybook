import { getReplicateClient } from "@/lib/replicate";

export async function runInpainting(params: {
  modelVersion: string;
  prompt: string;
  slideImageDataUrl: string;
  maskImageUrl: string;
  options?: {
    num_inference_steps?: number;
    guidance_scale?: number;
    output_format?: "webp" | "png" | "jpg";
    output_quality?: number;
    aspect_ratio?: string;
    megapixels?: "1" | "2" | "4";
    seed?: number;
    model?: string;
    go_fast?: boolean;
    lora_scale?: number;
    extra_lora_scale?: number;
    num_outputs?: number;
    prompt_strength?: number;
  };
}): Promise<string> {
  const replicate = getReplicateClient();

  // Upload slide image to Replicate Files API
  const base64 = params.slideImageDataUrl.includes(",")
    ? params.slideImageDataUrl.split(",")[1]
    : params.slideImageDataUrl;
  const buffer = Buffer.from(base64, "base64");
  const slideFile = await replicate.files.create(new Blob([buffer], { type: "image/png" }));

  const input: Record<string, unknown> = {
    prompt: params.prompt,
    image: slideFile.urls.get, // base image to be edited
    mask: params.maskImageUrl, // URL to black/white mask image
  };

  if (params.options) {
    const {
      num_inference_steps,
      guidance_scale,
      output_format,
      output_quality,
      aspect_ratio,
      megapixels,
      seed,
      model,
      go_fast,
      lora_scale,
      extra_lora_scale,
      num_outputs,
      prompt_strength,
    } = params.options;

    if (num_inference_steps !== undefined) input.num_inference_steps = num_inference_steps;
    if (guidance_scale !== undefined) input.guidance_scale = guidance_scale;
    if (output_format !== undefined) input.output_format = output_format;
    if (output_quality !== undefined) input.output_quality = output_quality;
    if (aspect_ratio !== undefined) input.aspect_ratio = aspect_ratio;
    if (megapixels !== undefined) input.megapixels = megapixels;
    if (seed !== undefined) input.seed = seed;
    if (model !== undefined) input.model = model;
    if (go_fast !== undefined) input.go_fast = go_fast;
    if (lora_scale !== undefined) input.lora_scale = lora_scale;
    if (extra_lora_scale !== undefined) input.extra_lora_scale = extra_lora_scale;
    if (num_outputs !== undefined) input.num_outputs = num_outputs;
    if (prompt_strength !== undefined) input.prompt_strength = prompt_strength;
  }

  const output = await replicate.run(
    params.modelVersion as `${string}/${string}` | `${string}/${string}:${string}`,
    { input },
  );

  // Normalize to single URL string
  if (typeof output === "string") return output;
  if (Array.isArray(output) && output.length > 0) {
    const first = output[0];
    if (!first) return String(first);
    if (typeof first === "string") return first;
    if (typeof first === "object") {
      const firstObj = first as Record<string, unknown>;
      if (typeof firstObj.url === "function") return (firstObj.url as () => string)();
      if (typeof firstObj.url === "string") return firstObj.url;
    }
    return String(first);
  }
  if (output && typeof output === "object" && "url" in output) {
    const outputObj = output as Record<string, unknown>;
    const urlAccessor = outputObj.url;
    if (typeof urlAccessor === "function") return (urlAccessor as () => string)();
    if (typeof urlAccessor === "string") return urlAccessor;
  }

  throw new Error("Unexpected inpainting output format");
}


