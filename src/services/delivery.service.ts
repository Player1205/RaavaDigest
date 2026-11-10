import { Resend } from "resend";
import { getEnv } from "@/config/env";
import { DailyBriefingPayload } from "@/types/intelligence";

export class DeliveryService {
  private resend: Resend | null = null;

  constructor() {
    const apiKey = getEnv().RESEND_API_KEY;
    if (apiKey) {
      this.resend = new Resend(apiKey);
    }
  }

  public async dispatchBriefingEmail(
    recipientEmail: string,
    briefing: DailyBriefingPayload
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const env = getEnv();
    const sender = env.SENDER_EMAIL || "briefing@resend.dev";

    if (!this.resend) {
      console.log(
        `[DeliveryService] RESEND_API_KEY not configured. Simulated successful delivery to ${recipientEmail} for briefing ${briefing.id}.`
      );
      return {
        success: true,
        messageId: `simulated_${Date.now()}`,
      };
    }

    try {
      const response = await this.resend.emails.send({
        from: `Personal Intelligence <${sender}>`,
        to: recipientEmail,
        subject: briefing.subject,
        html: briefing.htmlBody,
      });

      if (response.error) {
        console.error("[DeliveryService] Resend API error:", response.error);
        return {
          success: false,
          error: response.error.message,
        };
      }

      return {
        success: true,
        messageId: response.data?.id,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[DeliveryService] Unexpected delivery error:", err);
      return {
        success: false,
        error: msg,
      };
    }
  }
}
