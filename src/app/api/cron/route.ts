import { NextResponse } from "next/server";
import { IntelligenceRepository } from "@/lib/db/repository";
import { IntelligencePipelineService } from "@/services/pipeline.service";
import { getEnv } from "@/config/env";

export async function POST(request: Request) {
  return handleCronExecution(request);
}

export async function GET(request: Request) {
  return handleCronExecution(request);
}

async function handleCronExecution(request: Request) {
  const env = getEnv();
  const url = new URL(request.url);
  const secretParam = url.searchParams.get("secret");
  const authHeader = request.headers.get("authorization");

  const expectedSecret = env.CRON_SECRET;
  const isAuthorized =
    secretParam === expectedSecret ||
    authHeader === `Bearer ${expectedSecret}`;

  if (expectedSecret && !isAuthorized) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing cron secret." },
      { status: 401 }
    );
  }

  const repo = new IntelligenceRepository();
  const pipeline = new IntelligencePipelineService(repo);

  const result = await pipeline.runDailyPipeline();

  if (!result.success && result.error?.includes("failed")) {
    return NextResponse.json(result, { status: 500 });
  }

  return NextResponse.json(result, { status: 200 });
}
