import { DatabaseSync } from "node:sqlite";
import { getDatabase } from "./index";
import {
  BriefingRecord,
  RawIngestionItem,
  UserPreferences,
  CustomTopicRecord,
  TrackId,
  DetailDensity,
} from "@/types/intelligence";
import { RETENTION_DAYS, RETENTION_MS, DEFAULT_CORE_TRACKS } from "@/config/constants";
import { getEnv } from "@/config/env";

export class IntelligenceRepository {
  private db: DatabaseSync;

  constructor(db?: DatabaseSync) {
    this.db = db || getDatabase();
  }

  // Briefings operations
  public saveBriefing(briefing: BriefingRecord): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO briefings (
        id, date, subject, density, total_items, html_body, json_data,
        dispatched_at, delivered_status, retention_expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      briefing.id,
      briefing.date,
      briefing.subject,
      briefing.density,
      briefing.totalItems,
      briefing.htmlBody,
      briefing.jsonData,
      briefing.dispatchedAt,
      briefing.deliveredStatus,
      briefing.retentionExpiresAt
    );
  }

  public getRecentBriefings(limitDays = RETENTION_DAYS): BriefingRecord[] {
    const cutoffDate = new Date(Date.now() - limitDays * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const stmt = this.db.prepare(`
      SELECT * FROM briefings
      WHERE date >= ?
      ORDER BY date DESC
    `);
    const rows = stmt.all(cutoffDate) as Array<{
      id: string;
      date: string;
      subject: string;
      density: string;
      total_items: number;
      html_body: string;
      json_data: string;
      dispatched_at: string;
      delivered_status: string;
      retention_expires_at: string;
    }>;

    return rows.map((r) => ({
      id: r.id,
      date: r.date,
      subject: r.subject,
      density: r.density as DetailDensity,
      totalItems: r.total_items,
      htmlBody: r.html_body,
      jsonData: r.json_data,
      dispatchedAt: r.dispatched_at,
      deliveredStatus: r.delivered_status as "delivered" | "failed" | "skipped",
      retentionExpiresAt: r.retention_expires_at,
    }));
  }

  public getBriefingById(id: string): BriefingRecord | null {
    const stmt = this.db.prepare("SELECT * FROM briefings WHERE id = ?");
    const row = stmt.get(id) as {
      id: string;
      date: string;
      subject: string;
      density: string;
      total_items: number;
      html_body: string;
      json_data: string;
      dispatched_at: string;
      delivered_status: string;
      retention_expires_at: string;
    } | undefined;

    if (!row) return null;

    return {
      id: row.id,
      date: row.date,
      subject: row.subject,
      density: row.density as DetailDensity,
      totalItems: row.total_items,
      htmlBody: row.html_body,
      jsonData: row.json_data,
      dispatchedAt: row.dispatched_at,
      deliveredStatus: row.delivered_status as "delivered" | "failed" | "skipped",
      retentionExpiresAt: row.retention_expires_at,
    };
  }

  public getBriefingByDate(date: string): BriefingRecord | null {
    const stmt = this.db.prepare("SELECT * FROM briefings WHERE date = ?");
    const row = stmt.get(date) as {
      id: string;
      date: string;
      subject: string;
      density: string;
      total_items: number;
      html_body: string;
      json_data: string;
      dispatched_at: string;
      delivered_status: string;
      retention_expires_at: string;
    } | undefined;

    if (!row) return null;

    return {
      id: row.id,
      date: row.date,
      subject: row.subject,
      density: row.density as DetailDensity,
      totalItems: row.total_items,
      htmlBody: row.html_body,
      jsonData: row.json_data,
      dispatchedAt: row.dispatched_at,
      deliveredStatus: row.delivered_status as "delivered" | "failed" | "skipped",
      retentionExpiresAt: row.retention_expires_at,
    };
  }

  // 7-day TTL Rolling Purge Implementation
  public purgeExpiredRecords(referenceDate: Date = new Date()): {
    briefingsPurged: number;
    itemsPurged: number;
  } {
    const nowIso = referenceDate.toISOString();

    const countBriefingsStmt = this.db.prepare(
      "SELECT COUNT(*) as cnt FROM briefings WHERE retention_expires_at < ?"
    );
    const countBriefings = (countBriefingsStmt.get(nowIso) as { cnt: number }).cnt;

    const purgeBriefingsStmt = this.db.prepare(
      "DELETE FROM briefings WHERE retention_expires_at < ?"
    );
    purgeBriefingsStmt.run(nowIso);

    const countItemsStmt = this.db.prepare(
      "SELECT COUNT(*) as cnt FROM ingested_items WHERE expires_at < ?"
    );
    const countItems = (countItemsStmt.get(nowIso) as { cnt: number }).cnt;

    const purgeItemsStmt = this.db.prepare(
      "DELETE FROM ingested_items WHERE expires_at < ?"
    );
    purgeItemsStmt.run(nowIso);

    return {
      briefingsPurged: countBriefings,
      itemsPurged: countItems,
    };
  }

  // Ingested Items / Dedup record keeping
  public recordIngestedItem(item: RawIngestionItem, retentionDays = RETENTION_DAYS): void {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000).toISOString();

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO ingested_items (
        id, track_id, source_id, source_name, title, url, summary,
        published_at, created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      item.id,
      item.trackId,
      item.sourceId,
      item.sourceName,
      item.title,
      item.url,
      item.summary,
      item.publishedAt,
      now.toISOString(),
      expiresAt
    );
  }

  public isItemAlreadyIngested(id: string, url: string): boolean {
    const stmt = this.db.prepare("SELECT id FROM ingested_items WHERE id = ? OR url = ? LIMIT 1");
    const row = stmt.get(id, url);
    return row !== undefined;
  }

  // Single-User Preferences
  public getUserPreferences(): UserPreferences {
    const stmt = this.db.prepare("SELECT * FROM user_preferences WHERE id = 'single_user'");
    const row = stmt.get() as {
      id: string;
      notification_email: string;
      is_paused: number;
      active_tracks: string;
      track_densities: string;
      updated_at: string;
    } | undefined;

    const customTopics = this.getCustomTopics();

    if (!row) {
      const defaultActiveTracks: Record<TrackId, boolean> = {};
      const defaultDensities: Record<TrackId, DetailDensity> = {};

      for (const t of DEFAULT_CORE_TRACKS) {
        defaultActiveTracks[t.id] = t.enabled;
        defaultDensities[t.id] = t.density;
      }

      const initialPrefs: UserPreferences = {
        activeTracks: defaultActiveTracks,
        trackDensities: defaultDensities,
        notificationEmail: getEnv().NOTIFICATION_EMAIL,
        deliveryHourUtc: 7,
        isPaused: false,
        customTopics,
      };

      const insertStmt = this.db.prepare(`
        INSERT OR REPLACE INTO user_preferences (
          id, notification_email, is_paused, active_tracks, track_densities, updated_at
        ) VALUES ('single_user', ?, 0, ?, ?, ?)
      `);

      insertStmt.run(
        initialPrefs.notificationEmail,
        JSON.stringify(initialPrefs.activeTracks),
        JSON.stringify(initialPrefs.trackDensities),
        new Date().toISOString()
      );

      return initialPrefs;
    }

    return {
      activeTracks: JSON.parse(row.active_tracks),
      trackDensities: JSON.parse(row.track_densities),
      notificationEmail: row.notification_email,
      deliveryHourUtc: 7,
      isPaused: Boolean(row.is_paused),
      customTopics,
    };
  }

  public saveUserPreferences(prefs: Partial<UserPreferences>): UserPreferences {
    const current = this.getUserPreferences();
    const updated: UserPreferences = {
      ...current,
      ...prefs,
      activeTracks: { ...current.activeTracks, ...(prefs.activeTracks || {}) },
      trackDensities: { ...current.trackDensities, ...(prefs.trackDensities || {}) },
    };

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO user_preferences (
        id, notification_email, is_paused, active_tracks, track_densities, updated_at
      ) VALUES ('single_user', ?, ?, ?, ?, ?)
    `);

    stmt.run(
      updated.notificationEmail,
      updated.isPaused ? 1 : 0,
      JSON.stringify(updated.activeTracks),
      JSON.stringify(updated.trackDensities),
      new Date().toISOString()
    );

    return updated;
  }

  // Custom Topics
  public getCustomTopics(): CustomTopicRecord[] {
    const stmt = this.db.prepare("SELECT * FROM custom_topics ORDER BY created_at DESC");
    const rows = stmt.all() as Array<{
      id: string;
      prompt: string;
      resolved_name: string;
      resolved_description: string;
      source_url: string;
      source_type: string;
      created_at: string;
      enabled: number;
    }>;

    return rows.map((r) => ({
      id: r.id,
      prompt: r.prompt,
      resolvedName: r.resolved_name,
      resolvedDescription: r.resolved_description,
      sourceUrl: r.source_url,
      sourceType: r.source_type as CustomTopicRecord["sourceType"],
      createdAt: r.created_at,
      enabled: Boolean(r.enabled),
    }));
  }

  public addCustomTopic(topic: {
    prompt: string;
    resolvedName: string;
    resolvedDescription: string;
    sourceUrl: string;
    sourceType: CustomTopicRecord["sourceType"];
  }): CustomTopicRecord {
    const id = `topic_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO custom_topics (
        id, prompt, resolved_name, resolved_description, source_url, source_type, created_at, enabled
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `);

    stmt.run(
      id,
      topic.prompt,
      topic.resolvedName,
      topic.resolvedDescription,
      topic.sourceUrl,
      topic.sourceType,
      now
    );

    return {
      id,
      prompt: topic.prompt,
      resolvedName: topic.resolvedName,
      resolvedDescription: topic.resolvedDescription,
      sourceUrl: topic.sourceUrl,
      sourceType: topic.sourceType,
      createdAt: now,
      enabled: true,
    };
  }

  public removeCustomTopic(id: string): boolean {
    const stmt = this.db.prepare("DELETE FROM custom_topics WHERE id = ?");
    const info = stmt.run(id);
    return Number(info.changes) > 0;
  }

  public toggleCustomTopic(id: string, enabled: boolean): boolean {
    const stmt = this.db.prepare("UPDATE custom_topics SET enabled = ? WHERE id = ?");
    const info = stmt.run(enabled ? 1 : 0, id);
    return Number(info.changes) > 0;
  }
}
