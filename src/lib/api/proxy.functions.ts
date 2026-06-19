import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// User-Agents that IPTV servers are more likely to accept
const IPTV_USER_AGENTS = [
  "VLC/3.0.18 LibVLC/3.0.18",
  "TiviMate/4.7.0 (Linux; Android 11)",
  "IPTVSmartersPro",
  "ExoPlayer/2.18.0",
  "XCIPTV/5.0",
  "Kodi/19.4 (Linux; Android 11; Kernel Version 5.4)",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
];

/**
 * Fetches a URL server-side with IPTV-friendly headers and returns
 * the raw text content. Used for proxying HLS manifests (.m3u8).
 *
 * The server has no CORS restrictions, no referrer leaking,
 * and we also disable TLS verification to handle self-signed certs.
 */
export const proxyFetchManifest = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      url: z.string().url(),
    })
  )
  .handler(async ({ data }) => {
    const originalTls = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    try {
      // Disable TLS verification to handle self-signed/invalid certs on IPTV servers
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

      let lastError: string = "Unknown error";

      for (const ua of IPTV_USER_AGENTS) {
        try {
          const res = await fetch(data.url, {
            headers: {
              "User-Agent": ua,
              Accept: "*/*",
              "Accept-Language": "en-US,en;q=0.9",
              Connection: "keep-alive",
              // No Referer header — avoids referrer-based blocking
            },
            // @ts-ignore — Node 18+ fetch supports this signal
            signal: AbortSignal.timeout(10_000),
          });

          if (!res.ok) {
            lastError = `HTTP ${res.status} ${res.statusText}`;
            continue;
          }

          const contentType = res.headers.get("content-type") ?? "application/octet-stream";
          const text = await res.text();

          return {
            success: true as const,
            content: text,
            contentType,
          };
        } catch (err: any) {
          lastError = err?.message ?? String(err);
          console.warn(`[ProxyFetch] UA "${ua}" failed: ${lastError}`);
        }
      }

      return {
        success: false as const,
        error: `All user-agents failed. Last error: ${lastError}`,
      };
    } finally {
      if (originalTls !== undefined) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalTls;
      } else {
        delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      }
    }
  });
