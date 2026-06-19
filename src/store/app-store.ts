import { create } from "zustand";
import { Channel, playlists as seedPlaylists, channels as seedChannels } from "@/lib/mock-data";
import { fetchPlaylist, fetchXtreamCategories, fetchXtreamChannelsByCategory } from "@/lib/api/m3u.functions";

type Quality = "Auto" | "4K" | "1080p" | "720p";

export interface Playlist {
  id: string;
  name: string;
  url: string;
  channels: number;
  updated: string;
  lastUpdatedTimestamp?: number; // Unix timestamp in ms
}

export interface PlaylistCategories {
  live: { id: string; name: string }[];
  vod: { id: string; name: string }[];
  series: { id: string; name: string }[];
}

type State = {
  isLoggedIn: boolean;
  user: { name: string; email: string; plan: string } | null;
  language: "ar" | "en";
  activePlaylistId: string;
  playlists: Playlist[];
  channels: Channel[]; // Active category channels
  activeCategories: PlaylistCategories | null;
  loadingChannels: boolean;
  player: {
    volume: number;
    quality: Quality;
    isPlaying: boolean;
  };
  login: (name: string) => void;
  logout: () => void;
  setLanguage: (l: "ar" | "en") => void;
  setVolume: (v: number) => void;
  setQuality: (q: Quality) => void;
  togglePlay: () => void;
  setActivePlaylist: (id: string) => Promise<void>;
  addPlaylist: (playlist: Playlist, channelsList: Channel[] | null, categories: PlaylistCategories | null) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  initializeFromStorage: () => Promise<void>;
  refreshPlaylistById: (id: string) => Promise<void>;
  loadChannelsForCategory: (playlistId: string, type: "live" | "vod" | "series", categoryId: string, categoryName: string) => Promise<void>;
  forceHttp: boolean;
  setForceHttp: (val: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
};

// Safe localStorage access
const isClient = typeof window !== "undefined";

const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === "undefined") return null;
    try {
      const storage = window["localStorage"];
      return storage ? storage.getItem(key) : null;
    } catch (e) {
      console.warn(`safeLocalStorage.getItem failed for key "${key}":`, e);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === "undefined") return;
    try {
      const storage = window["localStorage"];
      if (storage) {
        storage.setItem(key, value);
      }
    } catch (e) {
      console.warn(`safeLocalStorage.setItem failed for key "${key}":`, e);
    }
  }
};

// Custom IndexedDB Store for Channel lists and category lists
class IndexedDBStore {
  private dbName = "streaming_db";
  private storeName = "channels";

  private getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async get(key: string): Promise<any> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, "readonly");
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error("IndexedDB get failed:", e);
      return null;
    }
  }

  async set(key: string, value: any): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, "readwrite");
        const store = transaction.objectStore(this.storeName);
        store.put(value, key);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (e) {
      console.error("IndexedDB set failed:", e);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, "readwrite");
        const store = transaction.objectStore(this.storeName);
        store.delete(key);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (e) {
      console.error("IndexedDB delete failed:", e);
    }
  }
}

const dbStore = new IndexedDBStore();

const getStoragePlaylists = (): Playlist[] => {
  if (!isClient) return seedPlaylists;
  const stored = safeLocalStorage.getItem("streaming_playlists");
  return stored ? JSON.parse(stored) : seedPlaylists;
};

