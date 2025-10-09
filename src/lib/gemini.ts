import {
  GoogleGenerativeAI,
  type GenerateContentResponse,
} from "@google/generative-ai";

import { env } from "@/env";

const GEMINI_MODEL = "gemini-2.5-flash";

export interface GeminiPromptRequest {
  slideText: string;
  slideImage: string;
  slideContext?: string;
  triggerWord: string;
  guidance?: string;
}

export interface GeminiPromptResult {
  prompt: string;
  rationale?: string;
  raw: GenerateContentResponse; 
}

const client = new GoogleGenerativeAI(env.GEMINI_API_KEY);

const responseJsonSchema = {
  type: "object",
  properties: {
    prompt: {
      type: "string",
      description:
        "Image generation prompt referencing the trigger word and matching the slide style",
    },
    rationale: {
      type: "string",
      description: "Brief explanation of how the prompt matches the slide",
    },
  },
  required: ["prompt"],
} as const;

export async function generateSlidePrompt(request: GeminiPromptRequest): Promise<GeminiPromptResult> {
  const model = client.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: { 
      responseMimeType: "application/json",
      responseJsonSchema,
    },
  });

  const { slideText, slideImage, slideContext, triggerWord, guidance } = request;

  const systemPrompt = `You are creating a photorealistic image generation prompt for a personalized storybook application.

APPLICATION CONTEXT:
- This is a storybook application where users upload photos of a real person (child/adult)
- The system trains a custom AI model on those photos using the trigger word "${triggerWord}"
- The storybook slides show cartoon/illustrated characters in various scenes
- Your task: Generate a prompt to create a PHOTOREALISTIC IMAGE of the real person (${triggerWord}) performing the same action as the cartoon character in the slide
- The final output will composite this realistic photo onto the storybook background

CRITICAL REQUIREMENTS:
1. OUTPUT MUST BE PHOTOREALISTIC - NOT cartoon, NOT illustration, NOT anime, NOT drawing
2. The person (${triggerWord}) is a REAL HUMAN from training photos - describe them as they would appear in a natural photograph
3. Describe the EXACT SAME POSE, ACTION, and EXPRESSION as the character in the slide image
4. Include realistic details: natural skin tones, realistic hair, authentic clothing textures, natural lighting
5. Describe ONLY THE PERSON - no background, no scenery (output must be isolated character with transparent/white background)
6. Use photography terminology: "natural lighting", "realistic", "photographic", "lifelike", "authentic human"
7. Match the character's body language, facial expression, and positioning exactly

WHAT YOU'RE SEEING:
Slide description: "${slideText}"
${slideContext ? `Story context: "${slideContext}"` : ""}
The attached image shows the storybook slide with a cartoon character.

${guidance ?? ""}

Generate a highly detailed, photorealistic image generation prompt describing ${triggerWord} (the real person) performing the exact same action/pose as the cartoon character. The output must be a natural, realistic photograph of a real human, not an illustration. Include details about pose, expression, clothing, and emphasize photorealistic quality. Character only, no background.`;

  const parts = [
    { text: systemPrompt },
    {
      inlineData: {
        mimeType: slideImage.startsWith("data:image/png") ? "image/png" : "image/jpeg",
        data: slideImage.split(",")[1] || slideImage,
      },
    },
  ];

  const result = await model.generateContent({ contents: [{ role: "user", parts }] });
  const text = result.response?.text();

  if (!text) {
    throw new Error("Gemini returned empty prompt");
  }

  try {
    const parsed = JSON.parse(text) as { prompt: string; rationale?: string };
    return {
      prompt: parsed.prompt,
      rationale: parsed.rationale,
      raw: result.response,
    };
  } catch (error) {
    throw new Error(`Failed to parse Gemini response: ${text}`);
  }
}



