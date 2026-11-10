import { NextResponse } from "next/server";
import { IntelligenceRepository } from "@/lib/db/repository";
import { IntelligencePipelineService } from "@/services/pipeline.service";
import { DetailDensity } from "@/types/intelligence";

export async function POST(req: Request) {
  try {
    const repo = new IntelligenceRepository();
    const pipeline = new IntelligencePipelineService(repo);

    let forcedDensity: DetailDensity | undefined;
    try {
      const body = await req.json();
      if (body && (body.density === "in-depth" || body.density === "compact")) {
        forcedDensity = body.density;
      }
    } catch {
      // Body empty or not JSON
    }

    // Immediate dispatch from dashboard forces execution even if paused
    const result = await pipeline.runDailyPipeline(true, forcedDensity);

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
