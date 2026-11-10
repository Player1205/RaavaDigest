import { RawIngestionItem, SourceConfig, TrackId } from "@/types/intelligence";

export interface ICollector {
  readonly supportedType: string;
  collect(source: SourceConfig, trackId: TrackId): Promise<RawIngestionItem[]>;
}

export abstract class BaseCollector implements ICollector {
  abstract readonly supportedType: string;

  abstract collect(source: SourceConfig, trackId: TrackId): Promise<RawIngestionItem[]>;

  protected generateContentHash(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  protected sanitizeText(text: string): string {
    if (!text) return "";
    return text
      .replace(/<[^>]*>/g, "") // strip HTML tags
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();
  }
}
