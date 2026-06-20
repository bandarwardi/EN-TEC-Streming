import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, Star, Play, Heart, Drama, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { seriesList, type SeriesEpisode } from "@/lib/mock-data";
import { DetailSkeleton } from "@/components/detail-skeleton";
import { useAppStore } from "@/store/app-store";
import { fetchXtreamSeriesInfo } from "@/lib/api/m3u.functions";
import { QualityBadge } from "@/components/badges";

export const Route = createFileRoute("/_app/series/$id")({
  component: SeriesDetailPage,
  pendingComponent: DetailSkeleton,
  pendingMs: 0,
  loader: async ({ params }) => {
    let series = seriesList.find((s) => s.id === params.id);
    let similarSeries: any[] = [];

    if (!series) {
      const channel = useAppStore.getState().channels.find((c) => c.id === params.id);
      if (channel) {
        let episodes: any[] = [];
        let infoData: any = {};
        
        // Fetch real episodes if it's an Xtream series
        const playlistId = useAppStore.getState().activePlaylistId;
        const playlist = useAppStore.getState().playlists.find(p => p.id === playlistId);
        
        if (playlist && playlist.url.startsWith("xtream://") && channel.id.startsWith("xt_series_")) {
          try {
            const config = JSON.parse(atob(playlist.url.replace("xtream://", "")));
            const seriesId = channel.id.replace("xt_series_", "");
            
            const res = await fetchXtreamSeriesInfo(config.host, config.username, config.password, seriesId);
            if (res.success && res.info) {
              infoData = res.info.info || {};
              const cleanHost = config.host.replace(/\/+$/, "");
              if (res.info.episodes) {
                Object.values(res.info.episodes).forEach((season: any) => {
                  if (Array.isArray(season)) {
                    season.forEach((ep: any) => {
                      const ext = "m3u8";
                      const streamUrl = `${cleanHost}/series/${config.username}/${config.password}/${ep.id}.${ext}`;
                      const epAudio = ep.info?.audio || ep.info?.audio_codec || ep.info?.video_properties?.audio_codec || "";
                      episodes.push({
                        id: String(ep.id),
                        number: ep.episode_num,
                        title: ep.title || `Episode ${ep.episode_num}`,
                        duration: ep.info?.duration || "45m",
                        thumbnail: ep.info?.movie_image || channel.logo,
                        streamUrl,
                        audioCodec: epAudio
                      });
                    });
                  }
                });
              }
            }
          } catch (e) {
            console.error("Failed to load real series details in loader:", e);
          }
        }

        // Fallback if no episodes found
        if (episodes.length === 0) {
          episodes = [
            {
              id: `${channel.id}_e1`,
              number: 1,
              title: "Episode 1",
              duration: "45m",
              thumbnail: channel.logo
            }
          ];
        }

        let cleanedCast: string[] = [];
        if (infoData.cast) {
          const rawParts = infoData.cast.split(/[,;|]|\r?\n|\s{2,}|\s*-\s*|\s*\/\s*/);
          cleanedCast = rawParts.map((p: string) => p.trim()).filter((p: string) => p.length > 0);

          if (cleanedCast.length === 1 && cleanedCast[0].includes(' ')) {
            const words = cleanedCast[0].split(/\s+/).filter((w: string) => w.length > 0);
            if (words.length > 3) {
              const grouped: string[] = [];
              for (let i = 0; i < words.length; i += 2) {
                if (i + 1 < words.length) {
                  grouped.push(`${words[i]} ${words[i + 1]}`);
                } else {
                  grouped.push(words[i]);
                }
              }
              cleanedCast = grouped;
            }
          }
        }

        const castArray = cleanedCast.map((name: string) => ({
          name,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1A1A1A&color=fff&bold=true`
        }));

        series = {
          id: channel.id,
          title: infoData.name || channel.name,
          poster: infoData.cover || channel.logo,
          backdrop: infoData.backdrop_path?.[0] || infoData.cover || channel.logo,
          rating: infoData.rating ? parseFloat(infoData.rating) : 8.0,
          seasons: Object.keys(infoData.episodes || {}).length || 1,
          year: infoData.releaseDate ? new Date(infoData.releaseDate).getFullYear() : 2026,
          genres: infoData.genre ? infoData.genre.split(",").map((g: string) => g.trim()) : [channel.category],
          description: infoData.plot || infoData.description || `TV Series: ${channel.name} from category ${channel.category}.`,
          cast: castArray,
          director: infoData.director || "",
          youtube_trailer: infoData.youtube_trailer || "",
          episodes
        };
      }
    }

    // Load similar series
    const allChannels = useAppStore.getState().channels;
    if (series) {
      similarSeries = allChannels
        .filter((c) => c.id !== params.id && c.category === series.genres[0])
        .slice(0, 5)
        .map((c) => ({
          id: c.id,
          title: c.name,
          poster: c.logo,
          rating: 8.0,
          year: 2026
        }));

      if (similarSeries.length === 0) {
        similarSeries = seriesList
          .filter((s) => s.id !== series.id && s.genres.some((g) => series.genres.includes(g)))
          .slice(0, 5);
      }
    }

    if (!series) throw notFound();
    return { series, similarSeries };
  },
  notFoundComponent: () => <div className="p-10 text-center">Series not found</div>,
  errorComponent: ({ error }) => {
    if (typeof window !== "undefined") toast.error("Failed to load series", { description: error.message });
    return <div className="p-10 text-center text-destructive">{error.message}</div>;
  },
});

function SeriesDetailPage() {
  const { series, similarSeries } = Route.useLoaderData();
  const [showTrailer, setShowTrailer] = useState(false);

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-x-0 top-0 h-[60vh] -z-10">
        <img src={series.backdrop} alt="" className="h-full w-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/30" />
      </div>

      <header className="flex items-center gap-3 px-5 pt-5">
        <Link to="/series" className="grid h-9 w-9 place-items-center rounded-full bg-surface/70 backdrop-blur"><ChevronLeft className="h-5 w-5" /></Link>
        <h1 className="text-lg font-semibold text-muted-foreground">Series Details</h1>
      </header>

      <div className="px-5 pt-6 lg:flex lg:gap-8">
        <div className="mx-auto w-52 shrink-0 overflow-hidden rounded-2xl border border-border shadow-2xl lg:mx-0 lg:w-64">
          <img src={series.poster} alt={series.title} className="aspect-[2/3] w-full object-cover" />
        </div>

        <div className="mt-6 flex-1 lg:mt-0">
          <h2 className="text-3xl font-black leading-tight lg:text-4xl">{series.title} ({series.year})</h2>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span>{series.year}</span>
            <span>• {series.seasons} Season{series.seasons > 1 ? "s" : ""}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-xs font-bold text-foreground">
              <Star className="h-3 w-3 fill-primary text-primary" /> {series.rating}
            </span>
          </div>

          {series.director && (
            <p className="mt-3 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Director: </span>
              {series.director}
            </p>
          )}

          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-foreground/85">{series.description}</p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-surface/70 px-3 py-1.5 text-xs font-semibold backdrop-blur">
            <Drama className="h-4 w-4 text-primary" />
            {series.genres.join(" / ")}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-4 max-w-2xl">
            <Link 
              to="/player/$id" 
              params={{ id: series.id }} 
              search={{ 
                episodeId: series.episodes[0]?.id, 
                streamUrl: series.episodes[0]?.streamUrl,
                audioCodec: series.episodes[0]?.audioCodec
              }} 
              className="inline-flex items-center justify-between gap-3 rounded-2xl bg-surface/80 px-5 py-3.5 text-sm font-bold backdrop-blur hover:bg-surface"
            >
              Watch Now <Play className="h-5 w-5 fill-current" />
            </Link>
            <a
              href={`/player/${series.id}${series.episodes[0]?.id ? `?episodeId=${series.episodes[0].id}&streamUrl=${encodeURIComponent(series.episodes[0].streamUrl || "")}${series.episodes[0]?.audioCodec ? `&audioCodec=${encodeURIComponent(series.episodes[0].audioCodec)}` : ""}` : ""}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-between gap-3 rounded-2xl bg-primary/20 border border-primary/40 px-5 py-3.5 text-sm font-bold backdrop-blur transition hover:bg-primary/30"
            >
              New Tab <ExternalLink className="h-5 w-5" />
            </a>
            
            {series.youtube_trailer ? (
              <button
                onClick={() => setShowTrailer(true)}
                className="inline-flex items-center justify-between gap-3 rounded-2xl bg-surface/80 px-5 py-3.5 text-sm font-bold backdrop-blur transition hover:bg-surface cursor-pointer"
              >
                Trailer Series <Play className="h-5 w-5 text-primary fill-primary" />
              </button>
            ) : (
              <button
                disabled
                className="inline-flex items-center justify-between gap-3 rounded-2xl bg-surface/30 px-5 py-3.5 text-sm font-bold backdrop-blur opacity-50 cursor-not-allowed"
              >
                No Trailer <Play className="h-5 w-5" />
              </button>
            )}

            <button onClick={() => toast.success("Added to favorites!")} className="inline-flex items-center justify-between gap-3 rounded-2xl bg-surface/80 px-5 py-3.5 text-sm font-bold backdrop-blur hover:bg-surface">
              Favorite <Heart className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Cast */}
      {series.cast && series.cast.length > 0 && (
        <section className="mt-10 px-5">
          <h3 className="mb-4 text-lg font-bold">Cast:</h3>
          <div className="flex gap-5 overflow-x-auto scrollbar-hide -mx-5 px-5">
            {series.cast.map((c: { name: string; avatar: string }, i: number) => (
              <div key={i} className="shrink-0 w-24 text-center">
                <div className="mx-auto h-24 w-24 overflow-hidden rounded-full border-2 border-border bg-surface">
                  <img
                    src={c.avatar}
                    alt={c.name}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=1A1A1A&color=fff&bold=true`;
                    }}
                  />
                </div>
                <p className="mt-2 truncate text-xs font-semibold">{c.name}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Episodes */}
      <section className="mt-10 space-y-8 px-5 pb-10">
        {/* Current episode */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse-live" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Current Episode</h3>
          </div>
          {series.episodes.slice(0, 1).map((ep: SeriesEpisode) => (
            <Link 
              key={ep.id} 
              to="/player/$id" 
              params={{ id: series.id }} 
              search={{ episodeId: ep.id, streamUrl: ep.streamUrl, audioCodec: ep.audioCodec }} 
              className="flex gap-4 rounded-2xl border border-primary/40 bg-primary/5 p-3 transition hover:bg-primary/10"
            >
              <div className="relative aspect-video w-44 shrink-0 overflow-hidden rounded-xl">
                <img src={ep.thumbnail} alt={ep.title} className="h-full w-full object-cover" />
                <div className="absolute inset-0 grid place-items-center bg-background/30">
                  <Play className="h-9 w-9 fill-foreground text-foreground" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Season {series.seasons >= 1 ? 1 : series.seasons} · Episode {ep.number}</p>
                <h4 className="mt-1 truncate text-base font-bold">{ep.title}</h4>
                <p className="mt-1 text-xs text-muted-foreground">{ep.duration}</p>
                <p className="mt-2 line-clamp-2 text-xs text-foreground/80">{series.description}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Upcoming */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider">Upcoming Episodes</h3>
            <span className="text-xs text-muted-foreground">Season 1 · {series.episodes.length} episodes</span>
          </div>
          <div className="flex gap-4 overflow-x-auto scrollbar-hide -mx-5 px-5">
            {series.episodes.slice(1).map((ep: SeriesEpisode) => (
              <Link 
                key={ep.id} 
                to="/player/$id" 
                params={{ id: series.id }} 
                search={{ episodeId: ep.id, streamUrl: ep.streamUrl, audioCodec: ep.audioCodec }} 
                className="group shrink-0 w-56"
              >

                <div className="relative aspect-video overflow-hidden rounded-xl border border-border">
                  <img src={ep.thumbnail} alt={ep.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                  <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between text-[11px] font-bold">
                    <span className="rounded bg-background/80 px-1.5 py-0.5">S1·E{ep.number}</span>
                    <span className="rounded bg-background/80 px-1.5 py-0.5">{ep.duration}</span>
                  </div>
                </div>
                <p className="mt-2 truncate text-xs font-medium">{ep.title}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Similar Suggestions */}
      {similarSeries && similarSeries.length > 0 && (
        <section className="mt-10 px-5 pb-16">
          <h3 className="mb-4 text-lg font-bold">Similar Series:</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {similarSeries.map((m: any) => (
              <div key={m.id} className="group relative">
                <Link to="/series/$id" params={{ id: m.id }} className="block">
                  <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-border bg-surface">
                    <img
                      src={m.poster}
                      alt={m.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(m.title)}&background=EC4899&color=fff&bold=true&size=128&format=svg`;
                      }}
                    />
                    <div className="absolute top-2 right-2"><QualityBadge quality="FHD" /></div>
                    <div className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded bg-background/70 backdrop-blur px-1.5 py-0.5 text-[10px] font-bold">
                      <Star className="h-2.5 w-2.5 fill-primary text-primary" /> {m.rating || "8.0"}
                    </div>
                  </div>
                  <p className="mt-2 truncate text-sm font-semibold">{m.title}</p>
                  <p className="text-[11px] text-muted-foreground">{m.year || 2026}</p>
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Trailer Overlay Modal */}
      {showTrailer && series.youtube_trailer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setShowTrailer(false)}>
          <div className="relative w-full max-w-4xl aspect-video rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl scale-in-center" onClick={(e) => e.stopPropagation()}>
            <iframe
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${series.youtube_trailer}?autoplay=1`}
              title={`${series.title} Trailer`}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
            <button
              onClick={() => setShowTrailer(false)}
              className="absolute top-4 right-4 rounded-full bg-black/70 p-2 text-white hover:bg-black/90 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
