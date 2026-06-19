import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Tv, Film, Folder, History, Settings } from "lucide-react";

const tabs = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/live", label: "Live TV", icon: Tv },
  { to: "/movies", label: "Movies", icon: Film },
  { to: "/series", label: "Series", icon: Folder },
  { to: "/catchup", label: "Catch-Up", icon: History },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] lg:hidden">
      <ul className="mx-auto flex max-w-3xl items-stretch justify-around px-2">
        {tabs.slice(0, 5).map((t) => {
          const active = path.startsWith(t.to);
          const Icon = t.icon;
          return (
            <li key={t.to} className="flex-1">
              <Link
                to={t.to}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className={`grid h-9 w-9 place-items-center rounded-xl transition-all ${active ? "bg-primary/15 shadow-glow" : ""}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span>{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
