export interface StoryInferenceRequest {
  slideId: string;
  slideTitle: string;
  slideDescription?: string;
  backgroundImage: string;
  modelVersion: string;
  triggerWord: string;
  storyContext?: string;
}

export interface StoryInferenceResponse {
  prompt: string;
  rationale?: string;
  imageUrl: string;
}



