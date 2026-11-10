import { NextResponse } from "next/server";
import { IntelligenceRepository } from "@/lib/db/repository";
import { IntelligencePipelineService } from "@/services/pipeline.service";

export async function POST() {
  try {
    const repo = new IntelligenceRepository();
    const pipeline = new IntelligencePipelineService(repo);

    // Immediate dispatch from dashboard forces execution even if paused
    const result = await pipeline.runDailyPipeline(true);

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Immediate dispatch failed",
      },
      { status: 500 }
    );
  }
}
