"use client";

import { useState } from "react";
import { createStoryFromFile, StoryManifest } from "@/data/storybooks";
import { loadSlidesFromPdf } from "@/lib/loadPdfSlides";
import { faceSwap } from "@/lib/faceSwap";
import { useSlidesStore } from "@/store/slides";
import { ArrowPathIcon, ArrowUpTrayIcon, DocumentArrowUpIcon } from "@heroicons/react/24/outline";
import JSZip from "jszip";
import { exportSlidesToPdf } from "@/lib/exportSlides";

type UploadFile = File & { webkitRelativePath?: string };

export default function Home() {
  const [error, setError] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [isLoadingStory, setIsLoadingStory] = useState(false);
  const [processCount, setProcessCount] = useState<number>(1);
  const [isExporting, setIsExporting] = useState(false);
  const [story, setStoryData] = useState<StoryManifest | null>(null);

  const {
    slides,
    story: activeStory,
    setStory,
    currentSlideId,
    setCurrentSlide,
    setSlideStatus,
    setUserImage,
    reset,
  } = useSlidesStore();

  async function handlePdfUpload(file: File) {
    try {
      setIsLoadingStory(true);
      setError(null);
      
      // Create story from uploaded file
      const newStory = createStoryFromFile(file, 16); // Default to 16 slides, we'll detect actual count
      setStoryData(newStory);
      
      // Load slides from PDF
      const images = await loadSlidesFromPdf(newStory.pdfPath, newStory.slides);
      setStory(newStory, images);
      
      // Set default process count
      setProcessCount(Math.min(3, newStory.slides.length));
    } catch (err) {
      console.error(err);
      setError("Failed to load PDF. Please ensure it's a valid PDF file.");
    } finally {
      setIsLoadingStory(false);
    }
  }

  const currentSlide = currentSlideId ? slides[currentSlideId] : null;

  async function handleFiles(files: FileList | null) {
    if (!files) return;

    const firstImage = files[0];
    if (!firstImage) return;

    const imageUrl = URL.createObjectURL(firstImage);
    setUploadedImage(imageUrl);
  }

  async function handleZipUpload(file: UploadFile) {
    if (!story) return;
    
    const zip = await JSZip.loadAsync(file);
    const entries = Object.values(zip.files).filter((entry) => !entry.dir);

    for (let i = 0; i < story.slides.length; i += 1) {
      const slide = story.slides[i];
      const entry = entries[i];
      if (!entry) continue;
      const blob = await entry.async("blob");
      const url = URL.createObjectURL(blob);
      setUserImage(slide.id, url);
    }
  }

  async function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    const { files } = event.dataTransfer;
    if (!files.length) return;

    const list = Array.from(files);

    const zipFile = list.find((item) => item.name.endsWith(".zip"));
    if (zipFile) {
      await handleZipUpload(zipFile as UploadFile);
      return;
    }

    const firstImage = list.find((item) => item.type.startsWith("image/"));
    if (!firstImage) return;
    
    const imageUrl = URL.createObjectURL(firstImage);
    setUploadedImage(imageUrl);
  }

  async function generateSlide(slideId: string) {
    const slide = slides[slideId];
    if (!slide || !uploadedImage) return;

    setSlideStatus(slideId, "loading");
    try {
      const result = await faceSwap(slide, uploadedImage);
      setSlideStatus(slideId, "ready", {
        resultImage: result,
      });
    } catch (err) {
      console.error(err);
      setSlideStatus(slideId, "error", {
        error: err instanceof Error ? err.message : "Failed to generate slide",
      });
    }
  }

  async function generateAllSlides() {
    if (!activeStory || !uploadedImage) return;
    
    setHasGenerated(true);
    const count = Math.max(1, Math.min(processCount, activeStory.slides.length));
    const targets = activeStory.slides.slice(0, count);
    
    for (const slide of targets) {
      const slideData = slides[slide.id];
      if (!slideData) continue;
      
      setUserImage(slide.id, uploadedImage);
      await generateSlide(slide.id);
    }
  }

  function doReset() {
    reset();
    setError(null);
    setUploadedImage(null);
    setStoryData(null);
    setHasGenerated(false);
    setIsLoadingStory(false);
    setProcessCount(1);
  }

  const canGenerate = uploadedImage && story && !hasGenerated && !isLoadingStory;
  const showSlides = hasGenerated && activeStory;
  const storyLoaded = story && activeStory && !isLoadingStory;

  return (
    <main className="h-screen flex overflow-hidden">
      <aside className="glass-panel w-72 h-screen overflow-y-auto flex flex-col py-6 px-4 space-y-6 border-r border-white/10">
        <div className="flex items-center gap-3">
          <span className="block h-3 w-3 rounded-full bg-white/60" />
          <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-white/70">
            Story Swap
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
              Upload Portrait
            </label>
            <label
              className="glass-panel group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/15 px-3 py-6 text-center text-xs uppercase tracking-[0.3em] text-white/40 transition hover:border-white/30 hover:bg-white/5"
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
            >
              {uploadedImage ? (
                <div className="w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={uploadedImage}
                    alt="Uploaded portrait"
                    className="mx-auto h-32 w-32 rounded-lg object-cover"
                  />
                  <p className="mt-3 text-xs text-white/60">Image uploaded</p>
                </div>
              ) : (
                <>
                  <ArrowUpTrayIcon className="h-5 w-5 text-white/60 transition group-hover:scale-105" />
                  <span>Upload Image / Zip</span>
                </>
              )}
              <input
                type="file"
                accept="image/*,.zip"
                multiple
                className="hidden"
                onChange={(event) => handleFiles(event.target.files)}
              />
            </label>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-white/50">
              Slides to process
            </label>
            <input
              type="number"
              min={1}
              max={story?.slides.length || 16}
              value={processCount}
              onChange={(e) => setProcessCount(Math.max(1, Math.min(Number(e.target.value || 1), story?.slides.length || 16)))}
              disabled={!storyLoaded}
              className="glass-panel w-full rounded-xl px-3 py-2 bg-transparent outline-none"
            />
            <p className="mt-1 text-[11px] text-white/40">We will process the first {processCount} slide(s).</p>
          </div>

          <div className="flex gap-2">
            {canGenerate && (
              <button
                type="button"
                onClick={generateAllSlides}
                className="glass-panel flex-1 rounded-xl px-4 py-3 text-sm font-medium uppercase tracking-[0.2em] text-white/80 transition hover:border-white/40 hover:bg-white/10 hover:text-white"
              >
                Generate {processCount}
              </button>
            )}
            <button
              type="button"
              onClick={doReset}
              className="glass-panel rounded-xl px-4 py-3 text-sm uppercase tracking-[0.2em] text-white/60 transition hover:border-white/40 hover:text-white"
            >
              Reset
            </button>
          </div>
        </div>
      </aside>

      <section className="flex-1 h-screen flex flex-col py-10 px-10 space-y-8 overflow-hidden">
        {!showSlides ? (
          storyLoaded ? (
            <div className="flex flex-1 flex-col overflow-hidden">
              <header className="mb-4 flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-semibold text-white/90">Slides Overview</h1>
                  <p className="text-sm text-white/40">Review the storybook before generating.</p>
                </div>
                {canGenerate && (
                  <button
                    type="button"
                    onClick={generateAllSlides}
                    className="glass-panel rounded-full px-6 py-2 text-sm uppercase tracking-[0.2em] text-white/70 transition hover:border-white/40 hover:text-white"
                  >
                    Generate {processCount}
                  </button>
                )}
              </header>
              <div className="flex-1 overflow-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {story?.slides.map((slide) => {
                    const base = slides[slide.id]?.baseImage;
                    return (
                      <div key={slide.id} className="glass-panel rounded-2xl border border-white/10 p-3">
                        <div className="mb-2 text-sm text-white/70">{slide.title}</div>
                        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-black/60">
                          {base && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={base} alt={slide.title} className="h-full w-full object-cover" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="glass-panel max-w-md rounded-3xl border border-white/10 p-12 text-center">
                <h2 className="mb-4 text-2xl font-semibold text-white/90">
                  Get Started
                </h2>
                <div className="space-y-3 text-sm text-white/60">
                  <p className="flex items-center gap-2">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                    storyLoaded ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white/60"
                  }`}>
                    {storyLoaded ? "✓" : "1"}
                  </span>
                  Upload a PDF storybook
                  </p>
                  <p className="flex items-center gap-2">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                      uploadedImage ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white/60"
                    }`}>
                      {uploadedImage ? "✓" : "2"}
                    </span>
                    Upload your portrait image
                  </p>
                  <p className="flex items-center gap-2">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                      (uploadedImage && storyLoaded) ? "bg-blue-500/20 text-blue-400" : "bg-white/10 text-white/60"
                    }`}>
                      3
                    </span>
                    Click Generate {processCount}
                  </p>
                </div>
              </div>
            </div>
          )
        ) : (
          <>
            <header className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-white/90">Story Preview</h1>
                <p className="text-sm text-white/40">Review and export your personalized storybook.</p>
              </div>
              <button
                type="button"
                className="glass-panel rounded-full px-6 py-2 text-sm uppercase tracking-[0.2em] text-white/70 transition hover:border-white/40 hover:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={isExporting}
                onClick={async () => {
                  try {
                    setIsExporting(true);
                    const slideList = Object.values(slides);
                    const pdfBlob = await exportSlidesToPdf(slideList);
                    const link = document.createElement("a");
                    link.href = URL.createObjectURL(pdfBlob);
                    link.download = `${story?.id || 'storybook'}-personalized.pdf`;
                    link.click();
                    URL.revokeObjectURL(link.href);
                  } finally {
                    setIsExporting(false);
                  }
                }}
              >
                {isExporting ? (
                  <span className="inline-flex items-center gap-2"><ArrowPathIcon className="h-4 w-4 animate-spin text-white/70" /> Exporting</span>
                ) : (
                  "Export PDF"
                )}
              </button>
            </header>

            <div className="flex flex-1 gap-8 overflow-hidden">
              <div className="flex-1 glass-panel rounded-3xl border border-white/10 p-6 relative flex flex-col overflow-y-auto">
                {error && (
                  <div className="absolute inset-4 flex items-center justify-center rounded-2xl border border-red-500/40 bg-red-500/10">
                    <p className="text-sm text-red-200">{error}</p>
                  </div>
                )}

                {!error && currentSlide && (
                  <>
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-semibold text-white/90">
                          {story?.slides.find((slide) => slide.id === currentSlide.slideId)?.title}
                        </h2>
                        <p className="text-xs uppercase tracking-[0.3em] text-white/30">
                          {currentSlide.status === "loading"
                            ? "Generating"
                            : currentSlide.status === "error"
                            ? "Error"
                            : "Ready"}
                        </p>
        </div>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => generateSlide(currentSlide.slideId)}
                          className="glass-panel rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/70 transition hover:text-white"
                        >
                          {currentSlide.status === "loading" ? "Generating" : "Regenerate"}
                        </button>
                      </div>
                    </div>

                    <div className="relative flex-1 overflow-auto rounded-2xl border border-white/10 bg-black">
                      {currentSlide.status === "loading" && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60">
                          <ArrowPathIcon className="h-12 w-12 animate-spin text-white/60" />
                        </div>
                      )}
                      {currentSlide.resultImage && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={currentSlide.resultImage}
                          alt="Slide preview"
                          className="h-full w-full object-contain"
                        />
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="w-64 glass-panel rounded-3xl border border-white/10 p-4 overflow-y-auto scrollbar-thin">
                <div className="space-y-4">
                  {story?.slides.map((slide) => {
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
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60">
                              <ArrowPathIcon className="h-5 w-5 animate-spin text-white/60" />
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
              </div>
    </div>
          </>
        )}
      </section>
    </main>
  );
}
