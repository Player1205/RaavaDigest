import { NextResponse } from "next/server";
import { IntelligenceRepository } from "@/lib/db/repository";
import { UserPreferences } from "@/types/intelligence";

export async function GET() {
  const repo = new IntelligenceRepository();
  const prefs = repo.getUserPreferences();
  return NextResponse.json(prefs);
}

export async function POST(request: Request) {
  try {
    const repo = new IntelligenceRepository();
    const body = (await request.json()) as Partial<UserPreferences>;
    const updated = repo.saveUserPreferences(body);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update preferences" },
      { status: 400 }
    );
  }
}
