import { IntelligenceRepository } from "@/lib/db/repository";
import { DeduplicationService } from "./dedup.service";
import { CollectorRegistry, defaultCollectorRegistry } from "@/collectors";
import { DEFAULT_CORE_TRACKS } from "@/config/constants";
import {
  InterestTrackConfig,
  RawIngestionItem,
  SourceConfig,
  TrackId,
} from "@/types/intelligence";

export class IngestionService {
  private repo: IntelligenceRepository;
  private dedupService: DeduplicationService;
  private registry: CollectorRegistry;

  constructor(
    repo: IntelligenceRepository,
    registry: CollectorRegistry = defaultCollectorRegistry
  ) {
    this.repo = repo;
    this.dedupService = new DeduplicationService(repo);
    this.registry = registry;
  }

  public async collectAllActiveTracks(): Promise<{
    itemsByTrack: Map<TrackId, RawIngestionItem[]>;
    rawByTrack: Map<TrackId, RawIngestionItem[]>;
    totalRawCollected: number;
    totalUniqueItems: number;
    totalDuplicatesFiltered: number;
  }> {
    const prefs = this.repo.getUserPreferences();
    const activeTracks = this.buildActiveTracksConfiguration(prefs.activeTracks);

    const allRawItems: RawIngestionItem[] = [];
    const rawByTrack = new Map<TrackId, RawIngestionItem[]>();

    // Process all active tracks in parallel
    const trackPromises = activeTracks.map(async (track) => {
      const sourcePromises = track.sources
        .filter((src) => src.enabled)
        .map(async (src) => {
          try {
            const collector = this.registry.getCollector(src.type);
            const items = await collector.collect(src, track.id);
            return items;
          } catch (err) {
            console.error(`[IngestionService] Collector failure for source ${src.name}:`, err);
            return [];
          }
        });

      const trackResults = await Promise.all(sourcePromises);
      const flattened = trackResults.flat();
      rawByTrack.set(track.id, flattened);
      return flattened;
    });

    const results = await Promise.all(trackPromises);
    for (const list of results) {
      allRawItems.push(...list);
    }

    // Filter duplicates against 7-day database history and intra-batch
    const { unique, duplicateCount } = this.dedupService.filterDuplicates(allRawItems);

    // Group unique items by trackId
    const itemsByTrack = new Map<TrackId, RawIngestionItem[]>();
    for (const item of unique) {
      const list = itemsByTrack.get(item.trackId) || [];
      list.push(item);
      itemsByTrack.set(item.trackId, list);
    }

    return {
      itemsByTrack,
      rawByTrack,
      totalRawCollected: allRawItems.length,
      totalUniqueItems: unique.length,
      totalDuplicatesFiltered: duplicateCount,
    };
  }

  public recordDispatchedItems(items: RawIngestionItem[]): void {
    for (const item of items) {
      this.repo.recordIngestedItem(item);
    }
  }

  public buildActiveTracksConfiguration(
    activePreferences: Record<TrackId, boolean>
  ): InterestTrackConfig[] {
    const tracks: InterestTrackConfig[] = [];

    // 1. Core tracks
    for (const core of DEFAULT_CORE_TRACKS) {
      const isEnabled = activePreferences[core.id] !== undefined ? activePreferences[core.id] : core.enabled;
      if (isEnabled) {
        tracks.push(core);
      }
    }

    // 2. Custom topics resolved by user
    const customTopics = this.repo.getCustomTopics().filter((t) => t.enabled);
    for (const custom of customTopics) {
      const trackId = `custom-${custom.id}`;
      const isEnabled = activePreferences[trackId] !== undefined ? activePreferences[trackId] : true;

      if (isEnabled) {
        const customSource: SourceConfig = {
          id: `src-${custom.id}`,
          name: custom.resolvedName,
          type: custom.sourceType,
          endpoint: custom.sourceUrl,
          enabled: true,
        };

        tracks.push({
          id: trackId,
          name: custom.resolvedName,
          description: custom.resolvedDescription,
          enabled: true,
          density: "compact",
          isCore: false,
          sources: [customSource],
        });
      }
    }

    return tracks;
  }
}
