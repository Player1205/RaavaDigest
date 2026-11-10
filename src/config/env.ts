import { z } from "zod";

const envSchema = z.object({
  GEMINI_API_KEY: z.string().optional().default(""),
  RESEND_API_KEY: z.string().optional().default(""),
  NOTIFICATION_EMAIL: z.string().email().optional().default("user@example.com"),
  SENDER_EMAIL: z.string().optional().default("briefing@resend.dev"),
  TMDB_API_KEY: z.string().optional().default(""),
  SPOTIFY_CLIENT_ID: z.string().optional().default(""),
  SPOTIFY_CLIENT_SECRET: z.string().optional().default(""),
  GITHUB_TOKEN: z.string().optional().default(""),
  CRON_SECRET: z.string().optional().default("personal-intelligence-secure-cron-key"),
  NEXT_PUBLIC_APP_URL: z.string().optional().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "production", "test"]).optional().default("development"),
  DATABASE_PATH: z.string().optional().default("./data/intelligence.db"),
});

export type Env = z.infer<typeof envSchema>;

let parsedEnv: Env | null = null;

export function getEnv(): Env {
  if (!parsedEnv) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      console.warn("Environment validation warning:", result.error.format());
      parsedEnv = envSchema.parse({});
    } else {
      parsedEnv = result.data;
    }
  }
  return parsedEnv;
}
