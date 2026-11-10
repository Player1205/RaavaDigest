import { NextResponse } from "next/server";
import { IntelligenceRepository } from "@/lib/db/repository";

export async function GET(request: Request) {
  const repo = new IntelligenceRepository();
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (action === "resume") {
    repo.saveUserPreferences({ isPaused: false });
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
      <head><title>Deliveries Resumed</title><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family: sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px;">
        <div style="background: #1e293b; padding: 32px; border-radius: 12px; border: 1px solid #334155; max-width: 480px; text-align: center;">
          <h1 style="color: #4ade80; font-size: 22px; margin-top: 0;">Daily Deliveries Resumed</h1>
          <p style="color: #94a3b8; font-size: 14px;">Your Personal Intelligence daily briefing will dispatch tomorrow at 7:00 AM.</p>
          <a href="/" style="display: inline-block; margin-top: 16px; padding: 10px 20px; background: #4f46e5; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Return to Dashboard</a>
        </div>
      </body>
      </html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  // Default: Pause deliveries
  repo.saveUserPreferences({ isPaused: true });

  return new NextResponse(
    `<!DOCTYPE html>
    <html>
    <head><title>Deliveries Paused</title><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="font-family: sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px;">
      <div style="background: #1e293b; padding: 32px; border-radius: 12px; border: 1px solid #334155; max-width: 480px; text-align: center;">
        <h1 style="color: #f87171; font-size: 22px; margin-top: 0;">Daily Briefings Paused</h1>
        <p style="color: #94a3b8; font-size: 14px;">You will not receive scheduled morning emails. You can resume anytime from your control panel or by clicking below.</p>
        <div style="margin-top: 24px;">
          <a href="/api/unsubscribe?action=resume" style="display: inline-block; padding: 10px 20px; background: #10b981; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; margin-right: 8px;">Resume Deliveries</a>
          <a href="/" style="display: inline-block; padding: 10px 20px; background: #334155; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Go to Dashboard</a>
        </div>
      </div>
    </body>
    </html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}
