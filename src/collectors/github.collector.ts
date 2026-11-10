import { BaseCollector } from "./base.collector";
import { RawIngestionItem, SourceConfig, TrackId } from "@/types/intelligence";
import { getEnv } from "@/config/env";

interface GitHubRepoItem {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  pushed_at: string;
  topics?: string[];
}

interface GitHubSearchResponse {
  total_count: number;
  items: GitHubRepoItem[];
}

export class GitHubCollector extends BaseCollector {
  readonly supportedType = "github";

  public async collect(source: SourceConfig, trackId: TrackId): Promise<RawIngestionItem[]> {
    const env = getEnv();
    const token = env.GITHUB_TOKEN;

    // Search for top trending / recently updated flagship frameworks and libraries
    const searchUrl =
      "https://api.github.com/search/repositories?q=topic:react+OR+topic:gemini+OR+topic:fastify+OR+topic:nodejs+OR+language:rust+OR+language:cpp+stars:>500+pushed:>2026-01-01&sort=updated&order=desc&per_page=10";

    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Personal-Intelligence-Engine/1.0",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(searchUrl, {
        headers,
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        console.warn(`[GitHubCollector] API returned status ${res.status}. Using curated open-source releases.`);
        return this.getCuratedFallback(source, trackId);
      }

      const data = (await res.json()) as GitHubSearchResponse;
      if (!data.items || !Array.isArray(data.items)) {
        return this.getCuratedFallback(source, trackId);
      }

      return data.items.map((repo) => ({
        id: `gh_${repo.id}`,
        trackId,
        sourceId: source.id,
        sourceName: source.name,
        title: `${repo.full_name} (${repo.language || "Open Source"} - ⭐ ${repo.stargazers_count})`,
        url: repo.html_url,
        summary: this.sanitizeText(
          repo.description || `High-velocity updates to ${repo.full_name}. Active engineering commits and release tags.`
        ),
        publishedAt: repo.pushed_at || new Date().toISOString(),
        metadata: {
          stars: repo.stargazers_count,
          language: repo.language || "Unknown",
        },
      }));
    } catch (err) {
      console.error(`[GitHubCollector] Failed to fetch live GitHub data:`, err);
      return this.getCuratedFallback(source, trackId);
    }
  }

  public getCuratedFallback(source: SourceConfig, trackId: TrackId): RawIngestionItem[] {
    const now = new Date().toISOString();
    return [
      {
        id: `gh_fallback_nodejs`,
        trackId,
        sourceId: source.id,
        sourceName: source.name,
        title: "nodejs/node: Node.js JavaScript Runtime Core Updates",
        url: "https://github.com/nodejs/node/releases",
        summary: "Active performance enhancements, V8 engine integration, and security fixes landed in core runtime.",
        publishedAt: now,
      },
      {
        id: `gh_fallback_fastify`,
        trackId,
        sourceId: source.id,
        sourceName: source.name,
        title: "fastify/fastify: Fast and low overhead web framework for Node.js",
        url: "https://github.com/fastify/fastify/releases",
        summary: "High-throughput HTTP benchmarks, improved TypeScript route definitions, and schema parsing optimizations.",
        publishedAt: now,
      },
      {
        id: `gh_fallback_rust`,
        trackId,
        sourceId: source.id,
        sourceName: source.name,
        title: "rust-lang/rust: Empowering everyone to build reliable and efficient software",
        url: "https://github.com/rust-lang/rust/releases",
        summary: "Compiler optimizations, async improvements, and stabilization of new standard library APIs.",
        publishedAt: now,
      },
    ];
  }
}
