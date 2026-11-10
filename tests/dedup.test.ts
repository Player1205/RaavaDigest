import { describe, it, expect, beforeEach } from "vitest";
import { initDatabase } from "../src/lib/db/index";
import { IntelligenceRepository } from "../src/lib/db/repository";
import { DeduplicationService } from "../src/services/dedup.service";
import { IngestionService } from "../src/services/ingestion.service";
import { RawIngestionItem } from "../src/types/intelligence";

describe("Deduplication Engine & Ingestion Coordinator", () => {
  let repo: IntelligenceRepository;
  let dedupService: DeduplicationService;

  beforeEach(() => {
    const db = initDatabase(":memory:");
    repo = new IntelligenceRepository(db);
    dedupService = new DeduplicationService(repo);
  });

  it("should normalize URLs by stripping tracking parameters", () => {
    const raw = "https://react.dev/blog/2026?utm_source=twitter&utm_medium=social&ref=feed#section";
    const normalized = dedupService.normalizeUrl(raw);
    expect(normalized).toBe("https://react.dev/blog/2026#section");
  });

  it("should detect and eliminate intra-batch duplicate items", () => {
    const items: RawIngestionItem[] = [
      {
        id: "item-1",
        trackId: "tech-ecosystem",
        sourceId: "src-1",
        sourceName: "Source A",
        title: "Major Fastify Release",
        url: "https://fastify.dev/releases/v5?utm_source=newsletter",
        summary: "Details about Fastify v5",
        publishedAt: new Date().toISOString(),
      },
      {
        id: "item-2",
        trackId: "tech-ecosystem",
        sourceId: "src-2",
        sourceName: "Source B",
        title: "Major Fastify Release",
        url: "https://fastify.dev/releases/v5",
        summary: "Another duplicate feed entry",
        publishedAt: new Date().toISOString(),
      },
      {
        id: "item-3",
        trackId: "tech-ecosystem",
        sourceId: "src-3",
        sourceName: "Source C",
        title: "Next.js 16 Arrives",
        url: "https://nextjs.org/blog/next-16",
        summary: "Details about Next.js",
        publishedAt: new Date().toISOString(),
      },
    ];

    const result = dedupService.filterDuplicates(items);
    expect(result.unique).toHaveLength(2);
    expect(result.duplicateCount).toBe(1);
    expect(result.unique.map((u) => u.title)).toEqual([
      "Major Fastify Release",
      "Next.js 16 Arrives",
    ]);
  });

  it("should cross-reference against previously dispatched repository records", () => {
    const historicalItem: RawIngestionItem = {
      id: "prev-hash",
      trackId: "entertainment-hub",
      sourceId: "tmdb-1",
      sourceName: "TMDB",
      title: "Avatar 3 Official Trailer Drops",
      url: "https://themoviedb.org/movie/123",
      summary: "First look trailer",
      publishedAt: new Date().toISOString(),
    };

    repo.recordIngestedItem(historicalItem);

    const incomingItems: RawIngestionItem[] = [
      {
        id: "new-hash-1",
        trackId: "entertainment-hub",
        sourceId: "tmdb-1",
        sourceName: "TMDB",
        title: "Avatar 3 Official Trailer Drops",
        url: "https://themoviedb.org/movie/123?ref=rss",
        summary: "Identical movie trailer from another aggregator",
        publishedAt: new Date().toISOString(),
      },
      {
        id: "new-hash-2",
        trackId: "entertainment-hub",
        sourceId: "tmdb-1",
        sourceName: "TMDB",
        title: "Dune 3 Pre-Production Confirmed",
        url: "https://themoviedb.org/movie/456",
        summary: "Production confirmed",
        publishedAt: new Date().toISOString(),
      },
    ];

    const result = dedupService.filterDuplicates(incomingItems);
    expect(result.unique).toHaveLength(1);
    expect(result.unique[0].title).toBe("Dune 3 Pre-Production Confirmed");
    expect(result.duplicateCount).toBe(1);
  });

  it("should configure active tracks including custom topics properly", () => {
    const ingestionService = new IngestionService(repo);

    repo.addCustomTopic({
      prompt: "Space Exploration",
      resolvedName: "NASA & SpaceX Mission Feeds",
      resolvedDescription: "Launches and telescope discoveries",
      sourceUrl: "https://www.nasa.gov/news/feed.xml",
      sourceType: "rss",
    });

    const tracks = ingestionService.buildActiveTracksConfiguration({
      "tech-ecosystem": true,
      "entertainment-hub": false,
      "global-music": true,
    });

    // 2 core tracks enabled + 1 custom topic = 3 tracks
    expect(tracks.length).toBe(3);
    expect(tracks.find((t) => t.id === "tech-ecosystem")).toBeDefined();
    expect(tracks.find((t) => t.id === "entertainment-hub")).toBeUndefined();
    expect(tracks.find((t) => t.id.startsWith("custom-"))).toBeDefined();
  });
});
