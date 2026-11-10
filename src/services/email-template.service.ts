import { DailyBriefingPayload, SynthesizedTrackSection } from "@/types/intelligence";
import { getEnv } from "@/config/env";

export class EmailTemplateService {
  public renderEmailHtml(briefing: DailyBriefingPayload): string {
    const env = getEnv();
    const appUrl = env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const unsubscribeUrl = `${appUrl}/api/unsubscribe`;
    const dashboardUrl = `${appUrl}/`;

    const sectionHtmls = briefing.sections.map((section) => this.renderSectionHtml(section)).join("\n");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(briefing.subject)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; line-height: 1.6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; width: 100%;">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <table role="presentation" width="100%" style="max-width: 680px; background-color: #1e293b; border-radius: 16px; overflow: hidden; border: 1px solid #334155; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);">
          
          <!-- Header Banner -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); border-bottom: 1px solid #4338ca;">
              <table role="presentation" width="100%">
                <tr>
                  <td>
                    <span style="display: inline-block; padding: 4px 12px; background-color: rgba(99, 102, 241, 0.25); border: 1px solid #818cf8; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #c7d2fe; margin-bottom: 12px;">
                      Personal Intelligence Engine • V1
                    </span>
                    <h1 style="margin: 8px 0 4px 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.025em;">
                      ${this.escapeHtml(briefing.subject)}
                    </h1>
                    <p style="margin: 0; font-size: 14px; color: #94a3b8;">
                      ${briefing.date} • Mode: <span style="text-transform: capitalize; color: #38bdf8; font-weight: 600;">${briefing.density}</span> • ${briefing.totalItemsHighlighted} Actionable Updates
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Quick Stats Bar -->
          <tr>
            <td style="padding: 12px 32px; background-color: #172033; border-bottom: 1px solid #334155; font-size: 12px; color: #94a3b8;">
              <table role="presentation" width="100%">
                <tr>
                  <td align="left">
                    📡 <strong>${briefing.stats.sourcesProcessed}</strong> Sources Processed | ⚡ <strong>${briefing.totalRawItemsIngested}</strong> Items Analyzed
                  </td>
                  <td align="right">
                    ⏱️ ${(briefing.stats.durationMs / 1000).toFixed(1)}s AI Synthesis
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Sections -->
          <tr>
            <td style="padding: 24px 32px;">
              ${sectionHtmls}
            </td>
          </tr>

          <!-- Footer Control Actions -->
          <tr>
            <td style="padding: 24px 32px; background-color: #0f172a; border-top: 1px solid #334155; text-align: center;">
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #cbd5e1;">
                Need to adjust categories or density? Visit your installable control panel.
              </p>
              <div style="margin-bottom: 20px;">
                <a href="${dashboardUrl}" style="display: inline-block; padding: 10px 24px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; margin-right: 8px;">
                  Open PWA Control Dashboard
                </a>
              </div>
              <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                This briefing was dispatched exclusively to your private inbox.<br>
                <a href="${unsubscribeUrl}" style="color: #94a3b8; text-decoration: underline;">
                  1-Click Pause Daily Deliveries
                </a>
                &nbsp;|&nbsp; 7-Day Rolling Retention Active (< 10 MB)
              </p>
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
      .map((h) => {
        const badgeColor =
          h.urgencyOrImpact === "high"
            ? "background-color: #ef4444; color: #ffffff;"
            : h.urgencyOrImpact === "medium"
            ? "background-color: #3b82f6; color: #ffffff;"
            : "background-color: #64748b; color: #ffffff;";

        return `
        <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 18px 20px; margin-bottom: 16px;">
          <div style="margin-bottom: 8px;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 800; text-transform: uppercase; ${badgeColor} margin-right: 8px;">
              ${h.urgencyOrImpact}
            </span>
            <span style="font-size: 12px; color: #94a3b8;">
              ${this.escapeHtml(h.sourceName)}
            </span>
          </div>

          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 700; color: #f1f5f9; line-height: 1.4;">
            <a href="${h.sourceUrl}" style="color: #60a5fa; text-decoration: none;">
              ${this.escapeHtml(h.title)} &rarr;
            </a>
          </h3>

          <p style="margin: 0 0 10px 0; font-size: 14px; color: #e2e8f0; font-weight: 500;">
            ${this.escapeHtml(h.takeaway)}
          </p>

          <p style="margin: 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">
            ${this.escapeHtml(h.details)}
          </p>
        </div>`;
      })
      .join("\n");

    return `
    <div style="margin-bottom: 32px;">
      <div style="border-bottom: 2px solid #3b82f6; padding-bottom: 8px; margin-bottom: 16px;">
        <h2 style="margin: 0; font-size: 18px; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 0.05em;">
          ${this.escapeHtml(section.trackName)}
        </h2>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8;">
          ${this.escapeHtml(section.summary)}
        </p>
      </div>
      ${highlightsHtml || '<p style="font-size: 13px; color: #64748b; font-style: italic;">No new highlights for this section today.</p>'}
    </div>`;
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
