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

export async function generateSlidePrompt(request: GeminiPromptRequest): Promise<GeminiPromptResult> {
  const model = client.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: { 
      responseMimeType: "application/json",
    },
  });

  const { slideText, slideImage, slideContext, triggerWord, guidance } = request;

  const systemPrompt = `You are creating a photorealistic image generation prompt for a personalized storybook application.

APPLICATION CONTEXT:
- This is a storybook application where users upload photos of a real person (child/adult)
- The system trains a custom AI model on those photos using the trigger word "${triggerWord}"
- The storybook slides show cartoon/illustrated characters in various scenes
- Your task: Generate a prompt to create a PHOTOREALISTIC IMAGE of the real person (${triggerWord}) performing the same action as the cartoon character in the slide
- The final output will be applied via inpainting directly onto the provided slide image (preserve all non-masked content)

CRITICAL REQUIREMENTS:
1. OUTPUT MUST BE PHOTOREALISTIC - NOT cartoon, NOT illustration, NOT anime, NOT drawing
2. The person (${triggerWord}) is a REAL HUMAN from training photos - describe them as they would appear in a natural photograph
3. Describe the EXACT SAME POSE, ACTION, and EXPRESSION as the character in the slide image
4. Include realistic details: natural skin tones, realistic hair, authentic clothing textures, natural lighting
5. The image will be INPAINTED into the provided slide: preserve all non-masked content; do not introduce new background or scene changes; maintain the slide's perspective and composition
6. Ensure seamless integration: clean edges with no halos, lighting/colors/shadows consistent with the slide
7. Do NOT instruct about isolated/transparent/white backgrounds; do NOT mention background removal; focus on subject appearance only
8. Match the character's body language, facial expression, and positioning exactly

WHAT YOU'RE SEEING:
Slide description: "${slideText}"
${slideContext ? `Story context: "${slideContext}"` : ""}
The attached image shows the storybook slide with a cartoon character.

${guidance ?? ""}

Generate a highly detailed, photorealistic image generation prompt describing ${triggerWord} (the real person) performing the exact same action/pose as the cartoon character. The output must be a natural, realistic photograph of a real human, not an illustration. Include details about pose, expression, clothing, and emphasize photorealistic quality and seamless integration with the provided slide. Do not request or imply isolated/transparent/white backgrounds.

IMPORTANT: Return your response as a JSON object with this exact structure:
{
  "prompt": "your detailed prompt here",
  "rationale": "brief explanation of how the prompt matches the slide"
}`;

  const parts = [
    { text: systemPrompt },
    {
      inlineData: {
        mimeType: slideImage.startsWith("data:image/png") ? "image/png" : "image/jpeg",
        data: slideImage.split(",")[1] || slideImage,
      },
    },
  ];

  const result = await model.generateContent({ 
    contents: [{ role: "user", parts }],
  });
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
  } catch {
    throw new Error(`Failed to parse Gemini response: ${text}`);
  }
}



