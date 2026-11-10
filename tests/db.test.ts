import { describe, it, expect, beforeEach } from "vitest";
import { initDatabase } from "../src/lib/db/index";
import { IntelligenceRepository } from "../src/lib/db/repository";
import { BriefingRecord, RawIngestionItem } from "../src/types/intelligence";

describe("Database Repository & 7-Day TTL Retention Layer", () => {
  let repo: IntelligenceRepository;

  beforeEach(() => {
    const db = initDatabase(":memory:");
    repo = new IntelligenceRepository(db);
  });

  it("should save and retrieve briefings correctly", () => {
    const briefing: BriefingRecord = {
      id: "briefing-101",
      date: "2026-11-10",
      subject: "Personal Daily Intelligence Briefing",
      density: "compact",
      totalItems: 12,
      htmlBody: "<h1>Daily Digest</h1>",
      jsonData: JSON.stringify({ test: true }),
      dispatchedAt: new Date().toISOString(),
      deliveredStatus: "delivered",
      retentionExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    repo.saveBriefing(briefing);

    const retrieved = repo.getBriefingById("briefing-101");
    expect(retrieved).not.toBeNull();
    expect(retrieved?.subject).toBe("Personal Daily Intelligence Briefing");
    expect(retrieved?.totalItems).toBe(12);

    const byDate = repo.getBriefingByDate("2026-11-10");
    expect(byDate?.id).toBe("briefing-101");
  });

  it("should enforce strict 7-day TTL rolling purge", () => {
    const now = new Date();
    const expiredRetention = new Date(now.getTime() - 1000).toISOString(); // Expired 1s ago
    const validRetention = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(); // 5 days left

    const expiredBriefing: BriefingRecord = {
      id: "briefing-expired",
      date: "2026-11-01",
      subject: "Old Briefing",
      density: "compact",
      totalItems: 5,
      htmlBody: "<p>Old</p>",
      jsonData: "{}",
      dispatchedAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      deliveredStatus: "delivered",
      retentionExpiresAt: expiredRetention,
    };

    const validBriefing: BriefingRecord = {
      id: "briefing-active",
      date: "2026-11-09",
      subject: "Active Briefing",
      density: "compact",
      totalItems: 8,
      htmlBody: "<p>Active</p>",
      jsonData: "{}",
      dispatchedAt: now.toISOString(),
      deliveredStatus: "delivered",
      retentionExpiresAt: validRetention,
    };

    repo.saveBriefing(expiredBriefing);
    repo.saveBriefing(validBriefing);

    // Save expired and active ingested item
    const mockItem: RawIngestionItem = {
      id: "hash-123",
      trackId: "tech-ecosystem",
      sourceId: "src-1",
      sourceName: "Source 1",
      title: "Test",
      url: "https://example.com/test",
      summary: "Summary",
      publishedAt: now.toISOString(),
    };
    repo.recordIngestedItem(mockItem, -1); // expired 1 day ago

    const purgeResult = repo.purgeExpiredRecords(now);
    expect(purgeResult.briefingsPurged).toBe(1);
    expect(purgeResult.itemsPurged).toBe(1);

    expect(repo.getBriefingById("briefing-expired")).toBeNull();
    expect(repo.getBriefingById("briefing-active")).not.toBeNull();
  });

  it("should record ingested items and check deduplication", () => {
    const item: RawIngestionItem = {
      id: "hash-abc",
      trackId: "tech-ecosystem",
      sourceId: "src-tech",
      sourceName: "Tech News",
      title: "New React Version Released",
      url: "https://react.dev/blog/version-test",
      summary: "Major release update",
      publishedAt: new Date().toISOString(),
    };

    expect(repo.isItemAlreadyIngested(item.id, item.url)).toBe(false);
    repo.recordIngestedItem(item, 7);
    expect(repo.isItemAlreadyIngested(item.id, item.url)).toBe(true);
    expect(repo.isItemAlreadyIngested("other-hash", item.url)).toBe(true);
  });

  it("should manage single-user preferences cleanly without authentication tables", () => {
    const prefs = repo.getUserPreferences();
    expect(prefs.notificationEmail).toBeDefined();
    expect(prefs.activeTracks["tech-ecosystem"]).toBe(true);

    const updated = repo.saveUserPreferences({
      isPaused: true,
      trackDensities: { "tech-ecosystem": "in-depth" },
    });

    expect(updated.isPaused).toBe(true);
    expect(updated.trackDensities["tech-ecosystem"]).toBe("in-depth");
  });

  it("should add, toggle, and remove custom topics", () => {
    const created = repo.addCustomTopic({
      prompt: "Formula 1 Racing",
      resolvedName: "F1 Grand Prix Intel",
      resolvedDescription: "Live telemetry and race summaries",
      sourceUrl: "https://www.formula1.com/feed.xml",
      sourceType: "rss",
    });

    expect(created.id).toBeDefined();
    expect(created.prompt).toBe("Formula 1 Racing");

    let topics = repo.getCustomTopics();
    expect(topics).toHaveLength(1);
    expect(topics[0].enabled).toBe(true);

    repo.toggleCustomTopic(created.id, false);
    topics = repo.getCustomTopics();
    expect(topics[0].enabled).toBe(false);

    repo.removeCustomTopic(created.id);
    topics = repo.getCustomTopics();
    expect(topics).toHaveLength(0);
  });
});
