import { NextResponse } from "next/server";
import { IntelligenceRepository } from "@/lib/db/repository";

export async function GET(request: Request) {
  const repo = new IntelligenceRepository();
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (id) {
    const briefing = repo.getBriefingById(id);
    if (!briefing) {
      return NextResponse.json({ error: "Briefing not found" }, { status: 404 });
    }
    return NextResponse.json({ briefing });
  }

  const limitParam = url.searchParams.get("days");
  const limitDays = limitParam ? parseInt(limitParam, 10) : 7;
  const briefings = repo.getRecentBriefings(isNaN(limitDays) ? 7 : limitDays);

  return NextResponse.json({
    briefings,
    total: briefings.length,
    retentionWindowDays: 7,
  });
}
