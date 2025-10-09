import { StorySlide } from "@/data/storybooks";
import { generateSlidePrompt } from "@/lib/gemini";
import { runFineTunedModel, removeBackground } from "@/lib/replicateInference";

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
  generatedImages: string[];
  cleanedImage: string;
}

export async function generateSlideCharacter(input: SlideGenerationInput): Promise<SlideGenerationResult> {
  const { slide, backgroundImage, storyContext, triggerWord } = input;
  const promptResult = await generateSlidePrompt({
    slideText: slide.description ?? slide.title,
    slideImage: backgroundImage,
    slideContext: storyContext,
    triggerWord,
  });

  const images = await runFineTunedModel({
    modelVersion: input.modelVersion,
    prompt: promptResult.prompt,
    options: {
      disableBackground: false, // Don't use Flux's remove_background since it doesn't exist
    },
  });

  if (!images.length) {
    throw new Error("Fine-tuned model returned no images");
  }

  // Remove background using dedicated Replicate model
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


