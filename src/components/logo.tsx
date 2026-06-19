import { Tv } from "lucide-react";

export function Logo({ size = 32, textClassName = "" }: { size?: number; textClassName?: string }) {
  return (
    <div className="inline-flex items-center gap-2">
      <span
        className="relative grid place-items-center rounded-xl bg-gold-gradient text-black shadow-glow shrink-0"
        style={{ height: size, width: size }}
      >
        <Tv className="h-1/2 w-1/2" strokeWidth={2.5} />
      </span>
      <span className={`font-extrabold tracking-tight whitespace-nowrap ${textClassName}`}>
        EN TEC <span className="text-primary">Player</span>
      </span>
    </div>
  );
}
