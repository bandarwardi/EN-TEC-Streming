import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { Mail, Lock, Link2, ArrowRight } from "lucide-react";
import { useAppStore } from "@/store/app-store";

export const Route = createFileRoute("/login")({
  component: Login,
});

import { toast } from "sonner";
import { fetchPlaylist } from "@/lib/api/m3u.functions";

function Login() {
  const navigate = useNavigate();
  const login = useAppStore((s) => s.login);
  const addPlaylist = useAppStore((s) => s.addPlaylist);
  const [tab, setTab] = useState<"login" | "playlist">("login");
  const [email, setEmail] = useState("");
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [playlistName, setPlaylistName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = (name: string) => {
    login(name);
    navigate({ to: "/home" });
  };

  const handleLoadPlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playlistUrl) return;

    setLoading(true);
    const promise = fetchPlaylist(playlistUrl);

    toast.promise(promise, {
      loading: "Fetching and parsing playlist...",
      success: (res) => {
        setLoading(false);
        if (res.success) {
          const finalName = playlistName.trim() || `Playlist ${new Date().toLocaleDateString()}`;
          const playlistId = `p_${Date.now()}`;
          addPlaylist({
            id: playlistId,
            name: finalName,
            url: playlistUrl,
            channels: res.channels.length,
            updated: "Just now",
          }, res.channels, null);
          
          handleLogin("Guest");
          return `Loaded ${res.channels.length} channels successfully!`;
        } else {
          throw new Error(res.error || "Failed to load playlist");
        }
      },
      error: (err) => {
        setLoading(false);
        return err.message || "Failed to parse M3U. Check connection or URL.";
      }
    });
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0" style={{
        background: "radial-gradient(circle at 20% 0%, oklch(0.78 0.16 70 / 0.18), transparent 50%), radial-gradient(circle at 80% 100%, oklch(0.6 0.22 264 / 0.15), transparent 50%)",
      }} />
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-6 py-10">
        <div className="flex justify-center pt-8">
          <Logo size={48} />
        </div>

        <div className="mt-12 glass-card rounded-3xl p-6 shadow-card">
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to start streaming in 4K.</p>

          <div className="mt-6 flex rounded-xl bg-surface p-1">
            {(["login", "playlist"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                  tab === t ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground"
                }`}
              >
                {t === "login" ? "Sign In" : "M3U Playlist"}
              </button>
            ))}
          </div>

          {tab === "login" ? (
            <form onSubmit={(e) => { e.preventDefault(); handleLogin(email.split("@")[0] || "user"); }} className="mt-6 space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full rounded-xl border border-border bg-input py-3 pl-10 pr-4 text-sm outline-none focus:border-primary"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  required
                  placeholder="Password"
                  className="w-full rounded-xl border border-border bg-input py-3 pl-10 pr-4 text-sm outline-none focus:border-primary"
                />
              </div>
              <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold-gradient py-3 text-sm font-bold text-black shadow-glow transition active:scale-95">
                Sign In <ArrowRight className="h-4 w-4" />
              </button>
              <div className="relative my-2 text-center">
                <span className="relative z-10 bg-card px-3 text-xs text-muted-foreground">OR</span>
                <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
              </div>
              <button type="button" className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface py-3 text-sm font-medium hover:bg-surface-2">
                <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#fff" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/></svg>
                Continue with Google
              </button>
            </form>
          ) : (
            <form onSubmit={handleLoadPlaylist} className="mt-6 space-y-4">
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={playlistUrl}
                  onChange={(e) => setPlaylistUrl(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="https://example.com/playlist.m3u"
                  className="w-full rounded-xl border border-border bg-input py-3 pl-10 pr-4 text-sm outline-none focus:border-primary disabled:opacity-50"
                />
              </div>
              <input
                value={playlistName}
                onChange={(e) => setPlaylistName(e.target.value)}
                disabled={loading}
                placeholder="Playlist name (optional)"
                className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:border-primary disabled:opacity-50"
              />
              <button type="submit" disabled={loading} className="w-full rounded-xl bg-gold-gradient py-3 text-sm font-bold text-black shadow-glow active:scale-95 disabled:opacity-50">
                {loading ? "Loading..." : "Load Playlist"}
              </button>
            </form>
          )}
        </div>

        <button onClick={() => handleLogin("guest")} className="mt-6 text-center text-sm text-muted-foreground hover:text-foreground">
          Continue as Guest →
        </button>

        <p className="mt-auto pt-8 text-center text-xs text-muted-foreground">
          By signing in you agree to our <Link to="/" className="underline">Terms</Link>
        </p>
      </div>
    </div>
  );
}
