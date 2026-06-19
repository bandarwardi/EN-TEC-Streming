import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface M3UChannel {
  id: string;
  name: string;
  logo: string;
  category: string;
  streamUrl: string;
  current: string;
  next: string;
  quality: "4K" | "FHD" | "HD";
  isLive: boolean;
}

export function parseM3U(text: string): M3UChannel[] {
  const lines = text.split(/\r?\n/);
  const channels: M3UChannel[] = [];
  let currentInfo: {
    name: string;
    logo: string;
    category: string;
    quality: "4K" | "FHD" | "HD";
  } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith("#EXTINF:")) {
      // Parse info
      // Example: #EXTINF:-1 tvg-id="CNN" tvg-logo="http://..." group-title="News",CNN International
      const infoPart = line.substring(8);
      const commaIndex = infoPart.lastIndexOf(",");
      let name = "Unknown Channel";
      let attrsString = infoPart;

      if (commaIndex !== -1) {
        name = infoPart.substring(commaIndex + 1).trim();
        attrsString = infoPart.substring(0, commaIndex);
      }

      // Regex to parse key="value" attributes
      const attrs: Record<string, string> = {};
      const regex = /([a-zA-Z0-9_-]+)="([^"]*)"/g;
      let match;
      while ((match = regex.exec(attrsString)) !== null) {
        attrs[match[1].toLowerCase()] = match[2];
      }

      const logo = attrs["tvg-logo"] || attrs["logo"] || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1A1A1A&color=fff&bold=true&size=128&format=svg`;
      const category = attrs["group-title"] || "General";

      // Detect quality from name
      let quality: "4K" | "FHD" | "HD" = "HD";
      if (name.toUpperCase().includes("4K") || name.toUpperCase().includes("UHD")) {
        quality = "4K";
      } else if (name.toUpperCase().includes("FHD") || name.toUpperCase().includes("1080")) {
        quality = "FHD";
      }

      currentInfo = {
        name,
        logo,
        category,
        quality,
      };
    } else if (line.startsWith("#")) {
      // Skip other comments
      continue;
    } else {
      // It's a URL
      if (currentInfo) {
        // Generate a deterministic ID based on the URL or index to prevent collisions
        const cleanUrl = line.split("?")[0] || line;
        const id = btoa(cleanUrl).replace(/[^a-zA-Z0-9]/g, "").substring(0, 16) || `ch_${channels.length}`;
        
        channels.push({
          id,
          name: currentInfo.name,
          logo: currentInfo.logo,
          category: currentInfo.category,
          streamUrl: line,
          current: "Live Stream",
          next: "Upcoming Program",
          quality: currentInfo.quality,
          isLive: true,
        });
        currentInfo = null;
      }
    }
  }

  return channels;
}

async function fetchPlaylistWithFallback(url: string): Promise<string> {
  const userAgents = [
    "VLC",
    "VLC/3.0.18 LibVLC/3.0.18",
    "TiviMate/4.7.0 (Linux; Android 11)",
    "ExoPlayer",
    "IPTVSmartersPro",
    "XCIPTV",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "IPTVSmarters",
  ];

  let lastError: Error | null = null;
  const originalTlsReject = process.env.NODE_TLS_REJECT_UNAUTHORIZED;

  try {
    // Disable TLS reject unauthorized to handle self-signed or invalid certificates
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    for (const ua of userAgents) {
      try {
        console.log(`[M3U Fetch] Trying User-Agent: ${ua}`);
        const response = await fetch(url, {
          headers: {
            "User-Agent": ua,
            "Accept": "*/*",
            "Connection": "keep-alive",
          },
        });

        if (response.ok) {
          console.log(`[M3U Fetch] Success using User-Agent: ${ua}`);
          return await response.text();
        } else {
          console.warn(`[M3U Fetch] Failed with User-Agent "${ua}": HTTP ${response.status}`);
          lastError = new Error(`Failed to fetch playlist: HTTP ${response.status}`);
        }
      } catch (err: any) {
        console.warn(`[M3U Fetch] Error with User-Agent "${ua}":`, err.message || err);
        lastError = err;
      }
    }
  } finally {
    if (originalTlsReject !== undefined) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalTlsReject;
    } else {
      delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    }
  }

  throw lastError || new Error("Failed to fetch playlist after all attempts");
}

export const fetchAndParseM3U = createServerFn({ method: "POST" })
  .inputValidator(z.object({ url: z.string().url() }))
  .handler(async ({ data }) => {
    try {
      const text = await fetchPlaylistWithFallback(data.url);
      const channels = parseM3U(text);
      return { success: true, channels };
    } catch (error: any) {
      console.error("Error fetching or parsing M3U:", error);
      return { success: false, error: error.message || "Failed to load playlist" };
    }
  });

async function fetchJsonWithCORS(url: string): Promise<any> {
  // 1. Try direct fetch
  try {
    const response = await fetch(url);
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.warn(`Direct fetch failed for ${url}, trying corsproxy.io...`, e);
  }

  // 2. Try corsproxy.io
  try {
    const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.warn(`corsproxy.io failed for ${url}, trying allorigins...`, e);
  }

  // 3. Try api.allorigins.win
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.error(`All CORS proxies failed for ${url}`, e);
  }

  throw new Error(`Failed to fetch resources from ${url} (CORS blocked)`);
}

export async function fetchPlaylist(url: string): Promise<{ success: true; channels: M3UChannel[] } | { success: false; error: string }> {
  try {
    console.log("[Playlists] Fetching M3U playlist client-side...");
    
    let text = "";
    let fetched = false;

    // 1. Try direct fetch
    try {
      const response = await fetch(url);
      if (response.ok) {
        text = await response.text();
        fetched = true;
      }
    } catch (e) {
      console.warn("Direct client-side fetch failed, trying corsproxy.io...", e);
    }

    // 2. Try corsproxy.io
    if (!fetched) {
      try {
        const response = await fetch(`https://corsproxy.io/?url=${encodeURIComponent(url)}`);
        if (response.ok) {
          text = await response.text();
          fetched = true;
        }
      } catch (e) {
        console.warn("corsproxy.io failed, trying allorigins...", e);
      }
    }

    // 3. Try allorigins.win
    if (!fetched) {
      try {
        const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
        if (response.ok) {
          text = await response.text();
          fetched = true;
        }
      } catch (e) {
        console.error("allorigins failed, no options left.", e);
      }
    }

    if (!fetched) {
      return { success: false, error: "Failed to download M3U playlist (CORS or Network Error)" };
    }

    const channels = parseM3U(text);
    return { success: true, channels };
  } catch (error: any) {
    console.error("Error parsing M3U:", error);
    return { success: false, error: error.message || "Failed to load playlist" };
  }
}

