import { NextRequest, NextResponse } from "next/server";

import { getTrainingStatus } from "@/lib/replicateFineTune";
import { getFineTuneRecord, updateFineTuneRecord } from "@/lib/trainingStore";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const trainingId = searchParams.get("trainingId");
  if (!trainingId) {
    return NextResponse.json(
      { error: "trainingId is required" },
      { status: 400 },
    );
  }

  const existing = getFineTuneRecord(trainingId);
  if (!existing) {
    return NextResponse.json(
      { error: "Training not found" },
      { status: 404 },
    );
  }

  try {
    const remote = await getTrainingStatus(trainingId);

    const updated = updateFineTuneRecord(trainingId, {
      status: remote.status,
      error: remote.error,
      version: remote.output?.version ?? existing.version,
      weightsUrl: remote.output?.weights ?? existing.weightsUrl,
    }) ?? existing;

    return NextResponse.json({
      record: updated,
      remote,
    });
  } catch (error) {
    console.error("Training status error", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch status",
        record: existing,
      },
      { status: 500 },
    );
  }
}


