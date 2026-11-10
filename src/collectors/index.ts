import { ICollector } from "./base.collector";
import { RssCollector } from "./rss.collector";
import { GitHubCollector } from "./github.collector";
import { TmdbCollector } from "./tmdb.collector";
import { SpotifyCollector } from "./spotify.collector";
import { SourceType } from "@/types/intelligence";

export class CollectorRegistry {
  private collectors: Map<string, ICollector> = new Map();

  constructor() {
    this.register(new RssCollector());
    this.register(new GitHubCollector());
    this.register(new TmdbCollector());
    this.register(new SpotifyCollector());
  }

  public register(collector: ICollector): void {
    this.collectors.set(collector.supportedType, collector);
  }

  public getCollector(type: SourceType): ICollector {
    const collector = this.collectors.get(type);
    if (!collector) {
      // Fallback to RSS if custom or unrecognized
      return this.collectors.get("rss")!;
    }
    return collector;
  }
}

export const defaultCollectorRegistry = new CollectorRegistry();

export {
  ICollector,
  RssCollector,
  GitHubCollector,
  TmdbCollector,
  SpotifyCollector,
};
