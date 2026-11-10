import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { getEnv } from "@/config/env";

let defaultDbInstance: DatabaseSync | null = null;

export function initDatabase(dbPath?: string): DatabaseSync {
  const targetPath = dbPath || getEnv().DATABASE_PATH;

  if (targetPath !== ":memory:") {
    const dir = path.dirname(path.resolve(targetPath));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new DatabaseSync(targetPath);

  // Enable WAL mode for high performance concurrency if file-based
  if (targetPath !== ":memory:") {
    db.exec("PRAGMA journal_mode = WAL;");
  }
  db.exec("PRAGMA foreign_keys = ON;");

  // Schema creation
  db.exec(`
    CREATE TABLE IF NOT EXISTS briefings (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      subject TEXT NOT NULL,
      density TEXT NOT NULL,
      total_items INTEGER NOT NULL,
      html_body TEXT NOT NULL,
      json_data TEXT NOT NULL,
      dispatched_at TEXT NOT NULL,
      delivered_status TEXT NOT NULL,
      retention_expires_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_briefings_date ON briefings(date);
    CREATE INDEX IF NOT EXISTS idx_briefings_retention ON briefings(retention_expires_at);

    CREATE TABLE IF NOT EXISTS ingested_items (
      id TEXT PRIMARY KEY,
      track_id TEXT NOT NULL,
      source_id TEXT NOT NULL,
      source_name TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      summary TEXT NOT NULL,
      published_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_ingested_expires ON ingested_items(expires_at);
    CREATE INDEX IF NOT EXISTS idx_ingested_url ON ingested_items(url);

    CREATE TABLE IF NOT EXISTS user_preferences (
      id TEXT PRIMARY KEY,
      notification_email TEXT NOT NULL,
      is_paused INTEGER NOT NULL DEFAULT 0,
      active_tracks TEXT NOT NULL,
      track_densities TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS custom_topics (
      id TEXT PRIMARY KEY,
      prompt TEXT NOT NULL,
      resolved_name TEXT NOT NULL,
      resolved_description TEXT NOT NULL,
      source_url TEXT NOT NULL,
      source_type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1
    );
  `);

  return db;
}

export function getDatabase(): DatabaseSync {
  if (!defaultDbInstance) {
    defaultDbInstance = initDatabase();
  }
  return defaultDbInstance;
}
