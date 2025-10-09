"use client";

import { create } from "zustand";
import { StoryManifest } from "@/data/storybooks";

export type SlideStatus = "idle" | "loading" | "ready" | "error";

export type SlideData = {
  slideId: string;
  baseImage: string | null;
  resultImage: string | null;
  userImage: string | null;
  status: SlideStatus;
  error?: string;
  prompt?: string;
  rationale?: string;
  characterImage?: string | null;
  loadingMessage?: string;
};

interface SlidesState {
  story: StoryManifest | null;
  slides: Record<string, SlideData>;
  currentSlideId: string | null;
  setStory: (story: StoryManifest, baseImages: Record<string, string>) => void;
  setCurrentSlide: (slideId: string) => void;
  setUserImage: (slideId: string, imageUrl: string) => void;
  setSlideStatus: (
    slideId: string,
    status: SlideStatus,
    updates?: Partial<SlideData>,
  ) => void;
  reset: () => void;
}

export const useSlidesStore = create<SlidesState>((set) => ({
  story: null,
  slides: {},
  currentSlideId: null,
  setStory: (story, baseImages) =>
    set(() => ({
      story,
      slides: story.slides.reduce<Record<string, SlideData>>((acc, slide) => {
        const baseImage = baseImages[slide.id] ?? null;
        acc[slide.id] = {
          slideId: slide.id,
          baseImage,
          resultImage: baseImage,
          userImage: null,
          status: baseImage ? "ready" : "idle",
          prompt: undefined,
          rationale: undefined,
          characterImage: null,
        };
        return acc;
      }, {}),
      currentSlideId: story.slides[0]?.id ?? null,
    })),
  setCurrentSlide: (slideId) =>
    set(() => ({
      currentSlideId: slideId,
    })),
  setUserImage: (slideId, imageUrl) =>
    set((state) => {
      const current = state.slides[slideId];
      if (!current) {
        return state;
      }
      return {
        slides: {
          ...state.slides,
          [slideId]: {
            ...current,
            userImage: imageUrl,
            status: "idle",
            error: undefined,
            resultImage: current.baseImage,
            characterImage: null,
            prompt: undefined,
            rationale: undefined,
          },
        },
      };
    }),
  setSlideStatus: (slideId, status, updates) =>
    set((state) => ({
      slides: {
        ...state.slides,
        [slideId]: {
          ...state.slides[slideId],
          ...updates,
          status,
        },
      },
    })),
  reset: () =>
    set(() => ({
      story: null,
      slides: {},
      currentSlideId: null,
    })),
}));

