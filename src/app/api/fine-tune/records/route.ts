export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import { listFineTuneRecords } from "@/lib/trainingStore";

export async function GET() {
  const records = listFineTuneRecords();
  return NextResponse.json(
    { records },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}



