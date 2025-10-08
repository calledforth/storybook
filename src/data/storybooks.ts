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

export function generateSlides(count: number, storyId: string = 'uploaded'): StorySlide[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${storyId}-slide-${index + 1}`,
    title: `Slide ${index + 1}`,
    pdfPage: index + 1,
  }));
}

export function createStoryFromFile(file: File, slideCount: number): StoryManifest {
  return {
    id: 'uploaded',
    name: file.name.replace('.pdf', ''),
    pdfPath: URL.createObjectURL(file),
    slides: generateSlides(slideCount, 'uploaded'),
  };
}
