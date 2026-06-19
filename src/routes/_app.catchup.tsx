import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Clock, Menu } from "lucide-react";
import { channels } from "@/lib/mock-data";
import { useAppStore } from "@/store/app-store";

export const Route = createFileRoute("/_app/catchup")({
  component: CatchUpPage,
});

const days = [
  { day: "13", label: "SAT" },
  { day: "14", label: "SUN" },
  { day: "15", label: "MON", active: true },
  { day: "16", label: "TUE" },
  { day: "17", label: "WED" },
  { day: "18", label: "THU" },
  { day: "19", label: "FRI" },
];

const programs = [
  { time: "12:00 AM", end: "12:12 AM", title: "The Guava Juice Show", duration: "12m" },
  { time: "12:12 AM", end: "12:30 AM", title: "The Guava Juice Show", duration: "18m" },
  { time: "12:30 AM", end: "01:00 AM", title: "Star Trek: Prodigy", duration: "30m" },
  { time: "01:00 AM", end: "01:30 AM", title: "Shasha & Milo", duration: "30m" },
  { time: "01:30 AM", end: "02:00 AM", title: "Skylanders Academy", duration: "30m", live: true },
  { time: "02:00 AM", end: "02:13 AM", title: "Barn Kidz", duration: "13m" },
];

function CatchUpPage() {
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  return (
    <div className="px-4 pt-5">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/home" className="grid h-9 w-9 place-items-center rounded-full bg-surface"><ChevronLeft className="h-5 w-5" /></Link>
          <h1 className="text-2xl font-black">Catch-Up</h1>
        </div>
        <button
          onClick={() => setSidebarOpen(true)}
          className="grid h-9 w-9 place-items-center rounded-full bg-surface lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      <div className="mb-5 flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
        {days.map((d) => (
          <button key={d.day} className={`shrink-0 rounded-2xl border px-4 py-3 text-center transition ${
            d.active ? "border-primary bg-primary/15 text-primary shadow-glow" : "border-border bg-surface text-muted-foreground"
          }`}>
            <div className="text-xl font-black">{d.day}</div>
            <div className="text-[10px] font-bold tracking-wider">{d.label}</div>
          </button>
        ))}
      </div>

      <div className="mb-3 flex items-center gap-2 text-sm font-bold">
        <span className="text-primary">●</span> AR: MBC 3 4K — Skylanders Academy
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {programs.map((p, i) => (
          <Link
            to="/player/$id"
            params={{ id: channels[i % channels.length].id }}
            key={i}
            className="group flex items-start justify-between gap-3 rounded-2xl border border-border bg-surface p-4 transition hover:border-primary"
          >
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-bold">{p.title}</h3>
              <div className="mt-1 flex items-center gap-2 text-xs">
                <span className="text-emerald-400 font-semibold">{p.time}</span>
                <span className="text-muted-foreground">—</span>
                <span className="text-rose-400 font-semibold">{p.end}</span>
              </div>
              <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" /> {p.duration}
                {p.live && <span className="ml-2 rounded bg-[var(--live)] px-1.5 py-0.5 text-[9px] font-bold text-white">LIVE</span>}
              </div>
            </div>
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-surface-2 text-xl">📺</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
