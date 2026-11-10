import { BaseCollector } from "./base.collector";
import { RawIngestionItem, SourceConfig, TrackId } from "@/types/intelligence";
import { getEnv } from "@/config/env";

interface TmdbMediaItem {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  media_type: "movie" | "tv";
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  popularity: number;
}

interface TmdbTrendingResponse {
  page: number;
  results: TmdbMediaItem[];
}

export class TmdbCollector extends BaseCollector {
  readonly supportedType = "tmdb";

  public async collect(source: SourceConfig, trackId: TrackId): Promise<RawIngestionItem[]> {
    const env = getEnv();
    const apiKey = env.TMDB_API_KEY;

    if (!apiKey) {
      return this.getCuratedFallback(source, trackId);
    }

    try {
      const url = `https://api.themoviedb.org/3/trending/all/day?api_key=${apiKey}`;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        console.warn(`[TmdbCollector] API returned status ${res.status}. Falling back to curated entertainment.`);
        return this.getCuratedFallback(source, trackId);
      }

      const data = (await res.json()) as TmdbTrendingResponse;
      if (!data.results || !Array.isArray(data.results)) {
        return this.getCuratedFallback(source, trackId);
      }

      return data.results.slice(0, 10).map((item) => {
        const title = item.title || item.name || "Trending Title";
        const isMovie = item.media_type === "movie";
        const date = item.release_date || item.first_air_date || new Date().toISOString();
        const score = item.vote_average ? item.vote_average.toFixed(1) : "N/A";

        return {
          id: `tmdb_${item.id}`,
          trackId,
          sourceId: source.id,
          sourceName: source.name,
          title: `${title} [${isMovie ? "Movie" : "TV Series"} - Rating: ${score}/10]`,
          url: `https://www.themoviedb.org/${item.media_type}/${item.id}`,
          summary: this.sanitizeText(item.overview || `Trending ${item.media_type} release generating buzz.`),
          publishedAt: date,
          metadata: {
            rating: score,
            mediaType: item.media_type,
          },
        };
      });
    } catch (err) {
      console.error(`[TmdbCollector] Error querying TMDB API:`, err);
      return this.getCuratedFallback(source, trackId);
    }
  }

  public getCuratedFallback(source: SourceConfig, trackId: TrackId): RawIngestionItem[] {
    const now = new Date().toISOString();
    return [
      {
        id: "tmdb_fallback_boxoffice_1",
        trackId,
        sourceId: source.id,
        sourceName: source.name,
        title: "Global Weekend Box Office & Theatrical Releases",
        url: "https://www.themoviedb.org/movie",
        summary: "Top theatrical performers, international box office earnings, and new wide-release debuts.",
        publishedAt: now,
      },
      {
        id: "tmdb_fallback_streaming_1",
        trackId,
        sourceId: source.id,
        sourceName: source.name,
        title: "Flagship Streaming Premieres & Critical Consensus",
        url: "https://www.themoviedb.org/tv",
        summary: "High-budget prestige television premieres and award-season buzz arriving on digital platforms.",
        publishedAt: now,
      },
    ];
  }
}
