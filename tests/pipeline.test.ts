import { describe, it, expect, beforeEach } from "vitest";
import { initDatabase } from "../src/lib/db/index";
import { IntelligenceRepository } from "../src/lib/db/repository";
import { IntelligencePipelineService } from "../src/services/pipeline.service";
import { DeliveryService } from "../src/services/delivery.service";
import { DailyBriefingPayload } from "../src/types/intelligence";

describe("Delivery Service & End-to-End Pipeline Orchestrator", () => {
  let repo: IntelligenceRepository;
  let pipeline: IntelligencePipelineService;

  beforeEach(() => {
    const db = initDatabase(":memory:");
    repo = new IntelligenceRepository(db);
    pipeline = new IntelligencePipelineService(repo);
  });

  it("should handle email dispatch gracefully even when simulated", async () => {
    const delivery = new DeliveryService();
    const payload: DailyBriefingPayload = {
      id: "briefing-test",
      date: "2026-11-10",
      subject: "Test Briefing",
      density: "compact",
      sections: [],
      totalRawItemsIngested: 0,
      totalItemsHighlighted: 0,
      generatedAt: new Date().toISOString(),
      htmlBody: "<p>Briefing content</p>",
      stats: { durationMs: 100, sourcesProcessed: 0, tracksActive: 0 },
    };

    const res = await delivery.dispatchBriefingEmail("test@example.com", payload);
    expect(res.success).toBe(true);
    expect(res.messageId).toBeDefined();
  });

  it("should execute the end-to-end pipeline, record briefing, and return result", async () => {
    const result = await pipeline.runDailyPipeline();

    expect(result.success).toBe(true);
    expect(result.briefingId).toBeDefined();
    expect(result.durationMs).toBeGreaterThan(0);

    const briefings = repo.getRecentBriefings(7);
    expect(briefings.length).toBeGreaterThanOrEqual(1);
    expect(briefings[0].id).toBe(result.briefingId);
    expect(briefings[0].htmlBody).toContain("Personal Intelligence Engine");
  }, 20000);

  it("should honor paused state when not forced", async () => {
    repo.saveUserPreferences({ isPaused: true });

    const result = await pipeline.runDailyPipeline(false);
    expect(result.success).toBe(true);
    expect(result.error).toContain("paused");

    // When forced (e.g. manual test trigger from dashboard), it should run anyway
    const forcedResult = await pipeline.runDailyPipeline(true);
    expect(forcedResult.briefingId).toBeDefined();
  }, 20000);
});
