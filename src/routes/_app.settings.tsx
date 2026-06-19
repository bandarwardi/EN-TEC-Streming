import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Bell, Shield, Star, Info, LogOut, ChevronRight, User, Volume2, Subtitles, Crown, List, Menu } from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { useState } from "react";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

import { Globe } from "lucide-react";
import { toast } from "sonner";

function SettingsPage() {
  const playlists = useAppStore((s) => s.playlists);
  const activePlaylistId = useAppStore((s) => s.activePlaylistId);
  const forceHttp = useAppStore((s) => s.forceHttp);
  const setForceHttp = useAppStore((s) => s.setForceHttp);
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);
  
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  const logout = useAppStore((s) => s.logout);
  const navigate = useNavigate();

  const activePlaylist = playlists.find(p => p.id === activePlaylistId);

  // Active playlist information display
  const profileName = activePlaylist ? activePlaylist.name : "Guest Session";
  
  let profileSubtitle = "No active playlist loaded";
  if (activePlaylist) {
    if (activePlaylist.url.startsWith("xtream://")) {
      try {
        const config = JSON.parse(atob(activePlaylist.url.replace("xtream://", "")));
        profileSubtitle = config.host.replace(/https?:\/\//, "");
      } catch (e) {
        profileSubtitle = "Xtream Server";
      }
    } else {
      profileSubtitle = activePlaylist.url.length > 35 
        ? activePlaylist.url.substring(0, 35) + "..." 
        : activePlaylist.url;
    }
  }

  const profilePlan = activePlaylist 
    ? `${activePlaylist.url.startsWith("xtream://") ? "Xtream Codes API" : "M3U Playlist"} · ${activePlaylist.channels} Channels` 
    : "Demo Playlist";

  // Subtitles settings toggler
  const [subtitles, setSubtitles] = useState(() => {
    try {
      return typeof window !== "undefined" ? localStorage.getItem("settings_subtitles") || "English" : "English";
    } catch (e) {
      return "English";
    }
  });
  const toggleSubtitles = () => {
    const options = ["English", "Arabic", "Off"];
    const currentIdx = options.indexOf(subtitles);
    const nextIdx = (currentIdx + 1) % options.length;
    const nextVal = options[nextIdx];
    console.log("[Settings] Toggling subtitles to:", nextVal);
    setSubtitles(nextVal);
    try {
      localStorage.setItem("settings_subtitles", nextVal);
    } catch (e) {}
  };

  // Language settings toggler
  const toggleLanguage = () => {
    const nextLang = language === "en" ? "ar" : "en";
    setLanguage(nextLang);
    toast.success(nextLang === "ar" ? "تم تغيير لغة التطبيق إلى العربية" : "App language changed to English");
  };

  // Notifications settings toggler
  const [notifications, setNotifications] = useState(() => {
    try {
      return typeof window !== "undefined" ? localStorage.getItem("settings_notifications") !== "false" : true;
    } catch (e) {
      return true;
    }
  });
  const toggleNotifications = () => {
    const nextVal = !notifications;
    console.log("[Settings] Toggling notifications to:", nextVal);
    setNotifications(nextVal);
    try {
      localStorage.setItem("settings_notifications", String(nextVal));
    } catch (e) {}
  };

  // Parental Control settings toggler
  const [parentalControl, setParentalControl] = useState(() => {
    try {
      return typeof window !== "undefined" ? localStorage.getItem("settings_parental") === "true" : false;
    } catch (e) {
      return false;
    }
  });
  const toggleParental = () => {
    const nextVal = !parentalControl;
    console.log("[Settings] Toggling parental control to:", nextVal);
    setParentalControl(nextVal);
    try {
      localStorage.setItem("settings_parental", String(nextVal));
    } catch (e) {}
  };

  const handleSignOut = () => {
    logout();
    navigate({ to: "/login" });
    toast.success("Signed out successfully");
  };

  return (
    <div className="px-4 pt-5 pb-20">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/home" className="grid h-9 w-9 place-items-center rounded-full bg-surface"><ChevronLeft className="h-5 w-5" /></Link>
          <h1 className="text-2xl font-black">Settings</h1>
        </div>
        <button
          onClick={() => setSidebarOpen(true)}
          className="grid h-9 w-9 place-items-center rounded-full bg-surface lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Account Profile Card */}
      <div className="mb-5 flex items-center gap-4 rounded-2xl border border-border bg-surface p-4">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-gold-gradient text-xl font-black text-black">
          {profileName[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="truncate font-bold">{profileName}</h2>
          <p className="truncate text-xs text-muted-foreground">{profileSubtitle}</p>
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-gold-gradient px-2 py-0.5 text-[10px] font-black text-black">
            <Crown className="h-2.5 w-2.5" /> {profilePlan}
          </span>
        </div>
      </div>

      <Section title="Player Settings">
        <Row icon={<Globe />} label="App Language / لغة التطبيق" value={language === "en" ? "English" : "العربية"} onClick={toggleLanguage} />
        <Row icon={<Subtitles />} label="Default Subtitles" value={subtitles === "Off" ? "Off" : `On — ${subtitles}`} onClick={toggleSubtitles} />
        <Row icon={<Shield />} label="Force HTTP (Bypass SSL)" value={forceHttp ? "Enabled" : "Disabled"} onClick={() => {
          console.log("[Settings] Toggling forceHttp to:", !forceHttp);
          setForceHttp(!forceHttp);
        }} />
      </Section>

      <Section title="App Settings">
        <Row icon={<List />} label="Playlists Manager" value={`${playlists.length} Active`} onClick={() => navigate({ to: "/playlists" })} />
        <Row icon={<Bell />} label="Push Notifications" value={notifications ? "Enabled" : "Disabled"} onClick={toggleNotifications} />
        <Row icon={<Shield />} label="Parental Control Lock" value={parentalControl ? "Locked" : "Unlocked"} onClick={toggleParental} />
      </Section>

      <Section title="System Status">
        <Row icon={<Info />} label="App Version" value="1.24 (Release)" />
        <Row icon={<User />} label="Session Key" value={activePlaylistId || "No Session"} />
      </Section>

      <button type="button" onClick={handleSignOut} className="mt-6 mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 py-3 text-sm font-bold text-destructive cursor-pointer">
        <LogOut className="h-4 w-4" /> Sign Out
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">{children}</div>
    </div>
  );
}

function Row({ icon, label, value, onClick }: { icon: React.ReactNode; label: string; value: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left last:border-0 hover:bg-surface-2 cursor-pointer">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-surface-2 text-primary">
        <span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      </span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      <span className="text-xs text-muted-foreground">{value}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}
