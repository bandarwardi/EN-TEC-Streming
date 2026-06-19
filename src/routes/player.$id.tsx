import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Play, Pause, Heart, Subtitles, Music2, Maximize2, Info, Sun, Volume2, RotateCcw, RotateCw, Cast, PictureInPicture2, Settings2, ChevronRight, Shield, ExternalLink, Copy, RefreshCw } from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { movies, featuredHero, seriesList } from "@/lib/mock-data";
import { LiveBadge } from "@/components/badges";
import Hls from "hls.js";
import { toast } from "sonner";

export const Route = createFileRoute("/player/$id")({
  component: Player,
});

const DEMO_HLS_STREAM = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

// A module-level flag to indicate if the current stream requires SSL/CORS proxy fallback
let globalProxyFallbackActive = false;

// A custom loader for Hls.js to route all requests (manifests and fragments) 
// through a secure HTTPS proxy when the page is loaded over HTTPS to prevent Mixed Content blocking.
class ProxyLoader {
  private loader: any;

  constructor(config: any) {
    this.loader = new Hls.DefaultConfig.loader(config);
  }

  load(context: any, config: any, callbacks: any) {
    const isHttpsPage = typeof window !== "undefined" && window.location.protocol === "https:";
    if (isHttpsPage && context.url) {
      const isHttp = context.url.startsWith("http://");
      const isHttps = context.url.startsWith("https://");
      const isExternal = (() => {
        try {
          return new URL(context.url).origin !== window.location.origin;
        } catch {
          return false;
        }
      })();

      // We proxy if it's HTTP (always, to avoid mixed content) OR if proxy fallback is active (for TLS/SSL/CORS issues)
      if ((isHttp || (globalProxyFallbackActive && isHttps)) && isExternal && !context.url.includes("corsproxy.io")) {
        const originalUrl = context.url;
        context.url = `https://corsproxy.io/?url=${encodeURIComponent(originalUrl)}`;
        console.log(`[ProxyLoader] Prevents SSL/Mixed Content error: Proxied HLS request: ${originalUrl} -> ${context.url}`);
      }
    }
    this.loader.load(context, config, callbacks);
  }

  abort() {
    this.loader.abort();
  }

  destroy() {
    this.loader.destroy();
  }

  get stats() {
    return this.loader.stats;
  }

  get context() {
    return this.loader.context;
  }

  getCacheAge() {
    return this.loader.getCacheAge ? this.loader.getCacheAge() : null;
  }

  getResponseHeader(name: string) {
    return this.loader.getResponseHeader ? this.loader.getResponseHeader(name) : null;
  }
}

