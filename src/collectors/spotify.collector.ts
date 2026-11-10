import { BaseCollector } from "./base.collector";
import { RawIngestionItem, SourceConfig, TrackId } from "@/types/intelligence";
import { getEnv } from "@/config/env";

interface SpotifyAlbumItem {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  release_date: string;
  total_tracks: number;
  external_urls: { spotify: string };
  album_type: string;
}

interface SpotifyNewReleasesResponse {
  albums: {
    items: SpotifyAlbumItem[];
  };
}

export class SpotifyCollector extends BaseCollector {
  readonly supportedType = "spotify";
  private cachedToken: { token: string; expiresAt: number } | null = null;

  public async collect(source: SourceConfig, trackId: TrackId): Promise<RawIngestionItem[]> {
    const env = getEnv();
    const clientId = env.SPOTIFY_CLIENT_ID;
    const clientSecret = env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return this.getCuratedFallback(source, trackId);
    }

    try {
      const accessToken = await this.getAccessToken(clientId, clientSecret);
      if (!accessToken) {
        return this.getCuratedFallback(source, trackId);
      }

      const res = await fetch("https://api.spotify.com/v1/browse/new-releases?limit=10&country=US", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        console.warn(`[SpotifyCollector] API returned status ${res.status}. Using curated music.`);
        return this.getCuratedFallback(source, trackId);
      }

      const data = (await res.json()) as SpotifyNewReleasesResponse;
      if (!data.albums?.items || !Array.isArray(data.albums.items)) {
        return this.getCuratedFallback(source, trackId);
      }

      return data.albums.items.map((album) => {
        const artists = album.artists.map((a) => a.name).join(", ");
        return {
          id: `spotify_${album.id}`,
          trackId,
          sourceId: source.id,
          sourceName: source.name,
          title: `${album.name} - ${artists} [${album.album_type.toUpperCase()}]`,
          url: album.external_urls?.spotify || `https://open.spotify.com/album/${album.id}`,
          summary: `New ${album.album_type} release featuring ${artists} with ${album.total_tracks} tracks.`,
          publishedAt: album.release_date || new Date().toISOString(),
          metadata: {
            artists,
            albumType: album.album_type,
            totalTracks: album.total_tracks,
          },
        };
      });
    } catch (err) {
      console.error("[SpotifyCollector] Error fetching Spotify API:", err);
      return this.getCuratedFallback(source, trackId);
    }
  }

  private async getAccessToken(clientId: string, clientSecret: string): Promise<string | null> {
    const now = Date.now();
    if (this.cachedToken && this.cachedToken.expiresAt > now + 60000) {
      return this.cachedToken.token;
    }

    try {
      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
      const res = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        return null;
      }

      const data = (await res.json()) as { access_token: string; expires_in: number };
      this.cachedToken = {
        token: data.access_token,
        expiresAt: now + data.expires_in * 1000,
      };
      return data.access_token;
    } catch (err) {
      console.error("[SpotifyCollector] Error authenticating with Spotify:", err);
      return null;
    }
  }

  public getCuratedFallback(source: SourceConfig, trackId: TrackId): RawIngestionItem[] {
    const now = new Date().toISOString();
    return [
      {
        id: "spotify_fallback_global_50",
        trackId,
        sourceId: source.id,
        sourceName: source.name,
        title: "Global Top 50 Chart Movements & Streaming Debuts",
        url: "https://open.spotify.com/playlist/37i9dQZEVXbMDoHDwVN2tF",
        summary: "Weekly viral breakouts, multi-million stream debuts, and international crossover chart-toppers.",
        publishedAt: now,
      },
      {
        id: "spotify_fallback_new_music_friday",
        trackId,
        sourceId: source.id,
        sourceName: source.name,
        title: "Flagship New Music Friday Studio Drops",
        url: "https://open.spotify.com/genre/new-releases",
        summary: "Global studio LP arrivals, surprise EP drops, and major collaborative singles across leading genres.",
        publishedAt: now,
      },
    ];
  }
}
