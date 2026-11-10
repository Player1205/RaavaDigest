import { IntelligenceRepository } from "@/lib/db/repository";
import { RawIngestionItem } from "@/types/intelligence";
import crypto from "node:crypto";

export class DeduplicationService {
  private repo: IntelligenceRepository;

  constructor(repo: IntelligenceRepository) {
    this.repo = repo;
  }

  public normalizeUrl(rawUrl: string): string {
    try {
      const url = new URL(rawUrl);
      // Strip common tracking and referral parameters
      const trackingParams = [
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_term",
        "utm_content",
        "fbclid",
        "gclid",
        "ref",
        "source",
      ];
      for (const param of trackingParams) {
        url.searchParams.delete(param);
      }
      return url.toString().replace(/\/$/, ""); // Strip trailing slash
    } catch {
      return rawUrl.trim().toLowerCase();
    }
  }

  public computeItemHash(title: string, url: string): string {
    const normalized = `${this.normalizeUrl(url)}::${title.trim().toLowerCase()}`;
    return crypto.createHash("sha256").update(normalized).digest("hex").substring(0, 24);
  }

  public filterDuplicates(items: RawIngestionItem[]): {
    unique: RawIngestionItem[];
    duplicateCount: number;
  } {
    const unique: RawIngestionItem[] = [];
    const seenHashesInBatch = new Set<string>();
    const seenUrlsInBatch = new Set<string>();

    let duplicateCount = 0;

    for (const item of items) {
      const normalizedUrl = this.normalizeUrl(item.url);
      const hash = this.computeItemHash(item.title, normalizedUrl);

      // Check intra-batch duplicate
      if (seenHashesInBatch.has(hash) || seenUrlsInBatch.has(normalizedUrl)) {
        duplicateCount++;
        continue;
      }

      // Check repository historical duplicate (past 7 days)
      if (this.repo.isItemAlreadyIngested(item.id, normalizedUrl) || this.repo.isItemAlreadyIngested(hash, item.url)) {
        duplicateCount++;
        continue;
      }

      seenHashesInBatch.add(hash);
      seenUrlsInBatch.add(normalizedUrl);
      unique.push({
        ...item,
        id: hash,
        url: normalizedUrl,
      });
    }

    return { unique, duplicateCount };
  }
}
