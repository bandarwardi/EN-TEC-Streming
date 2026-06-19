import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import { Search, ChevronLeft, Tv, Menu, ExternalLink } from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { LiveBadge, QualityBadge } from "@/components/badges";
import { Skeleton } from "@/components/skeleton";

export const Route = createFileRoute("/_app/live")({
  component: LivePage,
});

function LivePage() {
  const activePlaylistId = useAppStore((s) => s.activePlaylistId);
  const activeCategories = useAppStore((s) => s.activeCategories);
  const channels = useAppStore((s) => s.channels);
  const loadingChannels = useAppStore((s) => s.loadingChannels);
  const loadChannelsForCategory = useAppStore((s) => s.loadChannelsForCategory);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);

  const [selectedCatId, setSelectedCatId] = useState<string>("");
  const [selectedCatName, setSelectedCatName] = useState<string>("");
  const [catSearch, setCatSearch] = useState("");
  const [channelSearch, setChannelSearch] = useState("");

  // Infinite Scroll State
  const [visibleCount, setVisibleCount] = useState(60);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const categories = useMemo(() => {
    return activeCategories?.live || [];
  }, [activeCategories]);

  // Filter categories by search
  const filteredCategories = useMemo(() => {
    return categories.filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase()));
  }, [categories, catSearch]);

  // Automatically select first category if none selected or if activeCategories changes
  useEffect(() => {
    if (categories.length > 0) {
      const exists = categories.some(c => c.id === selectedCatId);
      if (!exists) {
        setSelectedCatId(categories[0].id);
        setSelectedCatName(categories[0].name);
      }
    } else {
      setSelectedCatId("");
      setSelectedCatName("");
    }
  }, [categories, selectedCatId]);

  // Load channels on category change
  useEffect(() => {
    if (activePlaylistId && selectedCatId) {
      loadChannelsForCategory(activePlaylistId, "live", selectedCatId, selectedCatName);
    }
  }, [activePlaylistId, selectedCatId, selectedCatName, loadChannelsForCategory]);

  const filteredChannels = useMemo(() => {
    if (!channels) return [];
    return channels.filter(c => 
      c.name.toLowerCase().includes(channelSearch.toLowerCase())
    );
  }, [channels, channelSearch]);

  const slicedChannels = useMemo(() => {
    return filteredChannels.slice(0, visibleCount);
  }, [filteredChannels, visibleCount]);

  // Reset visible count on category or search change
  useEffect(() => {
    setVisibleCount(60);
  }, [selectedCatId, channelSearch]);

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
  }, [filteredChannels.length, visibleCount]);

  return (
    <div className="px-4 pt-5 pb-20">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/home" className="grid h-9 w-9 place-items-center rounded-full bg-surface">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black">Live TV</h1>
            {selectedCatName && (
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

      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-surface mb-4">
            <Tv className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-bold">No channels loaded</h3>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            Please add or select a playlist from the settings to view live TV.
          </p>
          <Link to="/playlists" className="mt-6 rounded-xl bg-gold-gradient px-6 py-2.5 text-sm font-bold text-black shadow-glow">
            Manage Playlists
          </Link>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-6">
          {/* Categories Sidebar / Topbar */}
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
            
            {/* Horizontal scroll list on mobile, vertical sidebar on desktop */}
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

          {/* Channels Section */}
          <div className="flex-1 flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={channelSearch}
                onChange={(e) => setChannelSearch(e.target.value)}
                placeholder={`Search channels in ${selectedCatName || 'category'}…`}
                className="w-full rounded-2xl border border-border bg-surface py-3 pl-11 pr-4 text-sm outline-none focus:border-primary"
              />
            </div>

            {loadingChannels ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-border bg-surface p-4 space-y-3 animate-pulse">
                    <div className="flex justify-between items-start">
                      <Skeleton className="h-12 w-12 rounded-xl" />
                      <Skeleton className="h-4 w-12 rounded" />
                    </div>
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                ))}
              </div>
            ) : filteredChannels.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-surface mb-3">
                  <Tv className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-bold">No channels found</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Try another search query or check back later.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {slicedChannels.map((ch) => (
                  <div key={ch.id} className="group relative">
                    <Link
                      to="/player/$id"
                      params={{ id: ch.id }}
                      className="block relative overflow-hidden rounded-2xl border border-border bg-surface p-4 transition hover:border-primary hover:shadow-glow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="h-12 w-12 overflow-hidden rounded-xl bg-surface-2 ring-1 ring-border">
                          <img
                            src={ch.logo}
                            alt={ch.name}
                            loading="lazy"
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(ch.name)}&background=1A1A1A&color=fff&bold=true`;
                            }}
                          />
                        </div>
                        <LiveBadge />
                      </div>
                      <h3 className="mt-3 truncate text-sm font-bold">{ch.name}</h3>
                      <p className="truncate text-[11px] text-muted-foreground">▶ {ch.current}</p>
                      <p className="truncate text-[11px] text-muted-foreground/70">→ {ch.next}</p>
                      <div className="mt-2">
                        <QualityBadge quality={ch.quality} />
                      </div>
                    </Link>
                    {/* Open in new tab button */}
                    <a
                      href={`/player/${ch.id}`}
                      target="_blank"
                      rel="noreferrer"
                      title="Open player in new tab (bypass block)"
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity grid h-7 w-7 place-items-center rounded-full bg-black/70 backdrop-blur border border-white/20 hover:bg-primary hover:border-primary"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ))}
                {filteredChannels.length > visibleCount && (
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

