import Replicate from "replicate";
import { NextRequest, NextResponse } from "next/server";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(request: NextRequest) {
  try {
    const { slideImage, userImage } = await request.json();

    if (!slideImage || !userImage) {
      return NextResponse.json(
        { error: "Missing slideImage or userImage" },
        { status: 400 }
      );
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: "REPLICATE_API_TOKEN not configured" },
        { status: 500 }
      );
    }

    // Convert base64 data URLs to Buffers
    const slideBuffer = Buffer.from(slideImage.split(",")[1], "base64");
    const userBuffer = Buffer.from(userImage.split(",")[1], "base64");

    // Upload files to Replicate
    const slideFile = await replicate.files.create(
      new Blob([slideBuffer], { type: "image/png" })
    );
    const userFile = await replicate.files.create(
      new Blob([userBuffer], { type: "image/png" })
    );

    // Run face-swap model: swap_image = uploaded portrait, input_image = slide
    const output = await replicate.run(
      "cdingram/face-swap:d1d6ea8c8be89d664a07a457526f7128109dee7030fdac424788d762c71ed111",
      {
        input: {
          swap_image: userFile.urls.get,
          input_image: slideFile.urls.get,
        },
      }
    );

    // Return the result image URL
    let imageUrl: string | undefined;
    if (typeof output === "string") {
      imageUrl = output;
    } else if (output && typeof output === "object" && "url" in output) {
      const urlMethod = (output as { url?: () => string }).url;
      imageUrl = urlMethod ? urlMethod() : undefined;
    }

    return NextResponse.json({
      success: true,
      imageUrl,
    });
  } catch (error) {
    console.error("Face swap error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Face swap failed",
      },
      { status: 500 }
    );
  }
}