export const useAppStore = create<State>((set, get) => ({
  isLoggedIn: true,
  user: { name: "test1", email: "test1@entec.tv", plan: "Premium 4K" },
  language: "en",
  activePlaylistId: "p1",
  playlists: seedPlaylists,
  channels: seedChannels,
  activeCategories: null,
  loadingChannels: false,
  player: { volume: 80, quality: "Auto", isPlaying: true },
  
  login: (name) => set({ isLoggedIn: true, user: { name, email: `${name}@entec.tv`, plan: "Premium 4K" } }),
  
  logout: () => set({ isLoggedIn: false, user: null }),
  
  setLanguage: (language) => set({ language }),
  
  setVolume: (v) => set((s) => ({ player: { ...s.player, volume: v } })),
  
  setQuality: (q) => set((s) => ({ player: { ...s.player, quality: q } })),
  
  togglePlay: () => set((s) => ({ player: { ...s.player, isPlaying: !s.player.isPlaying } })),
  
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  
  forceHttp: isClient ? safeLocalStorage.getItem("streaming_force_http") === "true" : false,
  setForceHttp: (val) => {
    if (isClient) {
      safeLocalStorage.setItem("streaming_force_http", String(val));
    }
    set({ forceHttp: val });
  },
  
  setActivePlaylist: async (id) => {
    set({ activePlaylistId: id });
    if (isClient) {
      safeLocalStorage.setItem("streaming_active_playlist_id", id);
      
      // Load categories for this playlist
      let cats: PlaylistCategories | null = null;
      if (id === "p1" || id === "p2" || id === "p3") {
        // For demo playlists, let's construct mock categories
        const categorySet = new Set(seedChannels.map((c) => c.category));
        const catsList = Array.from(categorySet).filter(Boolean).map(name => ({ id: name, name }));
        cats = {
          live: catsList,
          vod: [],
          series: []
        };
        set({ channels: seedChannels, activeCategories: cats });
      } else {
        cats = await dbStore.get(`streaming_categories_${id}`);
        set({ activeCategories: cats, channels: [] }); // Reset channels list, load on-demand
      }
    }
  },

  addPlaylist: async (playlist, channelsList, categories) => {
    const playlistWithTimestamp = {
      ...playlist,
      lastUpdatedTimestamp: Date.now()
    };
    const updatedPlaylists = [...get().playlists.filter(p => p.id !== playlist.id), playlistWithTimestamp];
    set({ playlists: updatedPlaylists });
    
    if (isClient) {
      safeLocalStorage.setItem("streaming_playlists", JSON.stringify(updatedPlaylists));
      
      let finalCategories = categories;
      
      if (channelsList && channelsList.length > 0) {
        // M3U Playlist: parse and chunk channels by category
        const liveCategories: { id: string; name: string }[] = [];
        const vodCategories: { id: string; name: string }[] = [];
        const seriesCategories: { id: string; name: string }[] = [];
        
        const catMap = new Map<string, Channel[]>();
        for (const ch of channelsList) {
          let catList = catMap.get(ch.category);
          if (!catList) {
            catList = [];
            catMap.set(ch.category, catList);
          }
          catList.push(ch);
        }
        
        for (const [catName, catChannels] of catMap.entries()) {
          const lowerName = catName.toLowerCase();
          const id = catName; // For M3U, category name is its ID
          
          if (lowerName.includes("series") || lowerName.includes("season") || lowerName.includes("مسلسلات")) {
            seriesCategories.push({ id, name: catName });
            await dbStore.set(`streaming_channels_${playlist.id}_series_${id}`, { channels: catChannels, timestamp: Date.now() });
          } else if (lowerName.includes("movie") || lowerName.includes("cinema") || lowerName.includes("films") || lowerName.includes("افلام")) {
            vodCategories.push({ id, name: catName });
            await dbStore.set(`streaming_channels_${playlist.id}_vod_${id}`, { channels: catChannels, timestamp: Date.now() });
          } else {
            liveCategories.push({ id, name: catName });
            await dbStore.set(`streaming_channels_${playlist.id}_live_${id}`, { channels: catChannels, timestamp: Date.now() });
          }
        }
        
        finalCategories = {
          live: liveCategories,
          vod: vodCategories,
          series: seriesCategories,
        };
      }
      
      if (finalCategories) {
        await dbStore.set(`streaming_categories_${playlist.id}`, finalCategories);
      }
    }
    
    // Automatically set the new playlist as active
    await get().setActivePlaylist(playlist.id);
  },

  deletePlaylist: async (id) => {
    const updatedPlaylists = get().playlists.filter((p) => p.id !== id);
    set({ playlists: updatedPlaylists });
    if (isClient) {
      safeLocalStorage.setItem("streaming_playlists", JSON.stringify(updatedPlaylists));
      await dbStore.delete(`streaming_categories_${id}`);
      // Also delete any chunked categories
      const cats = await dbStore.get(`streaming_categories_${id}`);
      if (cats) {
        for (const type of ["live", "vod", "series"] as const) {
          const list = cats[type];
          if (list) {
            for (const item of list) {
              await dbStore.delete(`streaming_channels_${id}_${type}_${item.id}`);
            }
          }
        }
      }
    }
    if (get().activePlaylistId === id) {
      await get().setActivePlaylist("p1");
    }
  },

  initializeFromStorage: async () => {
    if (!isClient) return;
    const activeId = safeLocalStorage.getItem("streaming_active_playlist_id") || "p1";
    const pls = getStoragePlaylists();
    
    set({
      activePlaylistId: activeId,
      playlists: pls,
    });
    
    let cats: PlaylistCategories | null = null;
    if (activeId === "p1" || activeId === "p2" || activeId === "p3") {
      const categorySet = new Set(seedChannels.map((c) => c.category));
      const catsList = Array.from(categorySet).filter(Boolean).map(name => ({ id: name, name }));
      cats = {
        live: catsList,
        vod: [],
        series: []
      };
      set({ channels: seedChannels, activeCategories: cats });
    } else {
      cats = await dbStore.get(`streaming_categories_${activeId}`);
      set({ activeCategories: cats, channels: [] });
    }

    // Check for 12-hour expiration on playlists (except demo & local file playlists)
    const now = Date.now();
    const twelveHoursMs = 12 * 60 * 60 * 1000;
    
    for (const p of pls) {
      if (p.id === "p1" || p.id === "p2" || p.id === "p3") continue;
      if (p.url.startsWith("local://")) continue;

      const lastUpdated = p.lastUpdatedTimestamp || 0;
      if (now - lastUpdated > twelveHoursMs) {
        get().refreshPlaylistById(p.id).catch((err) => {
          console.error(`[Background Refresh] Auto-update failed for playlist ${p.name}:`, err);
        });
      }
    }
  },

  refreshPlaylistById: async (id) => {
    const p = get().playlists.find((x) => x.id === id);
    if (!p) return;
    if (p.id === "p1" || p.id === "p2" || p.id === "p3") return;
    if (p.url.startsWith("local://")) return;

    console.log(`[Background Refresh] Checking updates for playlist: ${p.name}`);

    if (p.url.startsWith("xtream://")) {
      try {
        const config = JSON.parse(atob(p.url.replace("xtream://", "")));
        const res = await fetchXtreamCategories(config.host, config.username, config.password);
        if (res.success && res.categories) {
          const updatedPlaylist = {
            ...p,
            channels: res.categories.live.length + res.categories.vod.length + res.categories.series.length,
            updated: "Auto-updated just now (Cached 12h)",
            lastUpdatedTimestamp: Date.now()
          };
          
          const updatedPlaylists = get().playlists.map(x => x.id === id ? updatedPlaylist : x);
          set({ playlists: updatedPlaylists });
          
          if (isClient) {
            safeLocalStorage.setItem("streaming_playlists", JSON.stringify(updatedPlaylists));
            await dbStore.set(`streaming_categories_${id}`, res.categories);
          }
          
          if (get().activePlaylistId === id) {
            set({ activeCategories: res.categories });
          }
          console.log(`[Background Refresh] Auto-update succeeded for Xtream categories: ${p.name}`);
        }
      } catch (err) {
        console.error("Background refresh failed to parse credentials/fetch categories for:", p.name, err);
      }
    } else {
      const res = await fetchPlaylist(p.url);
      if (res.success && res.channels) {
        const updatedPlaylist = {
          ...p,
          channels: res.channels.length,
          updated: "Auto-updated just now",
          lastUpdatedTimestamp: Date.now()
        };
        
        const updatedPlaylists = get().playlists.map(x => x.id === id ? updatedPlaylist : x);
        set({ playlists: updatedPlaylists });
        
        if (isClient) {
          safeLocalStorage.setItem("streaming_playlists", JSON.stringify(updatedPlaylists));
          
          // Re-chunk M3U
          const liveCategories: { id: string; name: string }[] = [];
          const vodCategories: { id: string; name: string }[] = [];
          const seriesCategories: { id: string; name: string }[] = [];
          
          const catMap = new Map<string, Channel[]>();
          for (const ch of res.channels) {
            let catList = catMap.get(ch.category);
            if (!catList) {
              catList = [];
              catMap.set(ch.category, catList);
            }
            catList.push(ch);
          }
          
          for (const [catName, catChannels] of catMap.entries()) {
            const lowerName = catName.toLowerCase();
            const cid = catName;
            
            if (lowerName.includes("series") || lowerName.includes("season") || lowerName.includes("مسلسلات")) {
              seriesCategories.push({ id: cid, name: catName });
              await dbStore.set(`streaming_channels_${id}_series_${cid}`, { channels: catChannels, timestamp: Date.now() });
            } else if (lowerName.includes("movie") || lowerName.includes("cinema") || lowerName.includes("films") || lowerName.includes("افلام")) {
              vodCategories.push({ id: cid, name: catName });
              await dbStore.set(`streaming_channels_${id}_vod_${cid}`, { channels: catChannels, timestamp: Date.now() });
            } else {
              liveCategories.push({ id: cid, name: catName });
              await dbStore.set(`streaming_channels_${id}_live_${cid}`, { channels: catChannels, timestamp: Date.now() });
            }
          }
          
          const finalCategories = {
            live: liveCategories,
            vod: vodCategories,
            series: seriesCategories,
          };
          
          await dbStore.set(`streaming_categories_${id}`, finalCategories);
          
          if (get().activePlaylistId === id) {
            set({ activeCategories: finalCategories });
          }
        }
        console.log(`[Background Refresh] Auto-update succeeded for M3U playlist: ${p.name}`);
      }
    }
  },

  loadChannelsForCategory: async (playlistId, type, categoryId, categoryName) => {
    if (playlistId === "p1" || playlistId === "p2" || playlistId === "p3") {
      // Demo playlist: channels are already in state or can be filtered from seedChannels
      const filtered = seedChannels.filter(c => c.category === categoryId);
      set({ channels: filtered });
      return;
    }
    
    set({ loadingChannels: true });
    
    try {
      const cacheKey = `streaming_channels_${playlistId}_${type}_${categoryId}`;
      const cached = await dbStore.get(cacheKey);
      
      const now = Date.now();
      const twelveHoursMs = 12 * 60 * 60 * 1000;
      
      if (cached && Array.isArray(cached.channels) && (now - (cached.timestamp || 0) < twelveHoursMs)) {
        set({ channels: cached.channels, loadingChannels: false });
        return;
      }
      
      // If expired or missing, fetch for Xtream Codes playlists (M3U playlists are pre-chunked, so if missing they are empty)
      const p = get().playlists.find(x => x.id === playlistId);
      if (p && p.url.startsWith("xtream://")) {
        const config = JSON.parse(atob(p.url.replace("xtream://", "")));
        const res = await fetchXtreamChannelsByCategory(
          config.host,
          config.username,
          config.password,
          type,
          categoryId,
          categoryName
        );
        
        if (res.success && res.channels) {
          await dbStore.set(cacheKey, { channels: res.channels, timestamp: now });
          set({ channels: res.channels });
        } else {
          // If fetch fails but we have expired cached data, keep using it as a fallback
          if (cached && Array.isArray(cached.channels)) {
            set({ channels: cached.channels });
          } else {
            set({ channels: [] });
            console.error("Failed to load category channels:", res.success === false ? res.error : "Failed to load channels");
          }
        }
      } else {
        if (cached && Array.isArray(cached.channels)) {
          set({ channels: cached.channels });
        } else {
          set({ channels: [] });
        }
      }
    } catch (e) {
      console.error("Error in loadChannelsForCategory:", e);
      set({ channels: [] });
    } finally {
      set({ loadingChannels: false });
    }
  }
}));

