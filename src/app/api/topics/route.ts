import { NextResponse } from "next/server";
import { IntelligenceRepository } from "@/lib/db/repository";

export async function GET() {
  const repo = new IntelligenceRepository();
  const topics = repo.getCustomTopics();
  return NextResponse.json({ topics });
}

export async function POST(request: Request) {
  try {
    const repo = new IntelligenceRepository();
    const body = await request.json();

    if (body.action === "toggle" && body.id !== undefined && body.enabled !== undefined) {
      const ok = repo.toggleCustomTopic(body.id, Boolean(body.enabled));
      return NextResponse.json({ success: ok });
    }

    if (body.action === "delete" && body.id) {
      const ok = repo.removeCustomTopic(body.id);
      return NextResponse.json({ success: ok });
    }

    if (body.prompt && body.resolvedName && body.sourceUrl) {
      const created = repo.addCustomTopic({
        prompt: body.prompt,
        resolvedName: body.resolvedName,
        resolvedDescription: body.resolvedDescription || `Custom intelligence track for ${body.prompt}`,
        sourceUrl: body.sourceUrl,
        sourceType: body.sourceType || "rss",
      });
      return NextResponse.json(created);
    }

    return NextResponse.json({ error: "Invalid topic payload" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to process custom topic" },
      { status: 500 }
    );
  }
}
