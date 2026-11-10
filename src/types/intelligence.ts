export type TrackId = "tech-ecosystem" | "entertainment-hub" | "global-music" | string;

export type DetailDensity = "compact" | "in-depth";

export interface InterestTrackConfig {
  id: TrackId;
  name: string;
  description: string;
  enabled: boolean;
  density: DetailDensity;
  isCore: boolean;
  sources: SourceConfig[];
}

export type SourceType = "rss" | "github" | "tmdb" | "spotify" | "custom_api";

export interface SourceConfig {
  id: string;
  name: string;
  type: SourceType;
  endpoint: string;
  enabled: boolean;
  params?: Record<string, string | number | boolean>;
}

export interface RawIngestionItem {
  id: string; // Content hash or source unique identifier
  trackId: TrackId;
  sourceId: string;
  sourceName: string;
  title: string;
  url: string;
  summary: string;
  publishedAt: string; // ISO date string
  category?: string;
  author?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface SynthesizedTrackSection {
  trackId: TrackId;
  trackName: string;
  summary: string;
  highlights: SynthesizedHighlight[];
}

export interface SynthesizedHighlight {
  title: string;
  takeaway: string;
  details: string;
  sourceName: string;
  sourceUrl: string;
  urgencyOrImpact: "high" | "medium" | "low";
}

export interface DailyBriefingPayload {
  id: string;
  date: string; // YYYY-MM-DD
  subject: string;
  density: DetailDensity;
  sections: SynthesizedTrackSection[];
  totalRawItemsIngested: number;
  totalItemsHighlighted: number;
  generatedAt: string;
  htmlBody: string;
  stats: {
    durationMs: number;
    sourcesProcessed: number;
    tracksActive: number;
  };
}

export interface BriefingRecord {
  id: string;
  date: string; // YYYY-MM-DD
  subject: string;
  density: DetailDensity;
  totalItems: number;
  htmlBody: string;
  jsonData: string; // Serialized DailyBriefingPayload
  dispatchedAt: string;
  deliveredStatus: "delivered" | "failed" | "skipped";
  retentionExpiresAt: string; // ISO date for 7-day TTL purge
}

export interface UserPreferences {
  activeTracks: Record<TrackId, boolean>;
  trackDensities: Record<TrackId, DetailDensity>;
  notificationEmail: string;
  deliveryHourUtc: number; // e.g. 7 for 7:00 AM UTC
  isPaused: boolean;
  customTopics: CustomTopicRecord[];
}

export interface CustomTopicRecord {
  id: string;
  prompt: string;
  resolvedName: string;
  resolvedDescription: string;
  sourceUrl: string;
  sourceType: SourceType;
  createdAt: string;
  enabled: boolean;
}

export interface DispatchRunResult {
  success: boolean;
  briefingId?: string;
  subject?: string;
  itemCount?: number;
  dispatchedEmail?: string;
  purgedCount?: number;
  error?: string;
  durationMs: number;
}
