import { describe, it, expect } from "vitest";
import { getEnv } from "../src/config/env";
import { DEFAULT_CORE_TRACKS, RETENTION_DAYS } from "../src/config/constants";

describe("Core Configuration and Environment", () => {
  it("should validate default environment variables gracefully", () => {
    const env = getEnv();
    expect(env).toBeDefined();
    expect(env.CRON_SECRET).toBe("personal-intelligence-secure-cron-key");
    expect(env.DATABASE_PATH).toBe("./data/intelligence.db");
  });

  it("should configure exactly 3 core interest tracks out of the box", () => {
    expect(DEFAULT_CORE_TRACKS).toHaveLength(3);
    const trackIds = DEFAULT_CORE_TRACKS.map((t) => t.id);
    expect(trackIds).toContain("tech-ecosystem");
    expect(trackIds).toContain("entertainment-hub");
    expect(trackIds).toContain("global-music");
  });

  it("should enforce a 7-day retention period", () => {
    expect(RETENTION_DAYS).toBe(7);
  });
});