function Player() {
  const { id } = Route.useParams();
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const episodeId = searchParams?.get("episodeId") || undefined;
  const searchStreamUrl = searchParams?.get("streamUrl") || undefined;
  const navigate = useNavigate();
  
  const channels = useAppStore((s) => s.channels);
  const forceHttp = useAppStore((s) => s.forceHttp);
  const channel = channels.find((c) => c.id === id);
  const movie = movies.find((m) => m.id === id);
  const hero = featuredHero.find((h) => h.id === id);
  const series = seriesList.find((s) => s.id === id);
  const isLive = !!channel && (channel.isLive !== false);

  // Find the episode title if a series is played
  let episodeTitle = "";
  if (series && episodeId) {
    const ep = series.episodes.find((e) => e.id === episodeId);
    if (ep) {
      episodeTitle = ` - ${ep.title}`;
    }
  }

  const title = (channel?.name ?? movie?.title ?? series?.title ?? hero?.title ?? "Now Playing") + episodeTitle;
  const subtitle = channel?.current ?? movie?.description ?? series?.description ?? hero?.description ?? "";

  const [playing, setPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [playbackError, setPlaybackError] = useState(false);
  const [volume, setVolume] = useState(80);
  const [brightness, setBrightness] = useState(60);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showSide, setShowSide] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  // Audio track states
  const [audioTracks, setAudioTracks] = useState<{ id: number; name: string; lang?: string }[]>([]);
  const [currentAudioTrack, setCurrentAudioTrack] = useState<number>(-1);
  const [showAudioTracks, setShowAudioTracks] = useState(false);

  // Subtitle track states
  const [subtitleTracks, setSubtitleTracks] = useState<{ id: number; name: string; lang?: string }[]>([]);
  const [currentSubtitleTrack, setCurrentSubtitleTrack] = useState<number>(-1);
  const [showSubtitleTracks, setShowSubtitleTracks] = useState(false);
  const [unsupportedAudioWarning, setUnsupportedAudioWarning] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ping = () => {
    setShowControls(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShowControls(false), 4000);
  };

  useEffect(() => {
    ping();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Initialize HLS / Video element
  useEffect(() => {
    // Reset proxy fallback active flag on new stream load
    globalProxyFallbackActive = false;
    setAudioTracks([]);
    setCurrentAudioTrack(-1);
    setShowAudioTracks(false);
    setSubtitleTracks([]);
    setCurrentSubtitleTrack(-1);
    setShowSubtitleTracks(false);
    setUnsupportedAudioWarning(false);

    const video = videoRef.current;
    if (!video) return;

    // Check for unsupported Dolby AC-3/E-AC-3 audio codec pre-emptively (crucial for direct VOD playback which bypasses HLS.js)
    const audioCodec = searchParams?.get("audioCodec") || undefined;
    if (audioCodec) {
      const isAc3Stream = audioCodec.toLowerCase().includes("ac3") || 
                          audioCodec.toLowerCase().includes("ac-3") || 
                          audioCodec.toLowerCase().includes("dolby");
      if (isAc3Stream) {
        const canPlayAc3 = video.canPlayType('audio/mp4; codecs="ac-3"') !== "" || 
                           video.canPlayType('audio/mp4; codecs="ec-3"') !== "";
        if (!canPlayAc3) {
          setUnsupportedAudioWarning(true);
        }
      }
    }

    // Set referrerpolicy dynamically to avoid React JSX compilation issues
    try {
      video.setAttribute("referrerpolicy", "no-referrer");
    } catch (e) {
      console.warn("Could not set referrerpolicy on video element:", e);
    }

    // Get stream URL (from search params for series, or channel for live/movies, or fallback)
    let streamUrl = searchStreamUrl || channel?.streamUrl || "";
    if (isLive && !streamUrl) {
      streamUrl = DEMO_HLS_STREAM;
    }

    const isVOD = streamUrl.toLowerCase().includes(".mp4") || streamUrl.toLowerCase().includes(".mkv") || streamUrl.toLowerCase().includes(".avi") || (!isLive && !streamUrl.includes(".m3u8") && !streamUrl.includes(".ts"));

    if (!streamUrl) {
      // For movie/series fallback if no URL, choose a video based on the ID or episode ID to ensure different content plays
      const fallbacks = [
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4"
      ];
      const videoKey = episodeId || id;
      let hash = 0;
      for (let i = 0; i < videoKey.length; i++) {
        hash = videoKey.charCodeAt(i) + ((hash << 5) - hash);
      }
      const index = Math.abs(hash) % fallbacks.length;
      video.src = fallbacks[index];
      return;
    }

    // Force HTTP if enabled in settings
    if (forceHttp && streamUrl.startsWith("https://")) {
      console.log(`[Player] Force HTTP active. Changing stream URL to HTTP: ${streamUrl}`);
      streamUrl = streamUrl.replace("https://", "http://");
    }

    // Normalize Xtream Live stream URLs from .ts to .m3u8 (compatibility/cache fallback)
    if (isLive && streamUrl.includes("/live/") && streamUrl.endsWith(".ts")) {
      console.log(`[Player] Migrating cached .ts stream URL to .m3u8: ${streamUrl}`);
      streamUrl = streamUrl.replace(/\.ts$/, ".m3u8");
    }

    // Rewrite stream URL via proxy if page is HTTPS to avoid mixed content block on manifest fetch (only for native non-HLS.js player)
    const isHttpsPage = typeof window !== "undefined" && window.location.protocol === "https:";
    let initialStreamUrl = streamUrl;
    const willUseHlsJs = Hls.isSupported() && !isVOD && (streamUrl.includes(".m3u8") || streamUrl.includes(".ts") || isLive);
    
    if (isHttpsPage && streamUrl.startsWith("http://") && !isVOD && !willUseHlsJs) {
      console.log(`[Player] HTTPS page detected, rewriting stream URL to HTTPS proxy for native playback: ${streamUrl}`);
      initialStreamUrl = `https://corsproxy.io/?url=${encodeURIComponent(streamUrl)}`;
    }

    // Clean up previous Hls instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Event listener for native video error (mixed content / SSL cipher mismatch / native player error)
    const handleNativeVideoError = (e: Event) => {
      const currentSrc = video.src;
      // If HLS.js is used, video.src is a blob: URL. We should use the original streamUrl.
      const actualUrl = (currentSrc && currentSrc.startsWith("blob:")) ? streamUrl : currentSrc;

      if (actualUrl && !actualUrl.includes("corsproxy.io") && !globalProxyFallbackActive) {
        globalProxyFallbackActive = true;
        console.warn(`[Player] Native error on stream. Retrying with proxy fallback: ${actualUrl}`);
        toast.info("Connection failed. Retrying through secure proxy...");
        
        if (hlsRef.current) {
          // Re-load the original streamUrl, ProxyLoader will now proxy both it and all sub-resources (manifests/fragments)
          hlsRef.current.loadSource(streamUrl);
          hlsRef.current.startLoad();
        } else {
          const fallbackUrl = `https://corsproxy.io/?url=${encodeURIComponent(actualUrl)}`;
          video.src = fallbackUrl;
          video.load();
          video.play().catch(err => {
            console.error("[Player] Proxy fallback play failed:", err);
            setPlaybackError(true);
          });
        }
      } else {
        toast.error("Stream playback error. Please verify URL.");
        setPlaybackError(true);
      }
    };

    video.addEventListener("error", handleNativeVideoError);

    // Only use HLS.js if it's not explicitly a VOD file and it looks like an HLS stream
    if (willUseHlsJs) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        ...(isHttpsPage ? {
          fLoader: ProxyLoader,
          pLoader: ProxyLoader,
        } : {}),
      });
      hlsRef.current = hls;
      // Pass the original streamUrl, not the proxy URL, so that Hls.js resolves relative URLs correctly
      hls.loadSource(initialStreamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_, data) => {
        const tracks = hls.audioTracks.map((t, idx) => ({
          id: idx,
          name: t.name || t.lang || `Track ${idx + 1}`,
          lang: t.lang
        }));
        setAudioTracks(tracks);
        setCurrentAudioTrack(hls.audioTrack);
      });

      hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_, data) => {
        setCurrentAudioTrack(data.id);
      });

      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_, data) => {
        const tracks = hls.subtitleTracks.map((t, idx) => ({
          id: idx,
          name: t.name || t.lang || `Subtitle ${idx + 1}`,
          lang: t.lang
        }));
        setSubtitleTracks(tracks);
        setCurrentSubtitleTrack(hls.subtitleTrack);
      });

      hls.on(Hls.Events.SUBTITLE_TRACK_SWITCH, (_, data) => {
        setCurrentSubtitleTrack(data.id);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              // Automatic self-healing: if network fails, try proxy fallback!
              const currentHlsSource = hls.url;
              if (currentHlsSource && !currentHlsSource.includes("corsproxy.io") && !globalProxyFallbackActive) {
                globalProxyFallbackActive = true;
                console.warn(`[Player] Network error on stream. Retrying with HLS proxy fallback: ${streamUrl}`);
                toast.info("Connection failed. Attempting secure proxy...");
                hls.loadSource(streamUrl);
                hls.startLoad();
              } else {
                console.error(`[Player] Fatal Network Error on stream: ${currentHlsSource}`);
                setPlaybackError(true);
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              toast.error("Media decoding error. Recovering...");
              hls.recoverMediaError();
              break;
            default:
              toast.error("Fatal playback error. Stopping.");
              setPlaybackError(true);
              break;
          }
        } else {
          // Check for non-fatal audio decoders issues
          if ((data.details as any) === "audioCodecMimeNotSupported") {
            console.warn("[Player] Audio codec not supported. Attempting automatic fallback to alternative track...");
            const currentTrack = hls.audioTrack;
            const tracks = hls.audioTracks;
            
            if (tracks && tracks.length > 1) {
              let nextTrackIndex = -1;
              for (let i = 0; i < tracks.length; i++) {
                if (i !== currentTrack) {
                  const trackName = (tracks[i].name || "").toLowerCase();
                  // Prefer tracks that don't have ac3/dolby in their names if possible
                  if (!trackName.includes("ac3") && !trackName.includes("ac-3") && !trackName.includes("dolby")) {
                    nextTrackIndex = i;
                    break;
                  }
                }
              }
              
              if (nextTrackIndex === -1) {
                // Fallback to any other track
                nextTrackIndex = tracks.findIndex((_, idx) => idx !== currentTrack);
              }
              
              if (nextTrackIndex !== -1 && nextTrackIndex !== currentTrack) {
                console.log(`[Player] Auto-switching audio track from ${currentTrack} to ${nextTrackIndex} (${tracks[nextTrackIndex].name})`);
                hls.audioTrack = nextTrackIndex;
                setCurrentAudioTrack(nextTrackIndex);
                toast.info(`تم تحويل مسار الصوت تلقائياً لتجاوز عدم دعم الترميز: ${tracks[nextTrackIndex].name || `Track ${nextTrackIndex + 1}`}`, { duration: 5000 });
                return;
              }
            }
            
            setUnsupportedAudioWarning(true);
            toast.error("تنبيه: ترميز الصوت للقناة غير مدعوم في هذا المتصفح ولا تتوفر مسارات بديلة.");
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari native support
      video.src = initialStreamUrl;
    } else {
      // Fallback for regular MP4/direct links
      video.src = initialStreamUrl;
    }

    return () => {
      video.removeEventListener("error", handleNativeVideoError);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [id, episodeId, channel, isLive, forceHttp, retryCount]);

  // Sync play/pause, volume controls
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) {
      video.play().catch(() => setPlaying(false));
    } else {
      video.pause();
    }
  }, [playing]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume / 100;
  }, [volume]);

  // Handle progress updates for non-live content
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    const onLoadedMetadata = () => {
      setDuration(video.duration || 0);
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
    };
  }, []);

  const handleSeek = (newProgress: number) => {
    const video = videoRef.current;
    if (!video || isLive) return;
    const newTime = (newProgress / 100) * duration;
    video.currentTime = newTime;
    setProgress(newProgress);
  };

  const toggleFullscreen = () => {
    const container = videoRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch((err) => {
        toast.error(`Error enabling full-screen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleAudioTrackChange = (trackId: number) => {
    if (hlsRef.current) {
      hlsRef.current.audioTrack = trackId;
      setCurrentAudioTrack(trackId);
      toast.success(`تم تغيير مسار الصوت إلى: ${audioTracks[trackId]?.name || `Track ${trackId + 1}`}`);
    }
    setShowAudioTracks(false);
  };

  const handleSubtitleTrackChange = (trackId: number) => {
    if (hlsRef.current) {
      hlsRef.current.subtitleTrack = trackId;
      setCurrentSubtitleTrack(trackId);
      if (trackId === -1) {
        toast.success("تم إيقاف الترجمة");
      } else {
        toast.success(`تم تشغيل الترجمة: ${subtitleTracks[trackId]?.name || `Track ${trackId + 1}`}`);
      }
    }
    setShowSubtitleTracks(false);
  };

  return (
    <div onClick={() => { ping(); setShowAudioTracks(false); setShowSubtitleTracks(false); }} className="relative flex h-screen w-screen flex-col overflow-hidden bg-black text-white">
      {/* Video area */}
      <div className="absolute inset-0 flex items-center justify-center">
        <video
          ref={videoRef}
          className="h-full w-full object-contain"
          style={{ filter: `brightness(${0.4 + brightness / 200})` }}
          playsInline
          autoPlay
          controls={false}
        />
        <div className="absolute inset-0 bg-black/10 pointer-events-none" />
      </div>

      {/* Top bar */}
      <header className={`relative z-10 flex items-center justify-between px-5 py-4 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        <button onClick={() => window.history.back()} className="grid h-10 w-10 place-items-center rounded-full bg-black/40 backdrop-blur">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="truncate text-base font-bold">{title}</h1>
        <div className="flex items-center gap-2 relative">
          <IconBtn><Info className="h-5 w-5" /></IconBtn>
          <IconBtn><Heart className="h-5 w-5" /></IconBtn>
          
          <div className="relative">
            <IconBtn onClick={(e) => { e.stopPropagation(); setShowSubtitleTracks((s) => !s); setShowAudioTracks(false); }}>
              <Subtitles className={`h-5 w-5 ${showSubtitleTracks ? "text-primary fill-primary animate-pulse" : ""}`} />
            </IconBtn>
            {showSubtitleTracks && (
              <div className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-black/95 backdrop-blur shadow-2xl z-30" onClick={(e) => e.stopPropagation()}>
                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-white/5">خيار الترجمة</div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleSubtitleTrackChange(-1); }}
                  className={`block w-full px-3 py-2 text-left text-xs font-semibold transition ${currentSubtitleTrack === -1 ? "bg-primary text-black" : "hover:bg-white/10"}`}
                >
                  إيقاف الترجمة (Off)
                </button>
                {subtitleTracks.map((t) => (
                  <button
                    key={t.id}
                    onClick={(e) => { e.stopPropagation(); handleSubtitleTrackChange(t.id); }}
                    className={`block w-full px-3 py-2 text-left text-xs font-semibold transition ${currentSubtitleTrack === t.id ? "bg-primary text-black" : "hover:bg-white/10"}`}
                  >
                    {t.name} {t.lang ? `(${t.lang})` : ""}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="relative">
            <IconBtn onClick={(e) => { e.stopPropagation(); setShowAudioTracks((s) => !s); setShowSubtitleTracks(false); }}>
              <Music2 className={`h-5 w-5 ${showAudioTracks ? "text-primary fill-primary animate-pulse" : ""}`} />
            </IconBtn>
            {showAudioTracks && (
              <div className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-black/95 backdrop-blur shadow-2xl z-30" onClick={(e) => e.stopPropagation()}>
                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-white/5">مسارات الصوت</div>
                {audioTracks.length === 0 ? (
                  <div className="px-3 py-2.5 text-xs text-muted-foreground italic">لم يتم العثور على مسارات بديلة</div>
                ) : (
                  audioTracks.map((t) => (
                    <button
                      key={t.id}
                      onClick={(e) => { e.stopPropagation(); handleAudioTrackChange(t.id); }}
                      className={`block w-full px-3 py-2 text-left text-xs font-semibold transition ${currentAudioTrack === t.id ? "bg-primary text-black" : "hover:bg-white/10"}`}
                    >
                      {t.name} {t.lang ? `(${t.lang})` : ""}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          
          <IconBtn><Cast className="h-5 w-5" /></IconBtn>
          <IconBtn><PictureInPicture2 className="h-5 w-5" /></IconBtn>
          <IconBtn onClick={toggleFullscreen}><Maximize2 className="h-5 w-5" /></IconBtn>
        </div>
      </header>

      {unsupportedAudioWarning && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-35 w-11/12 max-w-xl rounded-2xl bg-destructive/90 backdrop-blur border border-destructive/20 p-4 text-center text-white shadow-2xl animate-in fade-in slide-in-from-top duration-300" onClick={(e) => e.stopPropagation()}>
          <p className="text-sm font-bold">⚠️ {isLive ? "القناة تستخدم" : "هذا المحتوى يستخدم"} صوت Dolby (AC-3) غير المدعوم في متصفح كروم/فايرفوكس.</p>
          <p className="text-xs mt-1 text-white/90">لحل المشكلة وتشغيل الصوت فوراً، يرجى فتح الموقع باستخدام متصفح **Microsoft Edge** أو **Safari**، أو استخدام رابط البث وتشغيله في تطبيق **VLC**.</p>
          <button onClick={() => setUnsupportedAudioWarning(false)} className="mt-2.5 rounded-lg bg-white/20 px-3 py-1 text-[11px] font-bold hover:bg-white/30 transition cursor-pointer">حسناً، فهمت</button>
        </div>
      )}

      {/* Side rails: brightness + volume */}
      <div className={`pointer-events-none absolute left-5 top-1/2 z-10 -translate-y-1/2 transition-opacity ${showControls ? "opacity-100" : "opacity-0"}`}>
        <div className="pointer-events-auto flex flex-col items-center gap-3">
          <Sun className="h-5 w-5" />
          <input type="range" min={0} max={100} value={brightness} onChange={(e) => setBrightness(+e.target.value)} className="h-48 w-1 appearance-none accent-white [writing-mode:vertical-lr] rotate-180" />
        </div>
      </div>
      <div className={`pointer-events-none absolute right-5 top-1/2 z-10 -translate-y-1/2 transition-opacity ${showControls ? "opacity-100" : "opacity-0"}`}>
        <div className="pointer-events-auto flex flex-col items-center gap-3">
          <Volume2 className="h-5 w-5" />
          <input type="range" min={0} max={100} value={volume} onChange={(e) => setVolume(+e.target.value)} className="h-48 w-1 appearance-none accent-white [writing-mode:vertical-lr] rotate-180" />
        </div>
      </div>

      {/* Center play controls */}
      <div className={`relative z-10 flex flex-1 items-center justify-center gap-10 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}>
        {!isLive && (
          <button onClick={(e) => { e.stopPropagation(); handleSeek(Math.max(0, progress - 5)); }} className="grid h-14 w-14 place-items-center rounded-full bg-black/40 backdrop-blur transition active:scale-90">
            <RotateCcw className="h-7 w-7" />
            <span className="absolute mt-1 text-[10px] font-bold">10</span>
          </button>
        )}
        <button onClick={(e) => { e.stopPropagation(); setPlaying((p) => !p); }} className="grid h-20 w-20 place-items-center rounded-full bg-white/10 backdrop-blur-md border border-white/20 transition active:scale-90">
          {playing ? <Pause className="h-10 w-10 fill-white" /> : <Play className="h-10 w-10 fill-white" />}
        </button>
        {!isLive && (
          <button onClick={(e) => { e.stopPropagation(); handleSeek(Math.min(100, progress + 5)); }} className="grid h-14 w-14 place-items-center rounded-full bg-black/40 backdrop-blur transition active:scale-90">
            <RotateCw className="h-7 w-7" />
            <span className="absolute mt-1 text-[10px] font-bold">10</span>
          </button>
        )}
      </div>

      {/* Side panel toggles */}
      {isLive && (
        <div className={`absolute bottom-24 right-5 z-10 flex flex-col gap-2 transition-opacity ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
          <button onClick={(e) => { e.stopPropagation(); setShowSide(true); }} className="inline-flex items-center gap-2 rounded-full bg-black/60 backdrop-blur px-3 py-2 text-xs font-bold">
            Channels <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Bottom bar */}
      <footer className={`relative z-10 px-5 pb-6 pt-4 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        {isLive ? (
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2 text-[11px] font-bold text-white/70">
                <span>{channel?.category}</span> · <span>Group: Active Playlist</span>
              </div>
              <h2 className="truncate text-xl font-black">{channel?.name} <span className="ml-1 align-top text-[10px] font-bold text-primary">LIVE</span></h2>
              <p className="mt-1 truncate text-xs text-white/80">▶ {channel?.current} → {channel?.next}</p>
            </div>
            <div className="text-right">
              <LiveBadge />
              <p className="mt-1 text-[10px] font-bold text-white/70">{channel?.quality || "HD"}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between text-xs font-mono text-white/80">
              <span>{formatTime((progress / 100) * duration)}</span>
              <span>{formatTime(duration)}</span>
            </div>
            <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/20 cursor-pointer" onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              handleSeek((clickX / rect.width) * 100);
            }}>
              <div className="absolute inset-y-0 left-0 bg-primary" style={{ width: `${progress}%` }} />
              <div className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-primary shadow-glow" style={{ left: `calc(${progress}% - 6px)` }} />
            </div>
            <div className="mt-3">
              <h2 className="truncate text-lg font-black">{title}</h2>
              <p className="truncate text-xs text-white/77">{subtitle}</p>
            </div>
          </>
        )}
      </footer>

      {/* Side panel for Live quick switch */}
      {showSide && isLive && (
        <div className="absolute inset-0 z-25 flex justify-end bg-black/60 backdrop-blur-sm" onClick={() => setShowSide(false)}>
          <div onClick={(e) => e.stopPropagation()} className="h-full w-80 max-w-[85vw] overflow-y-auto border-l border-border bg-card p-4 animate-in slide-in-from-right">
            <h3 className="mb-3 text-sm font-bold">Quick Switch</h3>
            <div className="space-y-2">
              {channels.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { navigate({ to: "/player/$id", params: { id: c.id } }); setShowSide(false); }}
                  className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition ${c.id === id ? "border-primary bg-primary/10" : "border-border bg-surface hover:border-primary/50"}`}
                >
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                    <img src={c.logo} alt={c.name} className="h-full w-full object-cover" onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=1A1A1A&color=fff&bold=true`;
                    }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{c.name}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{c.current}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Playback Error Overlay */}
      {playbackError && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-6 text-center">
          <div className="max-w-md space-y-5">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-destructive/15 text-destructive animate-pulse">
              <Shield className="h-8 w-8" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-bold">عذرًا، تعذر تشغيل البث في المتصفح</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                يحدث هذا بسبب قيود CORS أو شهادات SSL على خادم البث. يمكن تجاوز هذا بفتح المشغل في تبويب جديد.
              </p>
              <p className="text-xs text-muted-foreground/80 font-mono truncate max-w-[280px] sm:max-w-md mx-auto mt-1 px-3 py-1 bg-white/5 rounded border border-white/10">
                {channel?.streamUrl || DEMO_HLS_STREAM}
              </p>
            </div>

            {/* Primary Action: Open full player page in new tab */}
            <a
              href={`/player/${id}${episodeId ? `?episodeId=${episodeId}` : ""}`}
              target="_blank"
              rel="noreferrer"
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gold-gradient px-5 py-4 text-base font-black text-black shadow-glow active:scale-95 transition"
            >
              <ExternalLink className="h-5 w-5" />
              فتح المشغّل في تبويب جديد (تجاوز الحجب)
            </a>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href={channel?.streamUrl || DEMO_HLS_STREAM}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold active:scale-95 transition hover:bg-white/15"
              >
                <ExternalLink className="h-4 w-4" />
                فتح رابط البث مباشرةً
              </a>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(channel?.streamUrl || DEMO_HLS_STREAM);
                  toast.success("تم نسخ الرابط بنجاح!");
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold active:scale-95 transition hover:bg-white/15"
              >
                <Copy className="h-4 w-4" />
                نسخ رابط البث
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setPlaybackError(false);
                setPlaying(true);
                globalProxyFallbackActive = false;
                setRetryCount(prev => prev + 1);
              }}
              className="inline-flex items-center gap-2 text-xs text-primary underline mx-auto pt-2 hover:text-primary/80 cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" />
              إعادة المحاولة
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function IconBtn({ children, onClick }: { children: React.ReactNode; onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void }) {
  return <button onClick={onClick} className="grid h-9 w-9 place-items-center rounded-full bg-black/30 backdrop-blur hover:bg-black/50">{children}</button>;
}

function formatTime(seconds: number) {
  if (isNaN(seconds)) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
