import { getReplicateClient } from "@/lib/replicate";

interface RunFineTunedModelParams {
  modelVersion: string;
  prompt: string;
  options?: {
    guidanceScale?: number;
    numInferenceSteps?: number;
    width?: number;
    height?: number;
    seed?: number;
    disableBackground?: boolean;
  };
}

export async function runFineTunedModel(params: RunFineTunedModelParams) {
  const replicate = getReplicateClient();
  const input: Record<string, unknown> = {
    prompt: params.prompt,
  };

  if (params.options?.guidanceScale !== undefined) {
    input.guidance = params.options.guidanceScale;
  }
  if (params.options?.numInferenceSteps !== undefined) {
    input.num_inference_steps = params.options.numInferenceSteps;
  }
  if (params.options?.width !== undefined) {
    input.width = params.options.width;
  }
  if (params.options?.height !== undefined) {
    input.height = params.options.height;
  }
  if (params.options?.seed !== undefined) {
    input.seed = params.options.seed;
  }
  if (params.options?.disableBackground) {
    input.remove_background = true;
  }

  console.log("[replicateInference] Running model:", params.modelVersion);
  console.log("[replicateInference] Input:", input);
  
  const output = await replicate.run(params.modelVersion, { input });
  
  console.log("[replicateInference] Raw output:", output);
  console.log("[replicateInference] Output type:", typeof output);

  // Handle array of FileOutput objects (most common for Flux models)
  if (Array.isArray(output)) {
    console.log("[replicateInference] Got array of", output.length, "items");
    const urls = output.map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "url" in item) {
        return typeof item.url === "function" ? item.url() : item.url;
      }
      return String(item);
    });
    console.log("[replicateInference] Extracted URLs:", urls);
    return urls;
  }

  // Handle single FileOutput object
  if (output && typeof output === "object" && "url" in output) {
    const url = typeof output.url === "function" ? output.url() : output.url;
    console.log("[replicateInference] Single FileOutput, extracted URL:", url);
    return [url];
  }

  // Handle direct string URL
  if (typeof output === "string") {
    console.log("[replicateInference] Direct string URL");
    return [output];
  }

  console.error("[replicateInference] Unexpected output format:", output);
  throw new Error("Unexpected inference output format");
}

export async function removeBackground(imageUrl: string): Promise<string> {
  const replicate = getReplicateClient();
  
  console.log("[removeBackground] Processing image:", imageUrl);
  
  const output = await replicate.run("lucataco/remove-bg:95fcc2a26d3899cd6c2691c900465aaeff466285a65c14638cc5f36f34befaf1", {
    input: {
      image: imageUrl,
    },
  });

  console.log("[removeBackground] Raw output:", output);

  // Handle FileOutput object
  if (output && typeof output === "object" && "url" in output) {
    const url = typeof output.url === "function" ? output.url() : output.url;
    console.log("[removeBackground] Extracted URL:", url);
    return url;
  }

  // Handle direct string URL
  if (typeof output === "string") {
    console.log("[removeBackground] Direct string URL");
    return output;
  }

  console.error("[removeBackground] Unexpected output format:", output);
  throw new Error("Unexpected background removal output format");
}



