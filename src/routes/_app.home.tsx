import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Bell, Play, Plus, Info, Star, Menu } from "lucide-react";
import { channels as seedChannels, movies as seedMovies, featuredHero } from "@/lib/mock-data";
import { LiveBadge, QualityBadge } from "@/components/badges";
import { Logo } from "@/components/logo";
import { useAppStore } from "@/store/app-store";

export const Route = createFileRoute("/_app/home")({
  component: HomePage,
});

function HomePage() {
  const [heroIdx, setHeroIdx] = useState(0);
  const channelsFromStore = useAppStore((s) => s.channels);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);

  // Split channels into Live and Movies
  const liveChannels = channelsFromStore.filter((c) => c.isLive);
  const moviesFromStore = channelsFromStore.filter((c) => !c.isLive && c.category === "Movies");

  // Fallback to seeds if empty
  const activeChannels = liveChannels.length > 0 ? liveChannels : seedChannels;
  const activeMovies = moviesFromStore.length > 0 ? moviesFromStore : seedMovies;

  useEffect(() => {
    const t = setInterval(() => setHeroIdx((i) => (i + 1) % featuredHero.length), 6000);
    return () => clearInterval(t);
  }, []);
  const hero = featuredHero[heroIdx];

  return (
    <div>
      {/* Header */}
      <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-4 pt-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-full bg-background/40 backdrop-blur-md text-foreground lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Logo size={32} />
        </div>
        <div className="flex items-center gap-2">
          <button className="grid h-10 w-10 place-items-center rounded-full bg-background/40 backdrop-blur-md text-foreground"><Search className="h-5 w-5" /></button>
          <button className="grid h-10 w-10 place-items-center rounded-full bg-background/40 backdrop-blur-md text-foreground"><Bell className="h-5 w-5" /></button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative h-[70vh] min-h-[480px] w-full overflow-hidden">
        {featuredHero.map((h, i) => (
          <div
            key={h.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${i === heroIdx ? "opacity-100" : "opacity-0"}`}
          >
            <img src={h.backdrop} alt={h.title} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-hero-gradient" />
          </div>
        ))}
        <div className="absolute inset-x-0 bottom-0 z-10 p-5 pb-8">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
            <span>{hero.subtitle}</span>
          </div>
          <h1 className="mt-2 text-4xl font-black leading-tight">{hero.title}</h1>
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-primary text-primary" /> {hero.rating}</span>
            <span>{hero.year}</span>
            <span>{hero.duration}</span>
            <span>{hero.genres.join(" · ")}</span>
          </div>
          <p className="mt-3 line-clamp-2 max-w-xl text-sm text-foreground/80">{hero.description}</p>
          <div className="mt-5 flex items-center gap-3">
            <Link to="/player/$id" params={{ id: hero.id }} className="inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-2.5 text-sm font-bold text-background active:scale-95">
              <Play className="h-4 w-4 fill-current" /> Play
            </Link>
            <button className="inline-flex items-center gap-2 rounded-xl bg-background/60 backdrop-blur-md px-5 py-2.5 text-sm font-bold border border-border">
              <Plus className="h-4 w-4" /> My List
            </button>
            <button className="grid h-10 w-10 place-items-center rounded-full bg-background/60 backdrop-blur-md border border-border">
              <Info className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-5 flex gap-1.5">
            {featuredHero.map((_, i) => (
              <button
                key={i}
                onClick={() => setHeroIdx(i)}
                className={`h-1 rounded-full transition-all ${i === heroIdx ? "w-8 bg-primary" : "w-4 bg-foreground/30"}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Rows */}
      <div className="space-y-7 px-4 py-6">
        <Row title="Continue Watching">
          {activeMovies.slice(0, 8).map((m: any) => (
            <Link key={m.id} to="/player/$id" params={{ id: m.id }} className="group shrink-0 w-40">
              <div className="relative aspect-video overflow-hidden rounded-xl border border-border">
                <img src={m.backdrop} alt={m.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                <div className="absolute inset-x-0 bottom-0 h-1 bg-foreground/20"><div className="h-full bg-primary" style={{ width: `${20 + (parseInt(m.id.replace(/^\D+/g, '')) * 7 || 0) % 70}%` }} /></div>
              </div>
              <p className="mt-2 truncate text-sm font-medium">{m.title}</p>
            </Link>
          ))}
        </Row>

        <Row title="Popular Channels">
          {activeChannels.slice(0, 12).map((c) => (
            <Link key={c.id} to="/player/$id" params={{ id: c.id }} className="group shrink-0 w-32">
              <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-surface transition hover:border-primary hover:shadow-glow">
                <img src={c.logo} alt={c.name} loading="lazy" className="h-full w-full object-cover" />
                <div className="absolute top-2 left-2"><LiveBadge /></div>
              </div>
              <p className="mt-2 truncate text-xs font-semibold">{c.name}</p>
              <p className="truncate text-[10px] text-muted-foreground">{c.current}</p>
            </Link>
          ))}
        </Row>

        <Row title="Recently Added">
          {activeMovies.slice(0, 10).map((m: any) => (
            <Link key={m.id} to={m.isLive === false ? "/player/$id" : "/movies"} params={m.isLive === false ? { id: m.id } : undefined} className="group shrink-0 w-32">
              <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-border">
                <img src={m.poster} alt={m.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                <div className="absolute top-2 right-2"><QualityBadge quality={m.quality} /></div>
                <div className="absolute bottom-1 left-1 inline-flex items-center gap-1 rounded bg-background/70 backdrop-blur px-1.5 py-0.5 text-[10px] font-bold">
                  <Star className="h-2.5 w-2.5 fill-primary text-primary" /> {m.rating || "7.5"}
                </div>
              </div>
              <p className="mt-2 truncate text-xs font-medium">{m.title}</p>
            </Link>
          ))}
        </Row>
      </div>
    </div>
  );
}

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">{title}</h2>
        <button className="text-xs font-semibold text-muted-foreground hover:text-primary">See all →</button>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4">{children}</div>
    </section>
  );
}
