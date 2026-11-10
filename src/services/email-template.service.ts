import { DailyBriefingPayload, SynthesizedTrackSection, SynthesizedHighlight } from "@/types/intelligence";
import { getEnv } from "@/config/env";

export class EmailTemplateService {
  public renderEmailHtml(briefing: DailyBriefingPayload): string {
    const env = getEnv();
    const appUrl = env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const unsubscribeUrl = `${appUrl}/api/unsubscribe`;
    const dashboardUrl = `${appUrl}/`;
    const recipientEmail = env.NOTIFICATION_EMAIL || "your email";

    const sectionHtmls = briefing.sections
      .map((section) => this.renderSectionHtml(section))
      .join("\n");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(briefing.subject)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; color: #111827; line-height: 1.6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f9fafb; width: 100%;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="100%" style="max-width: 620px; background-color: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb; padding: 36px 32px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05); text-align: left;">
          
          <!-- Heading -->
          <tr>
            <td>
              <h1 style="margin: 0 0 6px 0; font-size: 24px; font-weight: 700; color: #111827; letter-spacing: -0.02em;">
                ${this.escapeHtml(briefing.subject)}
              </h1>
              <p style="margin: 0 0 20px 0; font-size: 14px; color: #6b7280;">
                ${this.escapeHtml(briefing.date)} &bull; Daily Briefing
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; color: #374151; line-height: 1.6;">
                Here is your curated overview of what's happening across tech releases and open-source upgrades, top-rated movies &amp; series, and trending music tracks.
              </p>
              <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 0 0 28px 0;" />
            </td>
          </tr>

          <!-- Main Content Sections -->
          <tr>
            <td>
              ${sectionHtmls}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td>
              <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 32px 0 20px 0;" />
              <div style="font-size: 13px; color: #9ca3af; text-align: center; line-height: 1.6;">
                <p style="margin: 0 0 8px 0;">
                  Dispatched to <strong style="color: #4b5563;">${this.escapeHtml(recipientEmail)}</strong>
                </p>
                <p style="margin: 0;">
                  <a href="${dashboardUrl}" style="color: #4b5563; text-decoration: underline; margin-right: 14px;">Open Dashboard</a>
                  <a href="${unsubscribeUrl}" style="color: #9ca3af; text-decoration: underline;">Pause daily deliveries</a>
                </p>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private renderSectionHtml(section: SynthesizedTrackSection): string {
    const highlightsHtml = section.highlights
      .map((h) => this.renderHighlightHtml(h))
      .join("\n");

    return `
    <div style="margin-bottom: 32px;">
      <h2 style="margin: 0 0 8px 0; font-size: 17px; font-weight: 700; color: #111827; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 2px solid #111827; padding-bottom: 6px;">
        ${this.escapeHtml(section.trackName)}
      </h2>
      ${
        section.summary
          ? `<p style="margin: 0 0 18px 0; font-size: 14px; color: #4b5563; line-height: 1.5; font-style: italic;">${this.escapeHtml(section.summary)}</p>`
          : ""
      }
      ${highlightsHtml || '<p style="font-size: 14px; color: #6b7280; font-style: italic;">No new highlights for this topic today.</p>'}
    </div>`;
  }

  private renderHighlightHtml(h: SynthesizedHighlight): string {
    // Generate clean bullets if available, or fall back to details
    const bullets: string[] =
      Array.isArray(h.bullets) && h.bullets.length > 0
        ? h.bullets
        : this.extractBullets(h.details);

    const bulletsHtml = bullets
      .map(
        (b) =>
          `<li style="margin-bottom: 6px; color: #374151; line-height: 1.6;">${this.escapeHtml(b)}</li>`
      )
      .join("\n");

    return `
    <div style="margin-bottom: 26px;">
      <h3 style="margin: 0 0 6px 0; font-size: 16px; font-weight: 600; line-height: 1.4;">
        <a href="${h.sourceUrl}" style="color: #1d4ed8; text-decoration: none;">
          ${this.escapeHtml(h.title)} &rarr;
        </a>
      </h3>

      <p style="margin: 0 0 8px 0; font-size: 14.5px; color: #1f2937; line-height: 1.6;">
        ${this.escapeHtml(h.takeaway)}
      </p>

      ${
        bullets.length > 0
          ? `<ul style="margin: 0 0 12px 0; padding-left: 20px; font-size: 14px; line-height: 1.65;">
              ${bulletsHtml}
            </ul>`
          : ""
      }
    </div>`;
  }

  private extractBullets(text: string): string[] {
    if (!text) return [];
    // Split sentences into readable bullet points
    const parts = text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 15);
    return parts.slice(0, 6);
  }

  private escapeHtml(text: string): string {
    if (!text) return "";
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
}
