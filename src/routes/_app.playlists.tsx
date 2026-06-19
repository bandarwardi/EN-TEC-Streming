import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Plus, Trash2, RefreshCw, CheckCircle2, Upload, Link as LinkIcon, ShieldAlert, Menu } from "lucide-react";
import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { fetchPlaylist, fetchXtreamCategories, parseM3U, M3UChannel } from "@/lib/api/m3u.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/playlists")({
  component: PlaylistsPage,
});

function getXtreamDisplayUrl(url: string): string {
  if (!url.startsWith("xtream://")) return url;
  try {
    const config = JSON.parse(atob(url.replace("xtream://", "")));
    return `${config.host} (User: ${config.username})`;
  } catch (e) {
    return "Xtream Playlist";
  }
}

function PlaylistsPage() {
  const playlists = useAppStore((s) => s.playlists);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [importType, setImportType] = useState<"url" | "file" | "xtream">("url");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Xtream Codes Credentials state
  const [xtreamHost, setXtreamHost] = useState("");
  const [xtreamUsername, setXtreamUsername] = useState("");
  const [xtreamPassword, setXtreamPassword] = useState("");
  
  const [loading, setLoading] = useState(false);

  const active = useAppStore((s) => s.activePlaylistId);
  const setActive = useAppStore((s) => s.setActivePlaylist);
  const addPlaylist = useAppStore((s) => s.addPlaylist);
  const deletePlaylist = useAppStore((s) => s.deletePlaylist);

  const handleAddPlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    const promise = fetchPlaylist(url);

    toast.promise(promise, {
      loading: "Adding playlist...",
      success: (res) => {
        setLoading(false);
        if (res.success) {
          const finalName = name.trim() || `Playlist ${new Date().toLocaleDateString()}`;
          const playlistId = `p_${Date.now()}`;
          addPlaylist({
            id: playlistId,
            name: finalName,
            url,
            channels: res.channels.length,
            updated: "Just now",
          }, res.channels, null);
          
          setModalOpen(false);
          setName("");
          setUrl("");
          return `Added ${res.channels.length} channels successfully!`;
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

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const channels = parseM3U(text);
        if (channels && channels.length > 0) {
          const finalName = name.trim() || selectedFile.name.replace(/\.[^/.]+$/, "") || `Playlist ${new Date().toLocaleDateString()}`;
          const playlistId = `p_${Date.now()}`;
          addPlaylist({
            id: playlistId,
            name: finalName,
            url: `local://${selectedFile.name}`,
            channels: channels.length,
            updated: "Just now",
          }, channels, null);
          
          setModalOpen(false);
          setName("");
          setSelectedFile(null);
          toast.success(`Imported ${channels.length} channels from M3U file successfully!`);
        } else {
          toast.error("No channels found in M3U file or invalid file format.");
        }
      } catch (err: any) {
        toast.error("Failed to parse M3U file: " + (err.message || err));
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => {
      toast.error("Failed to read file.");
      setLoading(false);
    };
    reader.readAsText(selectedFile);
  };

  const handleAddXtreamPlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!xtreamHost || !xtreamUsername || !xtreamPassword) return;

    setLoading(true);
    const promise = fetchXtreamCategories(xtreamHost, xtreamUsername, xtreamPassword);

    toast.promise(promise, {
      loading: "Connecting to Xtream API...",
      success: (res) => {
        setLoading(false);
        if (res.success) {
          const finalName = name.trim() || `Xtream: ${xtreamUsername}`;
          const playlistId = `p_${Date.now()}`;
          const displayUrl = `xtream://${btoa(JSON.stringify({ host: xtreamHost, username: xtreamUsername, password: xtreamPassword }))}`;
          const totalChannelsCount = res.categories.live.length + res.categories.vod.length + res.categories.series.length;
          
          addPlaylist({
            id: playlistId,
            name: finalName,
            url: displayUrl,
            channels: totalChannelsCount,
            updated: "Just now (Cached 12h)",
          }, null, res.categories);
          
          setModalOpen(false);
          setName("");
          setXtreamHost("");
          setXtreamUsername("");
          setXtreamPassword("");
          return `Loaded ${totalChannelsCount} categories from Xtream Codes!`;
        } else {
          throw new Error(res.error || "Failed to load categories from Xtream Codes");
        }
      },
      error: (err) => {
        setLoading(false);
        return err.message || "Failed to parse Xtream categories. Check connection or credentials.";
      }
    });
  };

  const handleRefresh = async (p: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (p.id === "p1" || p.id === "p2" || p.id === "p3") {
      toast.info("Demo playlists cannot be refreshed.");
      return;
    }

    if (p.url.startsWith("local://")) {
      toast.info("Local file playlists cannot be refreshed from the web. Re-upload to update.");
      return;
    }

    toast.loading("Refreshing channels...", { id: "refresh" });
    
    if (p.url.startsWith("xtream://")) {
      try {
        const config = JSON.parse(atob(p.url.replace("xtream://", "")));
        const res = await fetchXtreamCategories(config.host, config.username, config.password);
        if (res.success) {
          const totalChannelsCount = res.categories.live.length + res.categories.vod.length + res.categories.series.length;
          addPlaylist({
            ...p,
            channels: totalChannelsCount,
            updated: "Just now (Cached 12h)",
          }, null, res.categories);
          toast.success("Playlist refreshed successfully!", { id: "refresh" });
        } else {
          toast.error(res.error || "Failed to refresh playlist", { id: "refresh" });
        }
      } catch (err) {
        toast.error("Failed to decode Xtream credentials for refresh", { id: "refresh" });
        return;
      }
    } else {
      const res = await fetchPlaylist(p.url);
      if (res.success) {
        addPlaylist({
          ...p,
          channels: res.channels.length,
          updated: "Just now",
        }, res.channels, null);
        toast.success("Playlist refreshed successfully!", { id: "refresh" });
      } else {
        toast.error(res.error || "Failed to refresh playlist", { id: "refresh" });
      }
    }
  };

  return (
    <div className="px-4 pt-5">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="grid h-9 w-9 place-items-center rounded-full bg-surface"><ChevronLeft className="h-5 w-5" /></Link>
          <h1 className="text-2xl font-black">Playlists</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setModalOpen(true); setImportType("url"); }} className="inline-flex items-center gap-1.5 rounded-xl bg-gold-gradient px-3 py-2 text-xs font-bold text-black shadow-glow">
            <Plus className="h-4 w-4" /> Add
          </button>
          <button
            onClick={() => setSidebarOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-full bg-surface lg:hidden text-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="space-y-3">
        {playlists.map((p) => {
          const isActive = active === p.id;
          const isXtream = p.url.startsWith("xtream://");
          return (
            <div key={p.id} onClick={() => setActive(p.id)} className={`group rounded-2xl border p-4 transition cursor-pointer ${isActive ? "border-primary bg-primary/5 shadow-glow" : "border-border bg-surface"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-bold">{p.name}</h3>
                    {isActive && <CheckCircle2 className="h-4 w-4 text-primary" />}
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground font-mono">
                    {isXtream ? getXtreamDisplayUrl(p.url) : p.url}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span>{p.channels.toLocaleString()} channels</span>
                    <span>•</span>
                    <span>Updated {p.updated}</span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  {!p.url.startsWith("local://") && (
                    <IconBtn onClick={(e) => handleRefresh(p, e)}><RefreshCw className="h-4 w-4" /></IconBtn>
                  )}
                  {p.id !== "p1" && p.id !== "p2" && p.id !== "p3" && (
                    <IconBtn onClick={() => deletePlaylist(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></IconBtn>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur p-4" onClick={() => setModalOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-card animate-in slide-in-from-bottom">
            <h2 className="text-xl font-bold">Add Playlist</h2>
            <p className="mt-1 text-sm text-muted-foreground">Import your IPTV channels list.</p>

            <div className="mt-4 flex rounded-xl bg-surface p-1">
              <button
                type="button"
                onClick={() => setImportType("url")}
                className={`flex-1 rounded-lg py-1.5 text-[11px] font-semibold transition ${
                  importType === "url" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground"
                }`}
              >
                M3U URL
              </button>
              <button
                type="button"
                onClick={() => setImportType("file")}
                className={`flex-1 rounded-lg py-1.5 text-[11px] font-semibold transition ${
                  importType === "file" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground"
                }`}
              >
                M3U File
              </button>
              <button
                type="button"
                onClick={() => setImportType("xtream")}
                className={`flex-1 rounded-lg py-1.5 text-[11px] font-semibold transition ${
                  importType === "xtream" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground"
                }`}
              >
                Xtream Codes
              </button>
            </div>

            {importType === "url" && (
              <form onSubmit={handleAddPlaylist} className="mt-5 space-y-3">
                <input value={name} onChange={(e) => setName(e.target.value)} disabled={loading} placeholder="Playlist name (optional)" className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:border-primary disabled:opacity-50" />
                <input required value={url} onChange={(e) => setUrl(e.target.value)} disabled={loading} placeholder="https://example.com/list.m3u" className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:border-primary font-mono disabled:opacity-50" />
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setModalOpen(false)} className="flex-1 rounded-xl border border-border bg-surface py-3 text-sm font-bold">Cancel</button>
                  <button type="submit" disabled={loading} className="flex-1 rounded-xl bg-gold-gradient py-3 text-sm font-bold text-black shadow-glow disabled:opacity-50">{loading ? "Adding..." : "Add"}</button>
                </div>
              </form>
            )}

            {importType === "file" && (
              <form onSubmit={handleFileUpload} className="mt-5 space-y-4">
                <input value={name} onChange={(e) => setName(e.target.value)} disabled={loading} placeholder="Playlist name (optional)" className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:border-primary disabled:opacity-50" />
                
                <div className="relative border-2 border-dashed border-border hover:border-primary/50 rounded-2xl p-6 text-center cursor-pointer transition bg-surface">
                  <input required type="file" accept=".m3u,.m3u8,text/plain" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-semibold truncate max-w-xs mx-auto">
                    {selectedFile ? selectedFile.name : "Select M3U/M3U8 file"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">or drag and drop it here</p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setModalOpen(false)} className="flex-1 rounded-xl border border-border bg-surface py-3 text-sm font-bold">Cancel</button>
                  <button type="submit" disabled={loading || !selectedFile} className="flex-1 rounded-xl bg-gold-gradient py-3 text-sm font-bold text-black shadow-glow disabled:opacity-50">{loading ? "Importing..." : "Import File"}</button>
                </div>
              </form>
            )}

            {importType === "xtream" && (
              <form onSubmit={handleAddXtreamPlaylist} className="mt-5 space-y-3">
                <div className="flex items-center gap-2 rounded-xl bg-primary/10 border border-primary/20 p-2.5 mb-2">
                  <ShieldAlert className="h-4 w-4 text-primary shrink-0" />
                  <p className="text-[10px] text-muted-foreground leading-normal">
                    IPTV accounts can get banned for frequent queries. Backend will cache category lists, streams, and series for 12 hours.
                  </p>
                </div>
                <input value={name} onChange={(e) => setName(e.target.value)} disabled={loading} placeholder="Playlist name (optional)" className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:border-primary disabled:opacity-50" />
                <input required value={xtreamHost} onChange={(e) => setXtreamHost(e.target.value)} disabled={loading} placeholder="Host URL (e.g. http://pro.ukora.online)" className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:border-primary font-mono disabled:opacity-50" />
                <input required value={xtreamUsername} onChange={(e) => setXtreamUsername(e.target.value)} disabled={loading} placeholder="Username" className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:border-primary disabled:opacity-50" />
                <input required type="password" value={xtreamPassword} onChange={(e) => setXtreamPassword(e.target.value)} disabled={loading} placeholder="Password" className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm outline-none focus:border-primary disabled:opacity-50" />
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setModalOpen(false)} className="flex-1 rounded-xl border border-border bg-surface py-3 text-sm font-bold">Cancel</button>
                  <button type="submit" disabled={loading} className="flex-1 rounded-xl bg-gold-gradient py-3 text-sm font-bold text-black shadow-glow disabled:opacity-50">{loading ? "Connecting..." : "Add Xtream API"}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function IconBtn({ children, onClick }: { children: React.ReactNode; onClick?: (e: React.MouseEvent) => void }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick?.(e); }} className="grid h-8 w-8 place-items-center rounded-lg bg-surface-2 hover:bg-muted">
      {children}
    </button>
  );
}
