import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import { Search, Star, ChevronLeft, Film, Menu, ExternalLink } from "lucide-react";
import { movies as seedMovies } from "@/lib/mock-data";
import { QualityBadge } from "@/components/badges";
import { useAppStore } from "@/store/app-store";
import { Skeleton } from "@/components/skeleton";

const FILTERS = ["All", "Action", "Drama", "Comedy", "Sci-Fi", "Thriller", "Adventure"];

export const Route = createFileRoute("/_app/movies/")({
  component: MoviesPage,
});

function MoviesPage() {
  const activePlaylistId = useAppStore((s) => s.activePlaylistId);
  const activeCategories = useAppStore((s) => s.activeCategories);
  const channels = useAppStore((s) => s.channels);
  const loadingChannels = useAppStore((s) => s.loadingChannels);
  const loadChannelsForCategory = useAppStore((s) => s.loadChannelsForCategory);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);

  const [selectedCatId, setSelectedCatId] = useState<string>("");
  const [selectedCatName, setSelectedCatName] = useState<string>("");
  const [catSearch, setCatSearch] = useState("");
  const [movieSearch, setMovieSearch] = useState("");

  // Infinite Scroll State
  const [visibleCount, setVisibleCount] = useState(60);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [genreFilter, setGenreFilter] = useState("All");

  const categories = useMemo(() => {
    return activeCategories?.vod || [];
  }, [activeCategories]);

  const isDemo = activePlaylistId === "p1" || activePlaylistId === "p2" || activePlaylistId === "p3";
  const hasVodCategories = categories.length > 0;

  // Filter categories by search
  const filteredCategories = useMemo(() => {
    return categories.filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase()));
  }, [categories, catSearch]);

  // Select first category if categories exist and selected category is not in the list
  useEffect(() => {
    if (hasVodCategories && !isDemo) {
      const exists = categories.some(c => c.id === selectedCatId);
      if (!exists) {
        setSelectedCatId(categories[0].id);
        setSelectedCatName(categories[0].name);
      }
    } else {
      setSelectedCatId("");
      setSelectedCatName("");
    }
  }, [categories, selectedCatId, isDemo, hasVodCategories]);

  // Load channels on category change
  useEffect(() => {
    if (activePlaylistId && selectedCatId && !isDemo) {
      loadChannelsForCategory(activePlaylistId, "vod", selectedCatId, selectedCatName);
    }
  }, [activePlaylistId, selectedCatId, selectedCatName, loadChannelsForCategory, isDemo]);

  // Define movies to show
  const moviesToShow = useMemo(() => {
    if (isDemo || !hasVodCategories) {
      return seedMovies.filter(m => 
        (genreFilter === "All" || (m.genres && m.genres.includes(genreFilter))) &&
        (movieSearch === "" || m.title.toLowerCase().includes(movieSearch.toLowerCase()))
      );
    } else {
      if (!channels) return [];
      return channels.filter(m => 
        movieSearch === "" || (m.name || "").toLowerCase().includes(movieSearch.toLowerCase())
      );
    }
  }, [isDemo, hasVodCategories, channels, seedMovies, genreFilter, movieSearch]);

  const slicedMovies = useMemo(() => {
    return moviesToShow.slice(0, visibleCount);
  }, [moviesToShow, visibleCount]);

  // Reset visible count on category or search or filter change
  useEffect(() => {
    setVisibleCount(60);
  }, [selectedCatId, movieSearch, genreFilter]);

  // Infinite Scroll Observer
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + 60);
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [moviesToShow.length, visibleCount]);

  return (
    <div className="px-4 pt-5 pb-20">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/home" className="grid h-9 w-9 place-items-center rounded-full bg-surface">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black">Movies</h1>
            {!isDemo && selectedCatName && (
              <p className="text-xs text-muted-foreground mt-0.5">{selectedCatName}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => setSidebarOpen(true)}
          className="grid h-9 w-9 place-items-center rounded-full bg-surface lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Search Input */}
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={movieSearch}
          onChange={(e) => setMovieSearch(e.target.value)}
          placeholder={isDemo || !hasVodCategories ? "Search movies…" : `Search movies in ${selectedCatName || 'category'}…`}
          className="w-full rounded-2xl border border-border bg-surface py-3 pl-11 pr-4 text-sm outline-none focus:border-primary"
        />
      </div>

      {isDemo || !hasVodCategories ? (
        /* Demo View - Horizontal Filter & Movies Grid */
        <>
          <div className="mb-5 flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setGenreFilter(f)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                  genreFilter === f ? "bg-primary text-primary-foreground shadow-glow" : "bg-surface text-muted-foreground border border-border"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {slicedMovies.map((m: any) => (
              <div key={m.id} className="group relative">
                <Link to="/movie/$id" params={{ id: m.id }} className="block">
                  <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-border">
                    <img src={m.poster} alt={m.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                    <div className="absolute top-2 right-2"><QualityBadge quality={m.quality} /></div>
                    <div className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded bg-background/70 backdrop-blur px-1.5 py-0.5 text-[10px] font-bold">
                      <Star className="h-2.5 w-2.5 fill-primary text-primary" /> {m.rating || "7.5"}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent opacity-0 group-hover:opacity-100 transition" />
                  </div>
                  <p className="mt-2 truncate text-sm font-semibold">{m.title}</p>
                  <p className="text-[11px] text-muted-foreground">{m.year || 2026} {m.duration ? `· ${m.duration}` : ""}</p>
                </Link>
                {/* Open player in new tab */}
                <a
                  href={`/player/${m.id}`}
                  target="_blank"
                  rel="noreferrer"
                  title="Open player in new tab (bypass block)"
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity grid h-7 w-7 place-items-center rounded-full bg-black/70 backdrop-blur border border-white/20 hover:bg-primary hover:border-primary"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            ))}
            {moviesToShow.length > visibleCount && (
              <div
                ref={sentinelRef}
                className="col-span-full py-6 flex items-center justify-center text-xs text-muted-foreground"
              >
                Loading more...
              </div>
            )}
          </div>
        </>
      ) : (
        /* Real Playlist View - Category Sidebar & On-Demand Channel Grid */
        <div className="flex flex-col md:flex-row gap-6">
          {/* Categories Sidebar */}
          <div className="w-full md:w-64 shrink-0 flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={catSearch}
                onChange={(e) => setCatSearch(e.target.value)}
                placeholder="Search categories…"
                className="w-full rounded-xl border border-border bg-surface py-2 pl-9 pr-3 text-xs outline-none focus:border-primary"
              />
            </div>
            
            <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto scrollbar-hide pb-2 md:pb-0 max-h-[150px] md:max-h-[70vh] -mx-4 px-4 md:mx-0 md:px-0">
              {filteredCategories.map((c) => {
                const isActive = selectedCatId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedCatId(c.id);
                      setSelectedCatName(c.name);
                    }}
                    className={`shrink-0 text-left rounded-xl px-4 py-2.5 text-xs font-bold transition border ${
                      isActive
                        ? "bg-primary text-primary-foreground border-primary shadow-glow"
                        : "bg-surface text-muted-foreground border-border hover:bg-muted/30"
                    }`}
                  >
                    {c.name}
                  </button>
                );
              })}
              {filteredCategories.length === 0 && (
                <p className="text-xs text-muted-foreground py-2 px-1">No categories match search.</p>
              )}
            </div>
          </div>

          {/* Movies Content */}
          <div className="flex-1 flex flex-col gap-4">
            {loadingChannels ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="aspect-[2/3] w-full rounded-xl" />
                    <Skeleton className="h-4 w-3/4 rounded" />
                    <Skeleton className="h-3 w-1/2 rounded" />
                  </div>
                ))}
              </div>
            ) : moviesToShow.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-surface mb-3">
                  <Film className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-bold">No movies found</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Try another search query or check back later.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {slicedMovies.map((m: any) => (
                  <div key={m.id} className="group relative">
                    <Link to="/movie/$id" params={{ id: m.id }} className="block">
                      <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-border bg-surface">
                        <img
                          src={m.logo}
                          alt={m.name}
                          loading="lazy"
                          className="h-full w-full object-cover transition group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=8B5CF6&color=fff&bold=true&size=128&format=svg`;
                          }}
                        />
                        <div className="absolute top-2 right-2"><QualityBadge quality={m.quality} /></div>
                        <div className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded bg-background/70 backdrop-blur px-1.5 py-0.5 text-[10px] font-bold">
                          <Star className="h-2.5 w-2.5 fill-primary text-primary" /> 7.5
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent opacity-0 group-hover:opacity-100 transition" />
                      </div>
                      <p className="mt-2 truncate text-sm font-semibold">{m.name}</p>
                      <p className="text-[11px] text-muted-foreground">VOD Movie</p>
                    </Link>
                    {/* Open player in new tab */}
                    <a
                      href={`/player/${m.id}`}
                      target="_blank"
                      rel="noreferrer"
                      title="Open player in new tab (bypass block)"
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity grid h-7 w-7 place-items-center rounded-full bg-black/70 backdrop-blur border border-white/20 hover:bg-primary hover:border-primary"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ))}
                {moviesToShow.length > visibleCount && (
                  <div
                    ref={sentinelRef}
                    className="col-span-full py-6 flex items-center justify-center text-xs text-muted-foreground"
                  >
                    Loading more...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