export interface XtreamCategories {
  live: { id: string; name: string }[];
  vod: { id: string; name: string }[];
  series: { id: string; name: string }[];
}

export async function fetchXtreamCategories(host: string, username: string, password: string): Promise<{ success: true; categories: XtreamCategories } | { success: false; error: string }> {
  try {
    const cleanHost = host.replace(/\/+$/, "");
    const baseUrl = `${cleanHost}/player_api.php?username=${username}&password=${password}`;

    const liveCategoriesUrl = `${baseUrl}&action=get_live_categories`;
    const vodCategoriesUrl = `${baseUrl}&action=get_vod_categories`;
    const seriesCategoriesUrl = `${baseUrl}&action=get_series_categories`;

    console.log(`[Xtream] Syncing categories for host: ${cleanHost}`);

    const [live, vod, series] = await Promise.all([
      fetchJsonWithCORS(liveCategoriesUrl).catch(() => []),
      fetchJsonWithCORS(vodCategoriesUrl).catch(() => []),
      fetchJsonWithCORS(seriesCategoriesUrl).catch(() => []),
    ]);

    const formatCategories = (arr: any[]) => {
      if (!Array.isArray(arr)) return [];
      return arr
        .filter((c) => c && c.category_id && c.category_name)
        .map((c) => ({
          id: String(c.category_id),
          name: String(c.category_name),
        }));
    };

    return {
      success: true,
      categories: {
        live: formatCategories(live),
        vod: formatCategories(vod),
        series: formatCategories(series),
      },
    };
  } catch (error: any) {
    console.error("Error fetching Xtream categories:", error);
    return { success: false, error: error.message || "Failed to load categories" };
  }
}

