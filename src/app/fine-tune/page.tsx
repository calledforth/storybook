"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type TrainingRecord = {
  trainingId: string;
  destination: string;
  triggerWord: string;
  owner: string;
  modelName: string;
  inputUrl: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  version?: string;
  weightsUrl?: string;
  error?: string | null;
};

interface FineTuneResponse {
  success: boolean;
  trainingId: string;
  triggerWord: string;
  record: TrainingRecord;
}

interface FineTuneStatusResponse {
  record: TrainingRecord;
  remote?: {
    status: string;
    error?: string | null;
  };
}

const POLL_INTERVAL = 5000;

export default function FineTunePage() {
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [modelName, setModelName] = useState("storybook-flux");
  const [currentRecord, setCurrentRecord] = useState<TrainingRecord | null>(null);
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const statusBadge = useMemo(() => {
    if (!currentRecord) return null;
    const status = currentRecord.status;
    if (status === "succeeded" || status === "completed") {
      return "bg-green-500/20 text-green-300";
    }
    if (status === "failed") {
      return "bg-red-500/20 text-red-200";
    }
    if (status === "starting" || status === "processing") {
      return "bg-blue-500/20 text-blue-200";
    }
    return "bg-white/10 text-white/60";
  }, [currentRecord]);

  const resetForm = useCallback(() => {
    setZipFile(null);
    setImages([]);
    setError(null);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollStatus = useCallback(
    async (trainingId: string) => {
      try {
        const response = await fetch(`/api/fine-tune/status?trainingId=${trainingId}`);
        if (!response.ok) {
          throw new Error(await response.text());
        }
        const data: FineTuneStatusResponse = await response.json();
        setCurrentRecord(data.record);

        if (["succeeded", "failed", "canceled", "completed"].includes(data.record.status)) {
          stopPolling();
        }
      } catch (err) {
        console.error("Polling error", err);
        stopPolling();
      }
    },
    [stopPolling],
  );

  const fetchRecords = useCallback(async () => {
    setIsLoadingRecords(true);
    try {
      const response = await fetch("/api/fine-tune/records", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load fine-tune history");
      }
      const data = await response.json();
      const list = data.records as TrainingRecord[];
      setRecords(list);
      if (!currentRecord && list.length) {
        setCurrentRecord(list[0]);
      }
      if (!selectedRecordId && list.length) {
        setSelectedRecordId(list[0].trainingId);
      }
    } catch (err) {
      console.error("Failed to fetch records", err);
    } finally {
      setIsLoadingRecords(false);
    }
  }, [currentRecord, selectedRecordId]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (isSubmitting) return;

      try {
        setIsSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        const formData = new FormData();
        formData.append("modelName", modelName.trim());

        if (zipFile) {
          formData.append("zip", zipFile);
        } else if (images.length) {
          images.forEach((file) => formData.append("images", file));
        } else {
          throw new Error("Please upload a zip file or select images");
        }

        const response = await fetch("/api/fine-tune", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const data: FineTuneResponse = await response.json();
        setCurrentRecord(data.record);
        setSelectedRecordId(data.trainingId);
        setRecords((prev) => {
          const exists = prev.some((item) => item.trainingId === data.trainingId);
          return exists
            ? prev.map((item) => (item.trainingId === data.trainingId ? data.record : item))
            : [data.record, ...prev];
        });
        setSuccessMessage("Fine-tuning started. We will notify you as it progresses.");
        resetForm();

        stopPolling();
        pollStatus(data.trainingId);
        pollRef.current = setInterval(() => pollStatus(data.trainingId), POLL_INTERVAL);
      } catch (err) {
        console.error("Submit error", err);
        setError(err instanceof Error ? err.message : "Failed to start fine-tuning");
      } finally {
        setIsSubmitting(false);
      }
    },
    [images, isSubmitting, modelName, pollStatus, resetForm, stopPolling, zipFile],
  );

  useEffect(() => () => stopPolling(), [stopPolling]);

  return (
    <main className="h-screen flex overflow-hidden">
      <aside className="glass-panel w-72 h-screen overflow-y-auto flex flex-col py-6 px-4 space-y-6 border-r border-white/10">
        <div className="flex items-center gap-3">
          <span className="block h-3 w-3 rounded-full bg-white/60" />
          <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-white/70">
            Fine-Tune
          </h2>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-white/50">
              Destination Model Name
            </label>
            <input
              value={modelName}
              onChange={(event) => setModelName(event.target.value)}
              className="glass-panel w-full rounded-xl px-3 py-2 bg-transparent outline-none"
              required
            />
            <p className="mt-1 text-[11px] text-white/40">Will be created under your Replicate account if missing.</p>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-white/50">
              Upload data.zip
            </label>
            <label className="glass-panel group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/15 px-4 py-6 text-center text-xs uppercase tracking-[0.3em] text-white/40 transition hover:border-white/30 hover:bg-white/5">
              {zipFile ? (
                <span className="text-white/70">{zipFile.name}</span>
              ) : (
                <span>Drop or click</span>
              )}
              <input
                type="file"
                accept=".zip"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setZipFile(file);
                  if (file) {
                    setImages([]);
                  }
                }}
              />
            </label>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-white/50">
              Or upload individual images
            </label>
            <label className="glass-panel group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/15 px-4 py-6 text-center text-xs uppercase tracking-[0.3em] text-white/40 transition hover:border-white/30 hover:bg-white/5">
              {images.length ? (
                <span className="text-white/70">{images.length} selected</span>
              ) : (
                <span>Select images</span>
              )}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => {
                  const files = event.target.files ? Array.from(event.target.files) : [];
                  setImages(files);
                  if (files.length) {
                    setZipFile(null);
                  }
                }}
              />
            </label>
            <p className="mt-1 text-[11px] text-white/40">We will bundle them into data.zip before uploading.</p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="glass-panel w-full rounded-xl px-4 py-3 text-sm font-medium uppercase tracking-[0.2em] text-white/80 transition hover:border-white/40 hover:bg-white/10 hover:text-white disabled:opacity-60"
          >
            {isSubmitting ? "Starting..." : "Start Fine-Tune"}
          </button>

          {error && (
            <p className="text-xs text-red-300">{error}</p>
          )}
          {successMessage && <p className="text-xs text-green-300">{successMessage}</p>}
        </form>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-white/50">
              Recent Fine-Tunes
            </label>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {isLoadingRecords && <p className="text-xs text-white/40">Loading history...</p>}
              {!isLoadingRecords && records.length === 0 && <p className="text-xs text-white/40">No fine-tunes yet.</p>}
              {records.map((record) => (
                <button
                  key={record.trainingId}
                  type="button"
                  onClick={() => {
                    setCurrentRecord(record);
                    setSelectedRecordId(record.trainingId);
                    stopPolling();
                    if (!["succeeded", "completed", "failed"].includes(record.status)) {
                      pollStatus(record.trainingId);
                      pollRef.current = setInterval(() => pollStatus(record.trainingId), POLL_INTERVAL);
                    }
                  }}
                  className={`glass-panel w-full rounded-xl px-4 py-3 text-left transition ${
                    selectedRecordId === record.trainingId ? "border-white/40 bg-white/10" : "hover:border-white/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-white/80">{record.destination}</div>
                      <div className="mt-1 text-xs text-white/50">Trigger: {record.triggerWord}</div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.2em] ${
                        record.status === "succeeded" || record.status === "completed"
                          ? "bg-green-500/20 text-green-300"
                          : record.status === "failed"
                          ? "bg-red-500/20 text-red-200"
                          : "bg-white/10 text-white/60"
                      }`}
                    >
                      {record.status}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-white/40">
                    Updated {new Date(record.updatedAt).toLocaleTimeString()}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <section className="flex-1 h-screen flex flex-col py-10 px-10 space-y-8 overflow-hidden">
        {!currentRecord ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="glass-panel max-w-md rounded-3xl border border-white/10 p-12 text-center">
              <h2 className="mb-4 text-2xl font-semibold text-white/90">Prepare Training</h2>
              <div className="space-y-3 text-sm text-white/60">
                <p>Upload your portrait set as a zip or multiple images.</p>
                <p>We will create or reuse a Replicate model automatically.</p>
                <p>Once running, status updates will appear here.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-panel flex-1 rounded-3xl border border-white/10 p-8 flex flex-col gap-6 overflow-hidden">
            <header className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-white/90">Training Overview</h1>
                <p className="text-sm text-white/40">Tracking job {currentRecord.trainingId}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] ${statusBadge}`}>
                {currentRecord.status}
              </span>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-white/70">
              <div className="space-y-2">
                <p className="text-white/40 text-xs uppercase tracking-[0.2em]">Destination</p>
                <p className="text-white/80 text-base">{currentRecord.destination}</p>
              </div>
              <div className="space-y-2">
                <p className="text-white/40 text-xs uppercase tracking-[0.2em]">Trigger Word</p>
                <p className="text-white/80 text-base">{currentRecord.triggerWord}</p>
              </div>
              <div className="space-y-2">
                <p className="text-white/40 text-xs uppercase tracking-[0.2em]">Started</p>
                <p>{new Date(currentRecord.createdAt).toLocaleString()}</p>
              </div>
              <div className="space-y-2">
                <p className="text-white/40 text-xs uppercase tracking-[0.2em]">Updated</p>
                <p>{new Date(currentRecord.updatedAt).toLocaleString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 text-sm">
              <div className="glass-panel rounded-2xl border border-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/40 mb-2">Model Version</p>
                <p className="text-white/70 break-all">{currentRecord.version ?? "pending"}</p>
              </div>
              <div className="glass-panel rounded-2xl border border-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/40 mb-2">Weights URL</p>
                <p className="text-white/70 break-all">
                  {currentRecord.weightsUrl ? (
                    <a href={currentRecord.weightsUrl} className="underline" target="_blank" rel="noreferrer">
                      {currentRecord.weightsUrl}
                    </a>
                  ) : (
                    "pending"
                  )}
                </p>
              </div>
              <div className="glass-panel rounded-2xl border border-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/40 mb-2">Input Data</p>
                <p className="text-white/70 break-all">
                  <a href={currentRecord.inputUrl} className="underline" target="_blank" rel="noreferrer">
                    {currentRecord.inputUrl}
                  </a>
                </p>
              </div>
              {currentRecord.error && (
                <div className="glass-panel rounded-2xl border border-red-400/30 bg-red-500/10 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-red-200 mb-2">Error</p>
                  <p className="text-red-100 text-sm">{currentRecord.error}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  if (!currentRecord) return;
                  stopPolling();
                  pollStatus(currentRecord.trainingId);
                  pollRef.current = setInterval(() => pollStatus(currentRecord.trainingId), POLL_INTERVAL);
                }}
                className="glass-panel rounded-full px-5 py-2 text-xs uppercase tracking-[0.2em] text-white/70 transition hover:border-white/40 hover:text-white"
              >
                Refresh
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}



