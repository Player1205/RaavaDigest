import { IntelligenceRepository } from "@/lib/db/repository";
import { IngestionService } from "./ingestion.service";
import { AiSynthesisService } from "./ai-synthesis.service";
import { EmailTemplateService } from "./email-template.service";
import { DeliveryService } from "./delivery.service";
import {
  DailyBriefingPayload,
  DispatchRunResult,
  SynthesizedTrackSection,
  BriefingRecord,
  DetailDensity,
} from "@/types/intelligence";
import { RETENTION_DAYS, DEFAULT_CORE_TRACKS } from "@/config/constants";

export class IntelligencePipelineService {
  private repo: IntelligenceRepository;
  private ingestion: IngestionService;
  private ai: AiSynthesisService;
  private template: EmailTemplateService;
  private delivery: DeliveryService;

  constructor(repo: IntelligenceRepository) {
    this.repo = repo;
    this.ingestion = new IngestionService(repo);
    this.ai = new AiSynthesisService();
    this.template = new EmailTemplateService();
    this.delivery = new DeliveryService();
  }

  public async runDailyPipeline(forced = false): Promise<DispatchRunResult> {
    const startTime = Date.now();
    const prefs = this.repo.getUserPreferences();

    if (prefs.isPaused && !forced) {
      return {
        success: true,
        durationMs: Date.now() - startTime,
        error: "Pipeline skipped: Daily delivery is currently paused by user preferences.",
      };
    }

    try {
      // 1. Ingest across active tracks & deduplicate
      const ingestionResult = await this.ingestion.collectAllActiveTracks();
      const activeTrackConfigs = this.ingestion.buildActiveTracksConfiguration(prefs.activeTracks);

      // 2. Synthesize each track using Gemini AI
      const sections: SynthesizedTrackSection[] = [];
      let totalHighlighted = 0;

      for (const track of activeTrackConfigs) {
        const items = ingestionResult.itemsByTrack.get(track.id) || [];
        const density: DetailDensity = prefs.trackDensities[track.id] || "compact";

        const section = await this.ai.synthesizeTrack(track.id, track.name, density, items);
        sections.push(section);
        totalHighlighted += section.highlights.length;
      }

      // 3. Assemble DailyBriefingPayload
      const now = new Date();
      const todayIsoDate = now.toISOString().split("T")[0];
      const briefingId = `briefing_${todayIsoDate}_${Date.now()}`;
      const subject = `Daily Intelligence Briefing • ${now.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`;

      const totalSources = activeTrackConfigs.reduce((acc, t) => acc + t.sources.length, 0);

      const payload: DailyBriefingPayload = {
        id: briefingId,
        date: todayIsoDate,
        subject,
        density: "compact",
        sections,
        totalRawItemsIngested: ingestionResult.totalRawCollected,
        totalItemsHighlighted: totalHighlighted,
        generatedAt: now.toISOString(),
        htmlBody: "",
        stats: {
          durationMs: Date.now() - startTime,
          sourcesProcessed: totalSources,
          tracksActive: activeTrackConfigs.length,
        },
      };

      // 4. Generate HTML Email Body
      payload.htmlBody = this.template.renderEmailHtml(payload);

      // 5. Dispatch via Resend
      const deliveryResult = await this.delivery.dispatchBriefingEmail(
        prefs.notificationEmail,
        payload
      );

      // 6. Record Briefing with 7-day TTL
      const retentionExpiresAt = new Date(
        now.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000
      ).toISOString();

      const briefingRecord: BriefingRecord = {
        id: briefingId,
        date: todayIsoDate,
        subject,
        density: "compact",
        totalItems: totalHighlighted,
        htmlBody: payload.htmlBody,
        jsonData: JSON.stringify(payload),
        dispatchedAt: now.toISOString(),
        deliveredStatus: deliveryResult.success ? "delivered" : "failed",
        retentionExpiresAt,
      };

      this.repo.saveBriefing(briefingRecord);

      // 7. Record ingested unique items in deduplication database
      const allUniqueItems = Array.from(ingestionResult.itemsByTrack.values()).flat();
      this.ingestion.recordDispatchedItems(allUniqueItems);

      // 8. Enforce strict 7-Day Rolling TTL Purge
      const purgeResult = this.repo.purgeExpiredRecords(now);

      return {
        success: deliveryResult.success,
        briefingId,
        subject,
        itemCount: totalHighlighted,
        dispatchedEmail: prefs.notificationEmail,
        purgedCount: purgeResult.briefingsPurged,
        durationMs: Date.now() - startTime,
        error: deliveryResult.error,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[IntelligencePipelineService] Pipeline failed:", err);
      return {
        success: false,
        durationMs: Date.now() - startTime,
        error: msg,
      };
    }
  }
}
