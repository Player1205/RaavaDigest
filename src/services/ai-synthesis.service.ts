import { GoogleGenerativeAI } from "@google/generative-ai";
import { getEnv } from "@/config/env";
import {
  DetailDensity,
  RawIngestionItem,
  SynthesizedHighlight,
  SynthesizedTrackSection,
  TrackId,
} from "@/types/intelligence";

interface RawAiSectionResponse {
  summary: string;
  highlights: Array<{
    title: string;
    takeaway: string;
    details: string;
    sourceName: string;
    sourceUrl: string;
    urgencyOrImpact: "high" | "medium" | "low";
  }>;
}

export class AiSynthesisService {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    const key = getEnv().GEMINI_API_KEY;
    if (key) {
      this.genAI = new GoogleGenerativeAI(key);
    }
  }

  public async synthesizeTrack(
    trackId: TrackId,
    trackName: string,
    density: DetailDensity,
    items: RawIngestionItem[]
  ): Promise<SynthesizedTrackSection> {
    if (items.length === 0) {
      return {
        trackId,
        trackName,
        summary: `No new unique updates for ${trackName} today. All feeds are synchronized.`,
        highlights: [],
      };
    }

    if (!this.genAI) {
      return this.deterministicFallbackSynthesis(trackId, trackName, density, items);
    }

    try {
      const model = this.genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
      });

      const densityInstruction =
        density === "compact"
          ? "Density: COMPACT. Keep takeaways to 1-2 punchy sentences. Details should be under 50 words focusing on immediate user impact."
          : "Density: IN-DEPTH. Provide comprehensive, multi-paragraph deep dive analysis. Explain architecture, why it matters, ecosystem implications, and benchmarks.";

      const prompt = `
You are the Lead Intelligence Officer for a high-performing developer and technology enthusiast.
Synthesize the following raw items from the interest track "${trackName}" into simple, clear, jargon-free English.

${densityInstruction}

Rules:
1. Translate raw developer jargon (e.g. AST parsing, monomorphic inline caching, zero-copy deserialization) into intuitive, plain-English explanations without dumbing down the core technical insight.
2. Filter out minor noise or fluff; select the top most impactful developments.
3. Return ONLY a valid JSON object matching this TypeScript structure, with no markdown code fences or conversational text:
{
  "summary": "1-3 sentence high-level executive takeaway for this category today.",
  "highlights": [
    {
      "title": "Clean, descriptive headline",
      "takeaway": "Simple 1-2 sentence core message",
      "details": "Explanation of impact and technical significance",
      "sourceName": "Original source name",
      "sourceUrl": "Source URL",
      "urgencyOrImpact": "high" | "medium" | "low"
    }
  ]
}

Raw Input Items:
${JSON.stringify(
  items.map((i) => ({
    title: i.title,
    summary: i.summary,
    url: i.url,
    source: i.sourceName,
  })),
  null,
  2
)}
`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const cleanedJson = text.replace(/```json/g, "").replace(/```/g, "").trim();

      const parsed = JSON.parse(cleanedJson) as RawAiSectionResponse;

      return {
        trackId,
        trackName,
        summary: parsed.summary || `Daily intelligence synthesis for ${trackName}.`,
        highlights: (parsed.highlights || []).map((h) => ({
          title: h.title,
          takeaway: h.takeaway,
          details: h.details,
          sourceName: h.sourceName || "Source",
          sourceUrl: h.sourceUrl,
          urgencyOrImpact: h.urgencyOrImpact || "medium",
        })),
      };
    } catch (err) {
      console.warn(`[AiSynthesisService] Gemini synthesis error for ${trackName}, falling back to deterministic synthesis:`, err);
      return this.deterministicFallbackSynthesis(trackId, trackName, density, items);
    }
  }

  public deterministicFallbackSynthesis(
    trackId: TrackId,
    trackName: string,
    density: DetailDensity,
    items: RawIngestionItem[]
  ): SynthesizedTrackSection {
    const highlights: SynthesizedHighlight[] = items.slice(0, 5).map((item, idx) => {
      const isHighImpact = idx === 0;
      const takeaway =
        density === "compact"
          ? `${item.title.split(":")[0] || item.title} delivers significant updates and fixes.`
          : `${item.title} introduces major enhancements to modern workflows, improving developer experience and performance efficiency.`;

      const details =
        density === "compact"
          ? item.summary.slice(0, 160)
          : `${item.summary} Key considerations include stability upgrades, clean API interfaces, and seamless integration with contemporary ecosystem standards.`;

      return {
        title: item.title,
        takeaway,
        details,
        sourceName: item.sourceName,
        sourceUrl: item.url,
        urgencyOrImpact: isHighImpact ? "high" : "medium",
      };
    });

    return {
      trackId,
      trackName,
      summary: `Automated executive briefing for ${trackName} covering ${items.length} key updates.`,
      highlights,
    };
  }
}
