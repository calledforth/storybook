import { StorySlide } from "@/data/storybooks";
import { generateSlidePrompt } from "@/lib/gemini";
import { runFineTunedModel, removeBackground } from "@/lib/replicateInference";
import { generateMaskForSlide } from "@/lib/masking";
import { runInpainting } from "@/lib/inpainting";

export interface SlideGenerationInput {
  slide: StorySlide;
  backgroundImage: string;
  triggerWord: string;
  modelVersion: string;
  storyContext?: string;
  guidance?: string;
}

export interface SlideGenerationResult {
  prompt: string;
  rationale?: string;
  generatedImages?: string[];
  cleanedImage?: string;
  compositedImage?: string;
}

export async function generateSlideCharacter(input: SlideGenerationInput): Promise<SlideGenerationResult> {
  const { slide, backgroundImage, storyContext, triggerWord } = input;
  const promptResult = await generateSlidePrompt({
    slideText: slide.description ?? slide.title,
    slideImage: backgroundImage,
    slideContext: storyContext,
    triggerWord,
  });

  const useInpainting = (process.env.USE_INPAINTING ?? process.env.NEXT_PUBLIC_USE_INPAINTING) !== "false";

  if (useInpainting) {
    console.log("[inferencePipeline] Using inpainting flow with mask generation");
    const maskUrl = await generateMaskForSlide(backgroundImage, "segment the child");
    console.log("[inferencePipeline] Mask generated");

    const compositedImage = await runInpainting({
      modelVersion: input.modelVersion,
      prompt: promptResult.prompt,
      slideImageDataUrl: backgroundImage,
      maskImageUrl: maskUrl,
      options: {
        num_inference_steps: 28,
        guidance_scale: 3,
        output_format: "webp",
        output_quality: 80,
        megapixels: "1",
        num_outputs: 1,
        prompt_strength: 0.8,
      },
    });

    return {
      prompt: promptResult.prompt,
      rationale: promptResult.rationale,
      compositedImage,
    };
  }

  // Legacy flow: character generation + background removal + client compositing
  const images = await runFineTunedModel({
    modelVersion: input.modelVersion,
    prompt: promptResult.prompt,
    options: {
      disableBackground: false,
    },
  });

  if (!images.length) {
    throw new Error("Fine-tuned model returned no images");
  }

  console.log("[inferencePipeline] Removing background from generated image");
  const cleanedImage = await removeBackground(images[0]);
  console.log("[inferencePipeline] Background removed successfully");

  return {
    prompt: promptResult.prompt,
    rationale: promptResult.rationale,
    generatedImages: images,
    cleanedImage,
  };
}


