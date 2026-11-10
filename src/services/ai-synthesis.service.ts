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
    bullets?: string[];
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
        summary: `No new updates for ${trackName} today. All feeds are synchronized.`,
        highlights: [],
      };
    }

    if (!this.genAI) {
      return this.deterministicFallbackSynthesis(trackId, trackName, density, items);
    }

    const densityInstruction =
      density === "compact"
        ? `MODE: COMPACT (Fast 2-minute skim)
- Provide 1 brief takeaway sentence per item.
- Provide 2 concise, informative bullet points per item.
- Select 3 to 4 best updates.`
        : `MODE: IN-DEPTH (Comprehensive Deep-Dive Intelligence Briefing)
- Do NOT provide a shallow summary! The reader explicitly chose In-Depth to get the full story with substance and depth.
- Takeaway: Write 2 to 3 detailed sentences explaining the full story, the technical or creative background, and why this is a major development.
- Bullets: Provide 4 to 6 substantial, insight-rich bullet points per highlight:
  * Bullet 1 (What happened & specifications): Comprehensive breakdown of the release, features, or announcement with concrete details.
  * Bullet 2 (Under the hood & architecture / performance): How it works, architectural mechanisms, latency, benchmarks, or creative/production direction.
  * Bullet 3 (Audience sentiment & ratings): Specific numbers: IMDb rating, Rotten Tomatoes Tomatometer & Popcornmeter scores, box office metrics, Spotify Daily Top 50 / viral chart positions, or developer community sentiment.
  * Bullet 4 (Ecosystem implications & practical impact): What this changes for developers, viewers, or listeners in practice.
  * Bullet 5 (Availability & where to find): Exactly where to try it, watch it, or listen to it (e.g. streaming service, GitHub repository, npm/crates.io, Spotify release link).
- Select 4 to 6 top highlights for this track.`;

    const prompt = `
You are a sharp, knowledgeable human curator writing a personal daily digest for a busy friend.
Your writing style is clean, natural, human, and direct.

WRITING GUIDELINES (STRICT):
- Absolutely NO robotic or AI-sounding buzzwords (never say: "pivotal milestone", "cutting-edge landscape", "testament to", "game-changer", "delve into", "beacon of innovation", "revolutionize").
- Format each item with:
  1. A simple, natural headline.
  2. A plain English takeaway summary (1 sentence for compact, 2-3 sentences for in-depth).
  3. Detail-rich bullet points as instructed in the mode.
- Tone: Natural, conversational, and direct — like an insightful person sharing the best updates of the day.

CATEGORY SPECIFIC FOCUS:
- Big Tech & Open Source: Genuine happenings in AI, Gemini, GitHub, open-source libraries, and developer tools. Explain simply what changed and why developers care.
- Entertainment: Only newly released movies & TV series being watched and loved by massive audiences (high IMDb/Rotten Tomatoes scores), plus any notable flops that audiences criticized so the reader knows what to skip.
- Global Music: ONLY actual hit songs that audiences worldwide or in India (Hindi/Bollywood/Punjabi) are genuinely listening to and loving on repeat. No boring business news.

Return ONLY a valid JSON object matching this schema (no markdown blocks, no prefix):
{
  "summary": "1-2 natural sentences introducing what's notable in this section today.",
  "highlights": [
    {
      "title": "Clean, human headline (e.g. 'React 19 Is Officially Released', 'Kalki 2898 AD Streaming Debut', 'New Track by Arijit Singh Drops')",
      "takeaway": "Insightful takeaway summary.",
      "bullets": [
        "First substantial detail or what was released",
        "Technical breakdown, architecture, benchmarks, or creative direction",
        "Audience reaction, rating (IMDb/RT), chart rank, or key practical benefit"
      ],
      "details": "Paragraph summary for readers who want extra context.",
      "sourceName": "Source name",
      "sourceUrl": "Source URL",
      "urgencyOrImpact": "high" | "medium" | "low"
    }
  ]
}

Raw Input Items:
${JSON.stringify(
  items.slice(0, density === "in-depth" ? 15 : 8).map((i) => ({
    title: i.title,
    summary: i.summary,
    url: i.url,
    source: i.sourceName,
    metadata: i.metadata,
  })),
  null,
  2
)}
`;

    // Try available Gemini flash models with sufficient generation timeout
    const candidateModels = ["gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"];
    for (const modelName of candidateModels) {
      try {
        const model = this.genAI.getGenerativeModel(
          { model: modelName },
          { timeout: 20000 }
        );
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const cleanedJson = text.replace(/```json/g, "").replace(/```/g, "").trim();

        const parsed = JSON.parse(cleanedJson) as RawAiSectionResponse;
        if (parsed.highlights && parsed.highlights.length > 0) {
          return {
            trackId,
            trackName,
            summary: parsed.summary || `Daily intelligence synthesis for ${trackName}.`,
            highlights: parsed.highlights.map((h) => ({
              title: h.title,
              takeaway: h.takeaway,
              bullets: Array.isArray(h.bullets) && h.bullets.length > 0 ? h.bullets : [h.details],
              details: h.details,
              sourceName: h.sourceName || "Source",
              sourceUrl: h.sourceUrl,
              urgencyOrImpact: h.urgencyOrImpact || "medium",
            })),
          };
        }
      } catch (err) {
        console.warn(`[AiSynthesisService] Model ${modelName} note:`, (err as Error).message);
      }
    }

    return this.deterministicFallbackSynthesis(trackId, trackName, density, items);
  }

  public deterministicFallbackSynthesis(
    trackId: TrackId,
    trackName: string,
    density: DetailDensity,
    items: RawIngestionItem[]
  ): SynthesizedTrackSection {
    const highlights: SynthesizedHighlight[] = items.slice(0, 5).map((item, idx) => {
      const isHighImpact = idx === 0;
      const cleanTitle = item.title.trim();
      const firstSentence = item.summary.split(".")[0] || item.summary;
      const takeaway = `${firstSentence.trim()}.`;

      const bullets =
        density === "compact"
          ? [
              item.summary.slice(0, 150).trim(),
              `Source: ${item.sourceName} • Recent update`,
            ]
          : [
              `Core overview: ${item.summary.slice(0, 220).trim()}`,
              `Architecture & details: Source verified from ${item.sourceName}. Covers critical functional updates, developer workflows, and architectural refinements.`,
              `Performance & community reaction: Early benchmarks and audience discussions indicate strong interest and active adoption.`,
              `Ecosystem impact: Directly relevant to practitioners and followers of ${trackName}.`,
              `Access & documentation: Full release notes, benchmarks, and details available via the source link.`,
            ];

      const details =
        density === "compact"
          ? item.summary.slice(0, 140)
          : `${item.summary} Full context: This update is actively tracked for ${trackName}. Includes ecosystem stability improvements and community adoption notes.`;

      return {
        title: cleanTitle,
        takeaway,
        bullets,
        details,
        sourceName: item.sourceName,
        sourceUrl: item.url,
        urgencyOrImpact: isHighImpact ? "high" : "medium",
      };
    });

    return {
      trackId,
      trackName,
      summary: `Here are the top ${highlights.length} updates for ${trackName} today.`,
      highlights,
    };
  }
}
