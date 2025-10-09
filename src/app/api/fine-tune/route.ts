import JSZip from "jszip";
import { NextRequest, NextResponse } from "next/server";

import { env } from "@/env";
import {
  ensureDestinationModel,
  sanitizeModelName,
  startFluxTraining,
  uploadTrainingZip,
} from "@/lib/replicateFineTune";
import {
  createFineTuneRecord,
  getFineTuneRecord,
} from "@/lib/trainingStore";

async function loadZipBuffer(source: File[] | File | null) {
  if (!source) {
    throw new Error("No files provided");
  }

  if (source instanceof File) {
    const arrayBuffer = await source.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  const files = source;
  if (!files.length) {
    throw new Error("No files provided");
  }

  const zip = new JSZip();
  let hasImage = false;

  await Promise.all(
    files.map(async (file) => {
      if (!file.type.startsWith("image/")) {
        return;
      }
      hasImage = true;
      const arrayBuffer = await file.arrayBuffer();
      zip.file(file.name || `image-${Date.now()}.png`, arrayBuffer);
    }),
  );

  if (!hasImage) {
    throw new Error("No image files found in upload");
  }

  return zip.generateAsync({ type: "nodebuffer" });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const owner = env.REPLICATE_OWNER;
    const rawModelName = (formData.get("modelName") as string) || "storybook-flux";
    const sanitizedName = sanitizeModelName(rawModelName);
    const destination = `${owner}/${sanitizedName}`;

    const zipFile = formData.get("zip") as File | null;
    const fileList = formData.getAll("images") as File[];

    const buffer = await loadZipBuffer(zipFile ? zipFile : fileList);

    const replicateFile = await uploadTrainingZip(buffer);

    await ensureDestinationModel({ owner, name: sanitizedName });

    const { training, triggerWord } = await startFluxTraining({
      destination,
      inputImagesUrl: replicateFile.urls.get,
    });

    const record = createFineTuneRecord({
      trainingId: training.id,
      destination,
      triggerWord,
      owner,
      modelName: sanitizedName,
      inputUrl: replicateFile.urls.get,
      status: training.status,
      createdAt: new Date().toISOString(),
      version: training.output?.version,
      weightsUrl: training.output?.weights,
      error: training.error,
    });

    return NextResponse.json({
      success: true,
      trainingId: training.id,
      triggerWord,
      record,
    });
  } catch (error) {
    console.error("Fine-tune start error", error);
    const message = error instanceof Error ? error.message : "Failed to start fine-tuning";
    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const trainingId = searchParams.get("trainingId");
  if (!trainingId) {
    return NextResponse.json(
      { error: "trainingId is required" },
      { status: 400 },
    );
  }

  const record = getFineTuneRecord(trainingId);
  if (!record) {
    return NextResponse.json(
      { error: "Training not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ record });
}



