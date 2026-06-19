import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Tv, Film, Folder, Settings, Search, RefreshCw, User, LogOut, PlayCircle, ListMusic, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { useAppStore } from "@/store/app-store";

const top = [
  { to: "/home" as const, icon: Home, label: "Home" },
  { to: "/live" as const, icon: Tv, label: "Live TV" },
  { to: "/catchup" as const, icon: PlayCircle, label: "Catch-Up" },
  { to: "/movies" as const, icon: Film, label: "Movies" },
  { to: "/series" as const, icon: Folder, label: "Series" },
  { to: "/playlists" as const, icon: ListMusic, label: "Playlists" },
];

export function SideNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 lg:w-[68px] lg:hover:w-[240px] group flex-col justify-between border-r border-border bg-background/95 py-4 px-3 backdrop-blur-xl transition-all duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:hover:shadow-[5px_0_30px_rgba(0,0,0,0.4)] overflow-hidden`}
      >
        <div className="flex flex-col gap-6">
          {/* Header (Logo + Close Button on Mobile) */}
          <div className="flex w-full items-center justify-between pl-1 gap-2">
            <Logo
              size={36}
              textClassName="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300"
            />
            <button
              onClick={() => setSidebarOpen(false)}
              className="grid h-10 w-10 place-items-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick Search */}
          <button className="flex items-center gap-4 w-full h-11 px-3 rounded-xl border border-transparent text-muted-foreground hover:text-foreground hover:bg-surface transition-all duration-200">
            <Search className="h-5 w-5 shrink-0" />
            <span className="text-sm font-semibold opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden">
              Search
            </span>
          </button>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-2">
            {top.map((t) => {
              const active = path.startsWith(t.to);
              const Icon = t.icon;
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-4 w-full h-11 px-3 rounded-xl border transition-all duration-200 ${
                    active
                      ? "border-primary bg-primary/10 text-primary shadow-glow"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-surface"
                  }`}
                  title={t.label}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-semibold opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden">
                    {t.label}
                  </span>
                </Link>
              );
            })}
            <button className="flex items-center gap-4 w-full h-11 px-3 rounded-xl border border-transparent text-muted-foreground hover:text-foreground hover:bg-surface transition-all duration-200">
              <RefreshCw className="h-5 w-5 shrink-0" />
              <span className="text-sm font-semibold opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden">
                Refresh Streams
              </span>
            </button>
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col gap-2">
          <Link
            to="/settings"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-4 w-full h-11 px-3 rounded-xl border border-transparent text-muted-foreground hover:text-foreground hover:bg-surface transition-all duration-200"
            title="Account"
          >
            <User className="h-5 w-5 shrink-0" />
            <span className="text-sm font-semibold opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden">
              Account
            </span>
          </Link>
          <Link
            to="/settings"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-4 w-full h-11 px-3 rounded-xl border border-transparent text-muted-foreground hover:text-foreground hover:bg-surface transition-all duration-200"
            title="Settings"
          >
            <Settings className="h-5 w-5 shrink-0" />
            <span className="text-sm font-semibold opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden">
              Settings
            </span>
          </Link>
          <Link
            to="/login"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-4 w-full h-11 px-3 rounded-xl border border-transparent text-muted-foreground hover:text-foreground hover:bg-surface transition-all duration-200"
            title="Log out"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className="text-sm font-semibold opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden">
              Log out
            </span>
          </Link>
        </div>
      </aside>
    </>
  );
}
