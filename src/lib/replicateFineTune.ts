import { env } from "@/env";
import {
  DEFAULT_MODEL_DESCRIPTION,
  DEFAULT_MODEL_VISIBILITY,
  DEFAULT_TRIGGER_WORD_PREFIX,
  REPLICATE_DEFAULT_HARDWARE,
  REPLICATE_DEFAULT_TRAINER_MODEL,
  REPLICATE_FLUX_TRAINER_VERSION,
} from "@/lib/constants";

const REPLICATE_API_BASE = "https://api.replicate.com/v1";

type ReplicateModelVisibility = "public" | "private";

export interface ReplicateFileUploadResponse {
  id: string;
  name: string;
  size: number;
  urls: {
    get: string;
  };
}

export interface ReplicateTraining {
  id: string;
  status: string;
  destination: string;
  created_at: string;
  completed_at: string | null;
  started_at: string | null;
  error: string | null;
  output?: {
    version?: string;
    weights?: string;
  };
}

interface CreateModelRequest {
  owner: string;
  name: string;
  description?: string;
  visibility?: ReplicateModelVisibility;
  hardware?: string;
}

async function replicateFetch<T>(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.REPLICATE_API_TOKEN}`,
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Replicate API error (${response.status}): ${detail}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}

export async function uploadTrainingZip(buffer: Buffer, filename = "data.zip") {
  const formData = new FormData();
  formData.append(
    "content",
    new Blob([buffer as BlobPart], { type: "application/zip" }),
    filename,
  );

  return replicateFetch<ReplicateFileUploadResponse>(`${REPLICATE_API_BASE}/files`, {
    method: "POST",
    body: formData,
  });
}

export async function getModel(owner: string, name: string) {
  try {
    return await replicateFetch(`${REPLICATE_API_BASE}/models/${owner}/${name}`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("404")) {
      return null;
    }
    throw error;
  }
}

export function sanitizeModelName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[._-]+/, "")
    .replace(/[._-]+$/, "")
    .slice(0, 60) || "storybook";
}

export async function ensureDestinationModel(params: CreateModelRequest) {
  const sanitizedName = sanitizeModelName(params.name);
  const { owner } = params;
  const existing = await getModel(owner, sanitizedName);
  if (existing) {
    return existing;
  }

  return replicateFetch(`${REPLICATE_API_BASE}/models`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      owner,
      name: sanitizedName,
      description: params.description ?? DEFAULT_MODEL_DESCRIPTION,
      visibility: params.visibility ?? DEFAULT_MODEL_VISIBILITY,
      hardware: params.hardware ?? REPLICATE_DEFAULT_HARDWARE,
    }),
  });
}

export interface StartTrainingParams {
  destination: string;
  inputImagesUrl: string;
  triggerWord?: string;
  steps?: number;
  rank?: number;
  learningRate?: number;
}

function generateTriggerWord(seed?: string) {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${seed ?? DEFAULT_TRIGGER_WORD_PREFIX}_${random}`;
}

export async function startFluxTraining(params: StartTrainingParams) {
  const triggerWord = params.triggerWord ?? generateTriggerWord();
  const sanitizedDestination = sanitizeModelName(params.destination.split("/")[1] ?? params.destination);
  const destination = `${env.REPLICATE_OWNER}/${sanitizedDestination}`;

  const body = {
    destination,
    input: {
      input_images: params.inputImagesUrl,
      trigger_word: triggerWord,
      ...(params.steps ? { num_train_steps: params.steps } : {}),
      ...(params.rank ? { lora_rank: params.rank } : {}),
      ...(params.learningRate ? { learning_rate: params.learningRate } : {}),
    },
  };

  const training = await replicateFetch<ReplicateTraining>(
    `${REPLICATE_API_BASE}/models/${REPLICATE_DEFAULT_TRAINER_MODEL}/versions/${REPLICATE_FLUX_TRAINER_VERSION}/trainings`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  return { training, triggerWord };
}

export async function getTrainingStatus(trainingId: string) {
  return replicateFetch<ReplicateTraining>(
    `${REPLICATE_API_BASE}/trainings/${trainingId}`,
  );
}


