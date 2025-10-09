import { NextRequest, NextResponse } from "next/server";

import { StorySlide } from "@/data/storybooks";
import { generateSlideCharacter } from "@/lib/inferencePipeline";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      slideId,
      slideTitle,
      slideDescription,
      backgroundImage,
      modelVersion,
      triggerWord,
      storyContext,
    } = body;

    if (!slideId || !backgroundImage || !modelVersion || !triggerWord) {
      return NextResponse.json(
        { error: "Missing required inference parameters" },
        { status: 400 },
      );
    }

    const slide: StorySlide = {
      id: slideId,
      title: slideTitle || slideId,
      description: slideDescription,
      pdfPage: 0,
    };

    const result = await generateSlideCharacter({
      slide,
      backgroundImage,
      modelVersion,
      triggerWord,
      storyContext,
    });

    return NextResponse.json({
      prompt: result.prompt,
      rationale: result.rationale,
      rawImages: result.generatedImages,
      cleanedImage: result.cleanedImage,
    });
  } catch (error) {
    console.error("Story inference error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate slide" },
      { status: 500 },
    );
  }
}


