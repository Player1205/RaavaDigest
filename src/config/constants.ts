import { InterestTrackConfig } from "../types/intelligence";

export const RETENTION_DAYS = 7;
export const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

export const DEFAULT_CORE_TRACKS: InterestTrackConfig[] = [
  {
    id: "tech-ecosystem",
    name: "Big Tech & Ecosystem Code Upgrades",
    description: "Google, Gemini AI, Meta engineering, Node.js, React, Fastify, C++, Python, Rust, and trending open-source releases.",
    enabled: true,
    density: "compact",
    isCore: true,
    sources: [
      {
        id: "google-ai-blog",
        name: "Google AI Blog",
        type: "rss",
        endpoint: "https://blog.google/technology/ai/rss/",
        enabled: true,
      },
      {
        id: "github-trending-tech",
        name: "GitHub Flagship Releases",
        type: "github",
        endpoint: "https://api.github.com/repositories",
        enabled: true,
      },
      {
        id: "react-official-blog",
        name: "React Core Releases",
        type: "rss",
        endpoint: "https://react.dev/rss.xml",
        enabled: true,
      },
      {
        id: "meta-engineering",
        name: "Meta Engineering",
        type: "rss",
        endpoint: "https://engineering.fb.com/feed/",
        enabled: true,
      },
      {
        id: "hacker-news-best",
        name: "Hacker News Flagship Tech",
        type: "rss",
        endpoint: "https://hnrss.org/best",
        enabled: true,
      },
    ],
  },
  {
    id: "entertainment-hub",
    name: "Entertainment Hub",
    description: "Trending movies, TV series premieres, trailers, box office summaries, streaming drops, and IMDb/TMDB reviews.",
    enabled: true,
    density: "compact",
    isCore: true,
    sources: [
      {
        id: "tmdb-trending-movies",
        name: "TMDB Trending Movies & Shows",
        type: "tmdb",
        endpoint: "https://api.themoviedb.org/3/trending/all/day",
        enabled: true,
      },
      {
        id: "variety-entertainment",
        name: "Variety Film & TV",
        type: "rss",
        endpoint: "https://variety.com/feed/",
        enabled: true,
      },
      {
        id: "hollywood-reporter",
        name: "The Hollywood Reporter Box Office",
        type: "rss",
        endpoint: "https://www.hollywoodreporter.com/feed/",
        enabled: true,
      },
    ],
  },
  {
    id: "global-music",
    name: "Global Music & Tracks",
    description: "Spotify trending releases, global charts, album drops, and major artist updates.",
    enabled: true,
    density: "compact",
    isCore: true,
    sources: [
      {
        id: "spotify-new-releases",
        name: "Spotify Global New Releases",
        type: "spotify",
        endpoint: "https://api.spotify.com/v1/browse/new-releases",
        enabled: true,
      },
      {
        id: "billboard-news",
        name: "Billboard Charts & Drops",
        type: "rss",
        endpoint: "https://www.billboard.com/feed/",
        enabled: true,
      },
      {
        id: "rolling-stone-music",
        name: "Rolling Stone Music News",
        type: "rss",
        endpoint: "https://www.rollingstone.com/music/music-news/feed/",
        enabled: true,
      },
    ],
  },
];
