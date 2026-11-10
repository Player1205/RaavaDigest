import { XMLParser } from "fast-xml-parser";
import { BaseCollector } from "./base.collector";
import { RawIngestionItem, SourceConfig, TrackId } from "@/types/intelligence";

export class RssCollector extends BaseCollector {
  readonly supportedType = "rss";
  private parser: XMLParser;

  constructor() {
    super();
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      textNodeName: "#text",
      trimValues: true,
      parseTagValue: false,
    });
  }

  public async collect(source: SourceConfig, trackId: TrackId): Promise<RawIngestionItem[]> {
    try {
      const response = await fetch(source.endpoint, {
        headers: {
          "User-Agent": "Personal-Intelligence-Engine/1.0 (+https://github.com/personal-intelligence)",
          Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        console.warn(`[RssCollector] Failed to fetch feed ${source.endpoint}: status ${response.status}`);
        return [];
      }

      const xmlText = await response.text();
      return this.parseFeedXml(xmlText, source, trackId);
    } catch (err) {
      console.error(`[RssCollector] Error parsing feed ${source.name} (${source.endpoint}):`, err);
      return [];
    }
  }

  public parseFeedXml(xmlContent: string, source: SourceConfig, trackId: TrackId): RawIngestionItem[] {
    const parsed = this.parser.parse(xmlContent);
    const items: RawIngestionItem[] = [];

    // Support Standard RSS 2.0 (rss.channel.item)
    if (parsed.rss?.channel?.item) {
      const rawList = Array.isArray(parsed.rss.channel.item)
        ? parsed.rss.channel.item
        : [parsed.rss.channel.item];

      for (const item of rawList.slice(0, 10)) {
        const title = this.extractString(item.title) || "Untitled Update";
        const link = this.extractLink(item.link) || source.endpoint;
        const rawDesc = this.extractString(item.description || item["content:encoded"] || "");
        const summary = this.sanitizeText(rawDesc).slice(0, 500);
        const pubDateRaw = item.pubDate || item.date || new Date().toISOString();
        const publishedAt = this.normalizeDate(pubDateRaw);
        const id = `rss_${this.generateContentHash(link + title)}`;

        items.push({
          id,
          trackId,
          sourceId: source.id,
          sourceName: source.name,
          title: this.sanitizeText(title),
          url: link,
          summary: summary || title,
          publishedAt,
        });
      }
    }

    // Support Atom Feeds (feed.entry)
    else if (parsed.feed?.entry) {
      const rawEntries = Array.isArray(parsed.feed.entry)
        ? parsed.feed.entry
        : [parsed.feed.entry];

      for (const entry of rawEntries.slice(0, 10)) {
        const title = this.extractString(entry.title) || "Untitled Update";
        const link = this.extractAtomLink(entry.link) || source.endpoint;
        const rawContent = this.extractString(entry.summary || entry.content || "");
        const summary = this.sanitizeText(rawContent).slice(0, 500);
        const pubDateRaw = entry.updated || entry.published || new Date().toISOString();
        const publishedAt = this.normalizeDate(pubDateRaw);
        const id = `atom_${this.generateContentHash(link + title)}`;

        items.push({
          id,
          trackId,
          sourceId: source.id,
          sourceName: source.name,
          title: this.sanitizeText(title),
          url: link,
          summary: summary || title,
          publishedAt,
        });
      }
    }

    return items;
  }

  private extractString(val: unknown): string {
    if (!val) return "";
    if (typeof val === "string") return val;
    if (typeof val === "object" && val !== null) {
      if ("#text" in val && typeof (val as Record<string, unknown>)["#text"] === "string") {
        return (val as Record<string, unknown>)["#text"] as string;
      }
      if ("__cdata" in val && typeof (val as Record<string, unknown>)["__cdata"] === "string") {
        return (val as Record<string, unknown>)["__cdata"] as string;
      }
    }
    return String(val);
  }

  private extractLink(linkVal: unknown): string {
    if (typeof linkVal === "string") return linkVal;
    if (typeof linkVal === "object" && linkVal !== null) {
      if ("@_href" in linkVal && typeof (linkVal as Record<string, unknown>)["@_href"] === "string") {
        return (linkVal as Record<string, unknown>)["@_href"] as string;
      }
      if ("#text" in linkVal && typeof (linkVal as Record<string, unknown>)["#text"] === "string") {
        return (linkVal as Record<string, unknown>)["#text"] as string;
      }
    }
    return "";
  }

  private extractAtomLink(linkVal: unknown): string {
    if (Array.isArray(linkVal)) {
      const alt = linkVal.find((l) => l["@_rel"] === "alternate" || !l["@_rel"]);
      if (alt && alt["@_href"]) return alt["@_href"];
      if (linkVal[0] && linkVal[0]["@_href"]) return linkVal[0]["@_href"];
    } else if (typeof linkVal === "object" && linkVal !== null) {
      if ("@_href" in linkVal && typeof (linkVal as Record<string, unknown>)["@_href"] === "string") {
        return (linkVal as Record<string, unknown>)["@_href"] as string;
      }
    }
    return typeof linkVal === "string" ? linkVal : "";
  }

  private normalizeDate(dateStr: string): string {
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
  }
}
