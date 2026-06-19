import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, Star, Clock, Play, Heart, Drama, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { movies } from "@/lib/mock-data";
import { DetailSkeleton } from "@/components/detail-skeleton";
import { useAppStore } from "@/store/app-store";
import { fetchXtreamVodInfo } from "@/lib/api/m3u.functions";
import { QualityBadge } from "@/components/badges";

export const Route = createFileRoute("/_app/movie/$id")({
  component: MovieDetailPage,
  pendingComponent: DetailSkeleton,
  pendingMs: 0,
  loader: async ({ params }) => {
    let movie = movies.find((m) => m.id === params.id);
    let similarMovies: any[] = [];

    if (!movie) {
      const channel = useAppStore.getState().channels.find((c) => c.id === params.id);
      if (channel) {
        movie = {
          id: channel.id,
          title: channel.name,
          poster: channel.logo,
          backdrop: channel.logo,
          rating: 7.5,
          year: 2026,
          duration: "VOD",
          quality: channel.quality,
          genres: [channel.category],
          description: `VOD Stream: ${channel.name} from category ${channel.category}.`,
          cast: [],
          director: "",
          youtube_trailer: ""
        };

        // Fetch real movie details if active playlist is Xtream Codes
        const playlistId = useAppStore.getState().activePlaylistId;
        const playlist = useAppStore.getState().playlists.find((p) => p.id === playlistId);
        if (playlist && playlist.url.startsWith("xtream://") && channel.id.startsWith("xt_vod_")) {
          try {
            const config = JSON.parse(atob(playlist.url.replace("xtream://", "")));
            const vodId = channel.id.replace("xt_vod_", "");
            const res = await fetchXtreamVodInfo(config.host, config.username, config.password, vodId);
            if (res.success && res.info) {
              const info = res.info.info || {};
              const movieData = res.info.movie_data || {};

              const castArray = info.cast
                ? info.cast.split(",").map((c: string) => {
                    const name = c.trim();
                    return {
                      name,
                      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1A1A1A&color=fff&bold=true`
                    };
                  })
                : [];

              const audioCodec = info.audio || info.audio_codec || info.video_properties?.audio_codec || "";

              movie = {
                id: channel.id,
                title: movieData.name || movieData.title || info.name || channel.name,
                poster: info.movie_image || channel.logo,
                backdrop: info.backdrop_path?.[0] || info.movie_image || channel.logo,
                rating: info.rating ? parseFloat(info.rating) : 7.5,
                year: info.releasedate ? new Date(info.releasedate).getFullYear() : (info.year ? parseInt(info.year) : 2026),
                duration: info.duration || (info.duration_secs ? `${Math.round(info.duration_secs / 60)}m` : "VOD"),
                quality: channel.quality,
                genres: info.genre ? info.genre.split(",").map((g: string) => g.trim()) : [channel.category],
                description: info.plot || info.description || `VOD Stream: ${channel.name} from category ${channel.category}.`,
                cast: castArray,
                director: info.director || "",
                youtube_trailer: info.youtube_trailer || "",
                audio_codec: audioCodec
              };
            }
          } catch (e) {
            console.error("Failed to load real movie details in loader:", e);
          }
        }
      }
    }

    // Load similar movies from the same category
    const allChannels = useAppStore.getState().channels;
    if (movie) {
      similarMovies = allChannels
        .filter((c) => c.id !== params.id && c.category === movie.genres[0])
        .slice(0, 5)
        .map((c) => ({
          id: c.id,
          title: c.name,
          poster: c.logo,
          quality: c.quality,
          rating: 7.5,
          year: 2026
        }));

      if (similarMovies.length === 0) {
        similarMovies = movies
          .filter((m) => m.id !== movie.id && m.genres.some((g) => movie.genres.includes(g)))
          .slice(0, 5);
      }
    }

    if (!movie) throw notFound();
    return { movie, similarMovies };
  },
  notFoundComponent: () => <div className="p-10 text-center">Movie not found</div>,
  errorComponent: ({ error }) => {
    if (typeof window !== "undefined") toast.error("Failed to load movie", { description: error.message });
    return <div className="p-10 text-center text-destructive">{error.message}</div>;
  },
});

function MovieDetailPage() {
  const { movie, similarMovies } = Route.useLoaderData();
  const [showTrailer, setShowTrailer] = useState(false);

  return (
    <div className="relative min-h-screen">
      {/* Backdrop */}
      <div className="absolute inset-x-0 top-0 h-[70vh] -z-10">
        <img src={movie.backdrop} alt="" className="h-full w-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>

      <header className="flex items-center gap-3 px-5 pt-5">
        <Link to="/movies" className="grid h-9 w-9 place-items-center rounded-full bg-surface/70 backdrop-blur"><ChevronLeft className="h-5 w-5" /></Link>
        <h1 className="text-lg font-semibold text-muted-foreground">Movie Details</h1>
      </header>

      <div className="px-5 pt-6 lg:flex lg:gap-8">
        {/* Poster */}
        <div className="mx-auto w-52 shrink-0 overflow-hidden rounded-2xl border border-border shadow-2xl lg:mx-0 lg:w-64">
          <img src={movie.poster} alt={movie.title} className="aspect-[2/3] w-full object-cover" />
        </div>

        {/* Info */}
        <div className="mt-6 flex-1 lg:mt-0">
          <h2 className="text-3xl font-black leading-tight lg:text-4xl">{movie.title} ({movie.year})</h2>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span>{movie.year}</span>
            <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" /> {movie.duration}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-xs font-bold text-foreground">
              <Star className="h-3 w-3 fill-primary text-primary" /> {movie.rating}
            </span>
          </div>

          {movie.director && (
            <p className="mt-3 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Director: </span>
              {movie.director}
            </p>
          )}

          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-foreground/85">{movie.description}</p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-surface/70 px-3 py-1.5 text-xs font-semibold backdrop-blur">
            <Drama className="h-4 w-4 text-primary" />
            {movie.genres.join(", ")}
          </div>

          {/* CTAs */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-4 max-w-2xl">
            <Link 
              to="/player/$id" 
              params={{ id: movie.id }} 
              search={movie.audio_codec ? { audioCodec: movie.audio_codec } : undefined}
              className="inline-flex items-center justify-between gap-3 rounded-2xl bg-surface/80 px-5 py-3.5 text-sm font-bold backdrop-blur transition hover:bg-surface"
            >
              Watch Now <Play className="h-5 w-5 fill-current" />
            </Link>
            <a
              href={`/player/${movie.id}${movie.audio_codec ? `?audioCodec=${encodeURIComponent(movie.audio_codec)}` : ""}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-between gap-3 rounded-2xl bg-primary/20 border border-primary/40 px-5 py-3.5 text-sm font-bold backdrop-blur transition hover:bg-primary/30"
            >
              New Tab <ExternalLink className="h-5 w-5" />
            </a>
            
            {movie.youtube_trailer ? (
              <button
                onClick={() => setShowTrailer(true)}
                className="inline-flex items-center justify-between gap-3 rounded-2xl bg-surface/80 px-5 py-3.5 text-sm font-bold backdrop-blur transition hover:bg-surface cursor-pointer"
              >
                Trailer <Play className="h-5 w-5 text-primary fill-primary" />
              </button>
            ) : (
              <button
                disabled
                className="inline-flex items-center justify-between gap-3 rounded-2xl bg-surface/30 px-5 py-3.5 text-sm font-bold backdrop-blur opacity-50 cursor-not-allowed"
              >
                No Trailer <Play className="h-5 w-5" />
              </button>
            )}
            
            <button onClick={() => toast.success("Added to favorites!")} className="inline-flex items-center justify-between gap-3 rounded-2xl bg-surface/80 px-5 py-3.5 text-sm font-bold backdrop-blur transition hover:bg-surface">
              Favorite <Heart className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Cast */}
      {movie.cast && movie.cast.length > 0 && (
        <section className="mt-10 px-5">
          <h3 className="mb-4 text-lg font-bold">Cast:</h3>
          <div className="flex gap-5 overflow-x-auto scrollbar-hide -mx-5 px-5">
            {movie.cast.map((c: { name: string; avatar: string }, i: number) => (
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

      {/* Similar Suggestions */}
      {similarMovies && similarMovies.length > 0 && (
        <section className="mt-10 px-5 pb-16">
          <h3 className="mb-4 text-lg font-bold">Similar Content:</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {similarMovies.map((m: any) => (
              <div key={m.id} className="group relative">
                <Link to="/movie/$id" params={{ id: m.id }} className="block">
                  <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-border bg-surface">
                    <img
                      src={m.poster}
                      alt={m.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(m.title)}&background=8B5CF6&color=fff&bold=true&size=128&format=svg`;
                      }}
                    />
                    <div className="absolute top-2 right-2"><QualityBadge quality={m.quality || "HD"} /></div>
                    <div className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded bg-background/70 backdrop-blur px-1.5 py-0.5 text-[10px] font-bold">
                      <Star className="h-2.5 w-2.5 fill-primary text-primary" /> {m.rating || "7.5"}
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
      {showTrailer && movie.youtube_trailer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setShowTrailer(false)}>
          <div className="relative w-full max-w-4xl aspect-video rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl scale-in-center" onClick={(e) => e.stopPropagation()}>
            <iframe
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${movie.youtube_trailer}?autoplay=1`}
              title={`${movie.title} Trailer`}
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