export async function fetchXtreamChannelsByCategory(
  host: string,
  username: string,
  password: string,
  type: "live" | "vod" | "series",
  categoryId: string,
  categoryName: string
): Promise<{ success: true; channels: M3UChannel[] } | { success: false; error: string }> {
  try {
    const cleanHost = host.replace(/\/+$/, "");
    const baseUrl = `${cleanHost}/player_api.php?username=${username}&password=${password}`;
    
    let action = "";
    if (type === "live") action = "get_live_streams";
    else if (type === "vod") action = "get_vod_streams";
    else if (type === "series") action = "get_series";

    const fetchUrl = `${baseUrl}&action=${action}&category_id=${categoryId}`;
    console.log(`[Xtream] Syncing streams for type: ${type}, category: ${categoryId} (${categoryName})`);

    const rawStreams = await fetchJsonWithCORS(fetchUrl);
    const channelsList: M3UChannel[] = [];

    if (Array.isArray(rawStreams)) {
      for (const item of rawStreams) {
        if (!item || !item.name) continue;

        let quality: "4K" | "FHD" | "HD" = "HD";
        if (item.name.toUpperCase().includes("4K") || item.name.toUpperCase().includes("UHD")) {
          quality = "4K";
        } else if (item.name.toUpperCase().includes("FHD") || item.name.toUpperCase().includes("1080")) {
          quality = "FHD";
        }

        if (type === "live" && item.stream_id) {
          const streamUrl = `${cleanHost}/live/${username}/${password}/${item.stream_id}.m3u8`;
          channelsList.push({
            id: `xt_live_${item.stream_id}`,
            name: item.name,
            logo: item.stream_icon || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=1A1A1A&color=fff&bold=true&size=128&format=svg`,
            category: categoryName,
            streamUrl,
            current: "Live Stream",
            next: "Upcoming Program",
            quality,
            isLive: true,
          });
        } else if (type === "vod" && item.stream_id) {
          // Force .m3u8 extension so Xtream streams it as HLS chunks, bypassing MP4 MOOV atom issues
          const ext = "m3u8";
          const streamUrl = `${cleanHost}/movie/${username}/${password}/${item.stream_id}.${ext}`;
          channelsList.push({
            id: `xt_vod_${item.stream_id}`,
            name: item.name,
            logo: item.stream_icon || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=8B5CF6&color=fff&bold=true&size=128&format=svg`,
            category: categoryName,
            streamUrl,
            current: "Movie",
            next: "VOD",
            quality,
            isLive: false,
          });
        } else if (type === "series" && item.series_id) {
          channelsList.push({
            id: `xt_series_${item.series_id}`,
            name: item.name,
            logo: item.cover || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=EC4899&color=fff&bold=true&size=128&format=svg`,
            category: categoryName,
            streamUrl: "",
            current: item.plot || "TV Series",
            next: "Episodes Available",
            quality: "FHD",
            isLive: false,
          });
        }
      }
    }

    return { success: true, channels: channelsList };
  } catch (error: any) {
    console.error(`Error fetching Xtream channels for category ${categoryId}:`, error);
    return { success: false, error: error.message || "Failed to load category streams" };
  }
}

export async function fetchXtreamSeriesInfo(
  host: string,
  username: string,
  password: string,
  seriesId: string
): Promise<{ success: true; info: any } | { success: false; error: string }> {
  try {
    const cleanHost = host.replace(/\/+$/, "");
    const baseUrl = `${cleanHost}/player_api.php?username=${username}&password=${password}`;
    const fetchUrl = `${baseUrl}&action=get_series_info&series_id=${seriesId}`;
    
    console.log(`[Xtream] Fetching series info for series_id: ${seriesId}`);
    const data = await fetchJsonWithCORS(fetchUrl);
    return { success: true, info: data };
  } catch (error: any) {
    console.error(`Error fetching Xtream series info for ${seriesId}:`, error);
    return { success: false, error: error.message || "Failed to load series info" };
  }
}

export async function fetchXtreamVodInfo(
  host: string,
  username: string,
  password: string,
  vodId: string
): Promise<{ success: true; info: any } | { success: false; error: string }> {
  try {
    const cleanHost = host.replace(/\/+$/, "");
    const baseUrl = `${cleanHost}/player_api.php?username=${username}&password=${password}`;
    const fetchUrl = `${baseUrl}&action=get_vod_info&vod_id=${vodId}`;
    
    console.log(`[Xtream] Fetching VOD info for vod_id: ${vodId}`);
    const data = await fetchJsonWithCORS(fetchUrl);
    return { success: true, info: data };
  } catch (error: any) {
    console.error(`Error fetching Xtream VOD info for ${vodId}:`, error);
    return { success: false, error: error.message || "Failed to load VOD info" };
  }
}

