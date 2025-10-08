export type StorySlide = {
  id: string;
  title: string;
  description?: string;
  pdfPage: number;
};

export type StoryManifest = {
  id: string;
  name: string;
  pdfPath: string;
  slides: StorySlide[];
};

export const storybooks: StoryManifest[] = [
  {
    id: "story-2",
    name: "Story 2",
    pdfPath: "/storybook/story-2.pdf",
    slides: Array.from({ length: 16 }, (_, index) => ({
      id: `story-2-slide-${index + 1}`,
      title: `Slide ${index + 1}`,
      pdfPage: index + 1,
    })),
  },
];
