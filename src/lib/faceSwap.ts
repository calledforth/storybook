"use client";

import { SlideData } from "@/store/slides";

async function ensureDataUrl(imageUrlOrData: string): Promise<string> {
  if (imageUrlOrData.startsWith("data:")) return imageUrlOrData;
  const response = await fetch(imageUrlOrData);
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read blob as data URL"));
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

export async function faceSwap(
  slide: SlideData,
  userImage: string | null
): Promise<string> {
  if (!slide.baseImage) {
    throw new Error("Missing base image");
  }

  if (!userImage) {
    throw new Error("Missing user image");
  }

  try {
    const slideImageData = await ensureDataUrl(slide.baseImage);
    const userImageData = await ensureDataUrl(userImage);

    const response = await fetch("/api/face-swap", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        slideImage: slideImageData,
        userImage: userImageData,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Face swap request failed");
    }

    const data = await response.json();

    if (!data.success || !data.imageUrl) {
      throw new Error("Invalid response from face swap API");
    }

    return data.imageUrl;
  } catch (error) {
    console.error("Face swap error:", error);
    // Fallback to original slide on error
    return slide.baseImage;
  }
}

