import { describe, it, expect } from "vitest";
import { RssCollector } from "../src/collectors/rss.collector";
import { GitHubCollector } from "../src/collectors/github.collector";
import { TmdbCollector } from "../src/collectors/tmdb.collector";
import { SpotifyCollector } from "../src/collectors/spotify.collector";
import { defaultCollectorRegistry } from "../src/collectors/index";
import { SourceConfig } from "../src/types/intelligence";

describe("Multi-Source Ingestion Collectors", () => {
  const sampleRssXml = `<?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0">
    <channel>
      <title>Google AI Blog</title>
      <link>https://blog.google/technology/ai/</link>
      <description>Latest news from Google AI</description>
      <item>
        <title>Announcing Next Generation Gemini 3.5</title>
        <link>https://blog.google/technology/ai/gemini-3-5/</link>
        <description><![CDATA[<p>Today we are rolling out Gemini 3.5 with expanded context and speed.</p>]]></description>
        <pubDate>Tue, 10 Nov 2026 08:00:00 GMT</pubDate>
      </item>
    </channel>
  </rss>`;

  const sampleAtomXml = `<?xml version="1.0" encoding="utf-8"?>
  <feed xmlns="http://www.w3.org/2005/Atom">
    <title>Meta Engineering</title>
    <link href="https://engineering.fb.com"/>
    <entry>
      <title>Optimizing PyTorch Compilation on Distributed Clusters</title>
      <link rel="alternate" href="https://engineering.fb.com/2026/pytorch-compilation/"/>
      <summary>Deep dive into PyTorch kernel autotuning across clusters.</summary>
      <updated>2026-11-09T14:30:00Z</updated>
    </entry>
  </feed>`;

  it("should parse standard RSS 2.0 feeds and sanitize HTML", () => {
    const collector = new RssCollector();
    const source: SourceConfig = {
      id: "src-ai",
      name: "Google AI",
      type: "rss",
      endpoint: "https://blog.google/technology/ai/rss/",
      enabled: true,
    };

    const items = collector.parseFeedXml(sampleRssXml, source, "tech-ecosystem");
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Announcing Next Generation Gemini 3.5");
    expect(items[0].url).toBe("https://blog.google/technology/ai/gemini-3-5/");
    expect(items[0].summary).toContain("Today we are rolling out Gemini 3.5");
    expect(items[0].id).toMatch(/^rss_/);
  });

  it("should parse Atom XML feeds with alternate links", () => {
    const collector = new RssCollector();
    const source: SourceConfig = {
      id: "src-meta",
      name: "Meta Engineering",
      type: "rss",
      endpoint: "https://engineering.fb.com/feed/",
      enabled: true,
    };

    const items = collector.parseFeedXml(sampleAtomXml, source, "tech-ecosystem");
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Optimizing PyTorch Compilation on Distributed Clusters");
    expect(items[0].url).toBe("https://engineering.fb.com/2026/pytorch-compilation/");
    expect(items[0].id).toMatch(/^atom_/);
  });

  it("should provide resilient curated fallback for GitHub collector when offline/unauthenticated", async () => {
    const collector = new GitHubCollector();
    const source: SourceConfig = {
      id: "gh-trends",
      name: "GitHub Trends",
      type: "github",
      endpoint: "https://api.github.com/repositories",
      enabled: true,
    };

    const items = collector.getCuratedFallback(source, "tech-ecosystem");
    expect(items.length).toBeGreaterThanOrEqual(2);
    expect(items[0].trackId).toBe("tech-ecosystem");
    expect(items[0].sourceName).toBe("GitHub Trends");
  });

  it("should provide resilient curated fallback for TMDB collector when API key is missing", async () => {
    const collector = new TmdbCollector();
    const source: SourceConfig = {
      id: "tmdb-trending",
      name: "TMDB Movies",
      type: "tmdb",
      endpoint: "https://api.themoviedb.org/3/trending/all/day",
      enabled: true,
    };

    const items = await collector.collect(source, "entertainment-hub");
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items[0].trackId).toBe("entertainment-hub");
    expect(items[0].title).toBeDefined();
  });

  it("should provide resilient curated fallback for Spotify collector", async () => {
    const collector = new SpotifyCollector();
    const source: SourceConfig = {
      id: "spotify-releases",
      name: "Spotify Global",
      type: "spotify",
      endpoint: "https://api.spotify.com/v1/browse/new-releases",
      enabled: true,
    };

    const items = await collector.collect(source, "global-music");
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items[0].trackId).toBe("global-music");
  });

  it("should resolve correct collector instances via CollectorRegistry", () => {
    expect(defaultCollectorRegistry.getCollector("rss")).toBeInstanceOf(RssCollector);
    expect(defaultCollectorRegistry.getCollector("github")).toBeInstanceOf(GitHubCollector);
    expect(defaultCollectorRegistry.getCollector("tmdb")).toBeInstanceOf(TmdbCollector);
    expect(defaultCollectorRegistry.getCollector("spotify")).toBeInstanceOf(SpotifyCollector);
  });
});
