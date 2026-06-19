export function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--live)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
      <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse-live" />
      Live
    </span>
  );
}

export function QualityBadge({ quality }: { quality: "4K" | "FHD" | "HD" | "1080p" | "720p" }) {
  const color =
    quality === "4K"
      ? "bg-gold-gradient text-black"
      : quality === "FHD" || quality === "1080p"
        ? "bg-accent text-accent-foreground"
        : "bg-muted text-foreground";
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${color}`}>
      {quality}
    </span>
  );
}
