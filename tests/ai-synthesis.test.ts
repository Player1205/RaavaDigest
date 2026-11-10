import { describe, it, expect } from "vitest";
import { AiSynthesisService } from "../src/services/ai-synthesis.service";
import { EmailTemplateService } from "../src/services/email-template.service";
import { DailyBriefingPayload, RawIngestionItem } from "../src/types/intelligence";

describe("Gemini AI Synthesis Engine & Responsive HTML Email Formatter", () => {
  const sampleItems: RawIngestionItem[] = [
    {
      id: "raw-1",
      trackId: "tech-ecosystem",
      sourceId: "src-1",
      sourceName: "Google AI",
      title: "Google Unveils Gemini 3.5 Native Audio Multimodality",
      url: "https://blog.google/technology/ai/gemini-3-5",
      summary: "Massive latency reduction and enhanced speech reasoning for enterprise AI systems.",
      publishedAt: new Date().toISOString(),
    },
    {
      id: "raw-2",
      trackId: "tech-ecosystem",
      sourceId: "src-2",
      sourceName: "React Team",
      title: "React 19 Server Actions Production Best Practices",
      url: "https://react.dev/blog/actions",
      summary: "Comprehensive guide to data mutations, optimistic updates, and form status hooks.",
      publishedAt: new Date().toISOString(),
    },
  ];

  it("should generate structured deterministic synthesis when offline", () => {
    const aiService = new AiSynthesisService();
    const compactResult = aiService.deterministicFallbackSynthesis(
      "tech-ecosystem",
      "Big Tech & Ecosystem Code Upgrades",
      "compact",
      sampleItems
    );

    expect(compactResult.trackId).toBe("tech-ecosystem");
    expect(compactResult.highlights).toHaveLength(2);
    expect(compactResult.highlights[0].urgencyOrImpact).toBe("high");
    expect(compactResult.highlights[0].title).toBe("Google Unveils Gemini 3.5 Native Audio Multimodality");

    const inDepthResult = aiService.deterministicFallbackSynthesis(
      "tech-ecosystem",
      "Big Tech & Ecosystem Code Upgrades",
      "in-depth",
      sampleItems
    );

    // In-depth should generate longer details
    expect(inDepthResult.highlights[0].details.length).toBeGreaterThan(
      compactResult.highlights[0].details.length
    );
  });

  it("should render clean, responsive HTML email containing all sections and inline styling", () => {
    const emailService = new EmailTemplateService();
    const payload: DailyBriefingPayload = {
      id: "test-briefing-001",
      date: "2026-11-10",
      subject: "Daily Intelligence Briefing • November 10, 2026",
      density: "compact",
      sections: [
        {
          trackId: "tech-ecosystem",
          trackName: "Big Tech & Ecosystem Code Upgrades",
          summary: "Flagship AI and React release updates.",
          highlights: [
            {
              title: "Gemini 3.5 Announcement",
              takeaway: "Lower latency audio reasoning",
              details: "Full bidirectional streaming support enabled.",
              sourceName: "Google AI",
              sourceUrl: "https://blog.google",
              urgencyOrImpact: "high",
            },
          ],
        },
      ],
      totalRawItemsIngested: 20,
      totalItemsHighlighted: 1,
      generatedAt: new Date().toISOString(),
      htmlBody: "",
      stats: {
        durationMs: 1420,
        sourcesProcessed: 5,
        tracksActive: 1,
      },
    };

    const html = emailService.renderEmailHtml(payload);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Daily Intelligence Briefing");
    expect(html).toContain("Gemini 3.5 Announcement");
    expect(html).toContain("Pause daily deliveries");
    expect(html).toContain("Open Dashboard");
    expect(html).toContain("background-color: #f9fafb");
  });
});
