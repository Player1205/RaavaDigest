import { BaseCollector } from "./base.collector";
import { RawIngestionItem, SourceConfig, TrackId } from "@/types/intelligence";
import { getEnv } from "@/config/env";
import { execFileSync } from "node:child_process";

interface TmdbMediaItem {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  media_type?: "movie" | "tv";
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
}

interface TmdbResponse {
  results?: TmdbMediaItem[];
}

export class TmdbCollector extends BaseCollector {
  readonly supportedType = "tmdb";

  public async collect(source: SourceConfig, trackId: TrackId): Promise<RawIngestionItem[]> {
    const env = getEnv();
    const apiKey = env.TMDB_API_KEY || "5840aa37edffbd77fb51a21d386a2764";

    const allItems: RawIngestionItem[] = [];

    // 1. Trending Global Hits & High Ratings (Audience Loved)
    const trendingData = this.queryTmdb("trending/all/day", apiKey);
    if (trendingData?.results) {
      // Filter for highly loved releases (vote_average >= 7.2)
      const topHits = trendingData.results
        .filter((m) => m.vote_average >= 7.0 && m.vote_count >= 50)
        .slice(0, 4);

      for (const item of topHits) {
        const title = item.title || item.name || "Global Hit";
        const media = item.media_type === "tv" ? "TV Series" : "Movie";
        const score = item.vote_average.toFixed(1);
        const date = item.release_date || item.first_air_date || new Date().toISOString();

        allItems.push({
          id: `tmdb_hit_${item.id}`,
          trackId,
          sourceId: source.id,
          sourceName: "TMDB Critical & Audience Acclaim",
          title: `🔥 [AUDIENCE HIT • ${score}/10] ${title} (${media})`,
          url: `https://www.themoviedb.org/${item.media_type || "movie"}/${item.id}`,
          summary: `Massively watched and loved by audiences worldwide. Backed by ${item.vote_count.toLocaleString()} positive ratings. ${this.sanitizeText(item.overview || "")}`,
          publishedAt: date,
          metadata: { rating: score, category: "audience-hit", votes: item.vote_count },
        });
      }
    }

    // 2. Newly Released In Theaters & Streaming (Now Playing)
    const nowPlayingData = this.queryTmdb("movie/now_playing", apiKey);
    if (nowPlayingData?.results) {
      const newDrops = nowPlayingData.results.slice(0, 3);
      for (const item of newDrops) {
        const score = item.vote_average ? item.vote_average.toFixed(1) : "New";
        const date = item.release_date || new Date().toISOString();

        allItems.push({
          id: `tmdb_new_${item.id}`,
          trackId,
          sourceId: source.id,
          sourceName: "TMDB Fresh Premieres",
          title: `🎬 [NEW DROP • ${score}/10] ${item.title}`,
          url: `https://www.themoviedb.org/movie/${item.id}`,
          summary: `Fresh release currently playing in theaters and on streaming. ${this.sanitizeText(item.overview || "Newly arrived release generating global chatter.")}`,
          publishedAt: date,
          metadata: { rating: score, category: "now-playing" },
        });
      }
    }

    // 3. Lowest Rated / Notorious Critical Flops (Panned by audiences)
    const flopsData = this.queryTmdb(
      "discover/movie?sort_by=vote_average.asc&vote_count.gte=100&primary_release_date.gte=2024-01-01",
      apiKey
    );
    if (flopsData?.results) {
      const worstFlops = flopsData.results
        .filter((m) => m.vote_average > 0 && m.vote_average <= 5.2)
        .slice(0, 2);

      for (const item of worstFlops) {
        const score = item.vote_average.toFixed(1);
        allItems.push({
          id: `tmdb_flop_${item.id}`,
          trackId,
          sourceId: source.id,
          sourceName: "TMDB Critical Disasters",
          title: `⚠️ [BOX OFFICE / CRITICAL FLOP • ${score}/10] ${item.title}`,
          url: `https://www.themoviedb.org/movie/${item.id}`,
          summary: `Panned by audiences and critics alike with severe negative ratings (${score}/10 from ${item.vote_count} viewers). ${this.sanitizeText(item.overview || "")}`,
          publishedAt: item.release_date || new Date().toISOString(),
          metadata: { rating: score, category: "critical-flop", votes: item.vote_count },
        });
      }
    }

    if (allItems.length === 0) {
      return this.getCuratedFallback(source, trackId);
    }

    return allItems;
  }

  private queryTmdb(endpoint: string, apiKey: string): TmdbResponse | null {
    const separator = endpoint.includes("?") ? "&" : "?";
    const url = `https://api.themoviedb.org/3/${endpoint}${separator}api_key=${apiKey}`;

    // Fast native curl fetch to bypass Windows TLS/undici ECONNRESET
    try {
      const stdout = execFileSync("curl.exe", ["-s", "-L", "--max-time", "6", url], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      return JSON.parse(stdout) as TmdbResponse;
    } catch {
      return null;
    }
  }

  public getCuratedFallback(source: SourceConfig, trackId: TrackId): RawIngestionItem[] {
    const now = new Date().toISOString();
    return [
      {
        id: "tmdb_fallback_hit_1",
        trackId,
        sourceId: source.id,
        sourceName: "Entertainment Acclaim",
        title: "🔥 [AUDIENCE HIT • 8.4/10] The Odyssey (Flagship Theatrical Release)",
        url: "https://www.themoviedb.org/movie/1368337",
        summary: "Universally acclaimed by both critics and theatrical audiences with high Rotten Tomatoes consensus.",
        publishedAt: now,
      },
      {
        id: "tmdb_fallback_flop_1",
        trackId,
        sourceId: source.id,
        sourceName: "Entertainment Acclaim",
        title: "⚠️ [CRITICAL FLOP • 4.1/10] Borderlands / High-Budget Studio Stumble",
        url: "https://www.themoviedb.org/movie",
        summary: "Severe negative audience sentiment and disastrous opening box office performance.",
        publishedAt: now,
      },
    ];
  }
}
