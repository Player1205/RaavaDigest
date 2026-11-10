import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getEnv } from "@/config/env";
import { CustomTopicRecord } from "@/types/intelligence";

interface ResolvedTopicCandidate {
  prompt: string;
  resolvedName: string;
  resolvedDescription: string;
  sourceUrl: string;
  sourceType: CustomTopicRecord["sourceType"];
  confidence: "high" | "medium";
}

export async function POST(request: Request) {
  try {
    const { prompt } = (await request.json()) as { prompt?: string };

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    const cleanPrompt = prompt.trim();
    const env = getEnv();

    // Check Gemini resolution
    if (env.GEMINI_API_KEY) {
      try {
        const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const promptText = `
You are the Topic Configuration Assistant for Personal Intelligence Engine.
The user wants to track this topic: "${cleanPrompt}".

Resolve and identify an official, highly reliable, active public RSS or XML feed URL for this exact topic (e.g., an established publication, official blog, Google News topic RSS, or community feed).

Respond ONLY with a valid JSON object matching this schema (no markdown formatting, no conversational text):
{
  "resolvedName": "Clean Short Track Name",
  "resolvedDescription": "Clear 1-sentence description of what this track delivers",
  "sourceUrl": "https://example.com/feed.xml",
  "sourceType": "rss"
}
`;

        const result = await model.generateContent(promptText);
        const responseText = result.response.text();
        const cleaned = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned) as {
          resolvedName: string;
          resolvedDescription: string;
          sourceUrl: string;
          sourceType: CustomTopicRecord["sourceType"];
        };

        if (parsed.sourceUrl && parsed.resolvedName) {
          const candidate: ResolvedTopicCandidate = {
            prompt: cleanPrompt,
            resolvedName: parsed.resolvedName,
            resolvedDescription: parsed.resolvedDescription,
            sourceUrl: parsed.sourceUrl,
            sourceType: parsed.sourceType || "rss",
            confidence: "high",
          };
          return NextResponse.json({ candidate });
        }
      } catch (err) {
        console.warn("[TopicResolve] Gemini resolution failed, falling back to smart lookup:", err);
      }
    }

    // Deterministic Smart Topic Lookup
    const candidate = resolveTopicDeterministically(cleanPrompt);
    return NextResponse.json({ candidate });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to resolve topic" },
      { status: 500 }
    );
  }
}

function resolveTopicDeterministically(prompt: string): ResolvedTopicCandidate {
  const p = prompt.toLowerCase();

  if (p.includes("formula") || p.includes("f1") || p.includes("racing")) {
    return {
      prompt,
      resolvedName: "Formula 1 Racing Pulse",
      resolvedDescription: "Grand Prix analysis, race timings, and paddock technical upgrades.",
      sourceUrl: "https://www.autosport.com/rss/f1/news/",
      sourceType: "rss",
      confidence: "high",
    };
  }

  if (p.includes("crypto") || p.includes("bitcoin") || p.includes("ethereum") || p.includes("web3")) {
    return {
      prompt,
      resolvedName: "Crypto & Decentralized Systems",
      resolvedDescription: "Protocol hard-forks, layer-2 throughput, and on-chain intelligence.",
      sourceUrl: "https://cointelegraph.com/rss",
      sourceType: "rss",
      confidence: "high",
    };
  }

  if (p.includes("quantum") || p.includes("physics")) {
    return {
      prompt,
      resolvedName: "Quantum Computing & Physics",
      resolvedDescription: "Qubit coherence benchmarks, superconducting circuits, and research discoveries.",
      sourceUrl: "https://phys.org/rss-feed/physics-news/quantum-physics/",
      sourceType: "rss",
      confidence: "high",
    };
  }

  if (p.includes("gaming") || p.includes("playstation") || p.includes("xbox") || p.includes("nintendo")) {
    return {
      prompt,
      resolvedName: "Next-Gen Gaming Intel",
      resolvedDescription: "Studio drops, engine updates (Unreal/Unity), and industry releases.",
      sourceUrl: "https://www.polygon.com/rss/index.xml",
      sourceType: "rss",
      confidence: "high",
    };
  }

  // Universal RSS feed for general custom queries via Google News RSS
  const encodedQuery = encodeURIComponent(prompt);
  return {
    prompt,
    resolvedName: `${prompt.charAt(0).toUpperCase() + prompt.slice(1)} Dispatch`,
    resolvedDescription: `Curated news and breaking developments regarding ${prompt}.`,
    sourceUrl: `https://news.google.com/rss/search?q=${encodedQuery}&hl=en-US&gl=US&ceid=US:en`,
    sourceType: "rss",
    confidence: "medium",
  };
}
