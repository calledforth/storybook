"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { createStoryFromFile } from "@/data/storybooks";
import { prepareSlideAssets } from "@/lib/compositor";
import { loadSlidesFromPdf } from "@/lib/loadPdfSlides";
import { useSlidesStore } from "@/store/slides";
import {
  ArrowPathIcon,
  DocumentArrowUpIcon,
} from "@heroicons/react/24/outline";

interface FineTuneRecordSummary {
  trainingId: string;
  destination: string;
  triggerWord: string;
  version?: string;
  status: string;
}

export default function StoryPage() {
  const [story, setStoryData] = useState<ReturnType<typeof createStoryFromFile> | null>(null);
  const [isLoadingStory, setIsLoadingStory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelRecords, setModelRecords] = useState<FineTuneRecordSummary[]>([]);
  const [activeRecord, setActiveRecord] = useState<FineTuneRecordSummary | null>(null);
  const [generating, setGenerating] = useState(false);
  const [slideCount, setSlideCount] = useState<number>(3);

  const {
    slides,
    story: activeStory,
    setStory,
    currentSlideId,
    setCurrentSlide,
    setSlideStatus,
  } = useSlidesStore();

  const currentSlide = currentSlideId ? slides[currentSlideId] : null;

  const currentPrompt = useMemo(() => currentSlide?.prompt, [currentSlide]);
  const currentRationale = useMemo(() => currentSlide?.rationale, [currentSlide]);

  const fetchModels = useCallback(async () => {
    const response = await fetch("/api/fine-tune/records");
    if (!response.ok) return;
    const data = await response.json();
    const completed = (data.records as FineTuneRecordSummary[]).filter((record) => record.version);
    setModelRecords(completed);
    if (!activeRecord && completed.length) {
      setActiveRecord(completed[0]);
    }
  }, [activeRecord]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const handlePdfUpload = useCallback(
    async (file: File) => {
      try {
        setIsLoadingStory(true);
        setError(null);
        const newStory = createStoryFromFile(file, 16);
        setStoryData(newStory);
        const images = await loadSlidesFromPdf(newStory.pdfPath, newStory.slides);
        setStory(newStory, images);
      } catch (err) {
        console.error(err);
        setError("Failed to load PDF. Please ensure it's a valid PDF file.");
      } finally {
        setIsLoadingStory(false);
      }
    },
    [setStory],
  );

  const runGeneration = useCallback(async () => {
    if (!activeRecord || !activeStory) return;

    setGenerating(true);
    try {
      const slidesToProcess = activeStory.slides.slice(0, slideCount);
      for (const slide of slidesToProcess) {
        const slideData = slides[slide.id];
        if (!slideData?.baseImage) continue;
        if (typeof window === "undefined") {
          throw new Error("prepareSlideAssets must run in the browser");
        }
        
        setSlideStatus(slide.id, "loading", { 
          prompt: undefined, 
          rationale: undefined,
          loadingMessage: "🎨 Analyzing slide with Gemini..."
        });

        // Small delay to show first message
        await new Promise(resolve => setTimeout(resolve, 300));

        setSlideStatus(slide.id, "loading", {
          loadingMessage: "🤖 Generating character with AI model..."
        });

        const response = await fetch("/api/story-inference", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            slideId: slide.id,
            slideTitle: slide.title,
            slideDescription: slide.description,
            backgroundImage: slideData.baseImage,
            modelVersion: activeRecord.version,
            triggerWord: activeRecord.triggerWord,
          }),
        });

        if (!response.ok) {
          const detail = await response.json().catch(() => ({}));
          throw new Error(detail.error || "Inference failed");
        }

        setSlideStatus(slide.id, "loading", {
          loadingMessage: "✂️ Removing background..."
        });

        const data = await response.json();
        
        if (!data.cleanedImage) {
          throw new Error("No cleaned image returned from server");
        }

        setSlideStatus(slide.id, "loading", {
          loadingMessage: "✨ Compositing final image..."
        });

        const assets = await prepareSlideAssets(slideData.baseImage, data.cleanedImage);
        setSlideStatus(slide.id, "ready", {
          resultImage: assets.composedImage,
          characterImage: assets.characterImage,
          prompt: data.prompt,
          rationale: data.rationale,
        });
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to generate story");
    } finally {
      setGenerating(false);
    }
  }, [activeRecord, activeStory, slideCount, setSlideStatus, slides]);

  return (
    <main className="h-screen flex overflow-hidden">
      <aside className="glass-panel w-80 h-screen overflow-y-auto flex flex-col py-6 px-4 space-y-6 border-r border-white/10">
        <div className="flex items-center gap-3">
          <span className="block h-3 w-3 rounded-full bg-white/60" />
          <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-white/70">
            Story Generator
          </h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-white/50">
              Upload Storybook PDF
            </label>
            {!story ? (
              <label className="glass-panel group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/15 px-4 py-6 text-center text-xs uppercase tracking-[0.3em] text-white/40 transition hover:border-white/30 hover:bg-white/5">
                <DocumentArrowUpIcon className="h-8 w-8 text-white/60 transition group-hover:scale-105" />
                <span>Upload PDF Storybook</span>
                <p className="text-[10px] text-white/30 normal-case">Drag & drop or click to select</p>
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  disabled={isLoadingStory}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePdfUpload(file);
                  }}
                />
              </label>
            ) : (
              <div className="glass-panel w-full rounded-xl px-4 py-3 border-white/40 bg-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-white/90">{story.name}</div>
                    <p className="mt-1 text-xs text-white/50">{story.slides.length} slides</p>
                  </div>
                  {isLoadingStory ? (
                    <ArrowPathIcon className="h-4 w-4 animate-spin text-white/60" />
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20">
                      <div className="h-2 w-2 rounded-full bg-green-400" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-white/50">
              Select Fine-Tuned Model
            </label>
            <div className="space-y-2">
              {modelRecords.length === 0 && (
                <p className="text-xs text-white/40">No completed fine-tunes detected. Train one first.</p>
              )}
              {modelRecords.map((record) => (
                <button
                  key={record.trainingId}
                  type="button"
                  onClick={() => setActiveRecord(record)}
                  className={`glass-panel w-full rounded-xl px-4 py-3 text-left transition ${
                    activeRecord?.trainingId === record.trainingId
                      ? "border-white/40 bg-white/10"
                      : "hover:border-white/30"
                  }`}
                >
                  <div className="text-sm text-white/80">{record.destination}</div>
                  <div className="mt-1 text-xs text-white/50">
                    Trigger: {record.triggerWord}
                  </div>
                  <div className="mt-1 text-[11px] text-white/40 break-all">Version: {record.version ?? "pending"}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-white/50">
              Number of Slides
            </label>
            <input
              type="number"
              min={1}
              max={activeStory?.slides.length ?? 20}
              value={slideCount}
              onChange={(e) => setSlideCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="glass-panel w-full rounded-xl px-4 py-3 text-sm text-white/90 bg-white/5 border border-white/20 focus:border-white/40 focus:outline-none transition"
              placeholder="3"
            />
            <p className="mt-1 text-[10px] text-white/40">
              Generate the first {slideCount} slide{slideCount !== 1 ? "s" : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={runGeneration}
            disabled={!activeStory || !activeRecord || generating}
            className="glass-panel w-full rounded-xl px-4 py-3 text-sm font-medium uppercase tracking-[0.2em] text-white/80 transition hover:border-white/40 hover:bg-white/10 hover:text-white disabled:opacity-60"
          >
            {generating ? "Generating..." : "Generate Story"}
          </button>

          {error && <p className="text-xs text-red-300">{error}</p>}
        </div>
      </aside>

      <section className="flex-1 h-screen flex flex-col py-10 px-10 space-y-8 overflow-hidden">
        {!activeStory ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="glass-panel max-w-md rounded-3xl border border-white/10 p-12 text-center">
              <h2 className="mb-4 text-2xl font-semibold text-white/90">Upload a storybook</h2>
              <p className="text-sm text-white/60">Select a PDF and fine-tuned model to begin.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 gap-8 overflow-hidden">
            <div className="flex-1 glass-panel rounded-3xl border border-white/10 p-6 relative flex flex-col">
              {currentSlide && (
                <>
                  <header className="mb-4 flex items-center justify-between flex-shrink-0">
                    <div>
                      <h2 className="text-xl font-semibold text-white/90">
                        {activeStory.slides.find((slide) => slide.id === currentSlide.slideId)?.title}
                      </h2>
                      <p className="text-xs uppercase tracking-[0.3em] text-white/30">
                        {currentSlide.status === "loading"
                          ? "Generating"
                          : currentSlide.status === "error"
                          ? "Error"
                          : "Ready"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!activeRecord || !currentSlide || currentSlide.status === "loading") return;
                        setSlideStatus(currentSlide.slideId, "loading", {
                          loadingMessage: "🎨 Analyzing slide with Gemini..."
                        });
                        try {
                          await new Promise(resolve => setTimeout(resolve, 300));

                          setSlideStatus(currentSlide.slideId, "loading", {
                            loadingMessage: "🤖 Generating character with AI model..."
                          });

                          const payload = {
                            slideId: currentSlide.slideId,
                            slideTitle:
                              activeStory.slides.find((slide) => slide.id === currentSlide.slideId)?.title,
                            slideDescription:
                              activeStory.slides.find((slide) => slide.id === currentSlide.slideId)?.description,
                            backgroundImage: currentSlide.baseImage,
                            modelVersion: activeRecord.version,
                            triggerWord: activeRecord.triggerWord,
                          };
                          const response = await fetch("/api/story-inference", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(payload),
                          });
                          if (!response.ok) {
                            const detail = await response.json().catch(() => ({}));
                            throw new Error(detail.error || "Inference failed");
                          }

                        setSlideStatus(currentSlide.slideId, "loading", {
                          loadingMessage: "✂️ Removing background..."
                        });

                        const data = await response.json();
                        
                        if (!data.cleanedImage) {
                          throw new Error("No cleaned image returned from server");
                        }

                        if (!currentSlide.baseImage) {
                          throw new Error("Missing base slide image");
                        }

                        if (typeof window === "undefined") {
                          throw new Error("prepareSlideAssets must run in the browser");
                        }

                        setSlideStatus(currentSlide.slideId, "loading", {
                          loadingMessage: "✨ Compositing final image..."
                        });

                        const assets = await prepareSlideAssets(currentSlide.baseImage, data.cleanedImage);
                        setSlideStatus(currentSlide.slideId, "ready", {
                          resultImage: assets.composedImage,
                          characterImage: assets.characterImage,
                          prompt: data.prompt,
                          rationale: data.rationale,
                        });
                        } catch (err) {
                          const message = err instanceof Error ? err.message : "Inference failed";
                          setSlideStatus(currentSlide.slideId, "error", { error: message });
                        }
                      }}
                      className="glass-panel rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/70 transition hover:text-white"
                    >
                      Regenerate
                    </button>
                  </header>

                  <div className="flex-1 overflow-y-auto space-y-6">
                    <div className="relative w-full aspect-video rounded-2xl border border-white/10 bg-black overflow-hidden">
                      {currentSlide.status === "loading" && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-black/80 backdrop-blur-sm">
                          <ArrowPathIcon className="h-12 w-12 animate-spin text-white/60" />
                          {currentSlide.loadingMessage && (
                            <p className="text-sm text-white/80 font-medium animate-pulse">
                              {currentSlide.loadingMessage}
                            </p>
                          )}
                        </div>
                      )}
                      {currentSlide.resultImage && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={currentSlide.resultImage}
                          alt="Slide preview"
                          className="w-full h-full object-contain"
                        />
                      )}
                    </div>

                    {(currentPrompt || currentRationale || currentSlide.characterImage) && (
                      <div className="glass-panel rounded-2xl border border-white/10 p-4 text-sm text-white/70 space-y-3">
                        {currentSlide.characterImage && (
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-white/40 mb-2">Character Layer</p>
                            <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={currentSlide.characterImage} alt="Character layer" className="mx-auto max-h-48 object-contain" />
                            </div>
                          </div>
                        )}
                        {currentPrompt && (
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-white/40 mb-1">Prompt</p>
                            <p className="leading-relaxed text-white/80">{currentPrompt}</p>
                          </div>
                        )}
                        {currentRationale && (
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-white/40 mb-1">Gemini Notes</p>
                            <p className="leading-relaxed text-white/60">{currentRationale}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <aside className="w-64 glass-panel rounded-3xl border border-white/10 p-4 overflow-y-auto scrollbar-thin">
              <div className="space-y-4">
                {activeStory.slides.map((slide) => {
                  const slideData = slides[slide.id];
                  const isActive = slide.id === currentSlideId;
                  const status = slideData?.status ?? "idle";
                  return (
                    <button
                      key={slide.id}
                      type="button"
                      onClick={() => setCurrentSlide(slide.id)}
                      className={`group relative flex w-full flex-col gap-2 overflow-hidden rounded-2xl border border-white/10 p-2 text-left transition ${
                        isActive ? "border-white/40 bg-white/10" : "hover:border-white/30"
                      }`}
                    >
                      <div className="relative h-32 overflow-hidden rounded-xl bg-black/60">
                        {status === "loading" && (
                          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/80 backdrop-blur-sm p-2">
                            <ArrowPathIcon className="h-5 w-5 animate-spin text-white/60" />
                            {slideData?.loadingMessage && (
                              <p className="text-[9px] text-center text-white/70 leading-tight">
                                {slideData.loadingMessage.replace(/[🎨🤖✂️✨]/g, '')}
                              </p>
                            )}
                          </div>
                        )}
                        {slideData?.resultImage && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={slideData.resultImage}
                            alt={slide.title}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs text-white/60">
                        <span>{slide.title}</span>
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${
                            status === "loading"
                              ? "bg-white/10 text-white/60"
                              : status === "error"
                              ? "bg-red-500/20 text-red-200"
                              : "bg-white/10 text-white/50"
                          }`}
                        >
                          {status}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}


