import { create } from 'zustand';
import AsyncStorageOriginal from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { readCacheString, writeCacheString, deleteCache } from '../lib/storage';

const isLargeDataKey = (key: string) => key.startsWith('channels_') || key.startsWith('categories_') || key.startsWith('search_index_');

const AsyncStorage = {
  getItem: async (key: string) => {
    if (isLargeDataKey(key)) return await readCacheString(key);
    return await AsyncStorageOriginal.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    if (isLargeDataKey(key)) return await writeCacheString(key, value);
    return await AsyncStorageOriginal.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (isLargeDataKey(key)) return await deleteCache(key);
    return await AsyncStorageOriginal.removeItem(key);
  }
};

let globalSearchIndex: Channel[] = [];
import { Channel, Playlist } from '../types';
import { MOCK_PLAYLISTS, MOCK_CHANNELS, MOCK_MOVIES, MOCK_SERIES } from '../lib/mock-data';
import { parseM3U } from '../lib/m3u-parser';
import { base64Decode } from '../lib/base64';

export interface PlaylistCategories {
  live: { id: string; name: string }[];
  vod: { id: string; name: string }[];
  series: { id: string; name: string }[];
}

export interface WatchedItem {
  id: string;
  type: 'vod' | 'series' | 'live';
  title: string;
  poster: string;
  backdrop: string;
  streamUrl: string;
  progress: number;
  duration: number;
  timestamp: number;
  quality?: string;
  genres?: string[];
  description?: string;
  category?: string;
}

interface AppState {
  isLoggedIn: boolean;
  user: { name: string; email: string; plan: string } | null;
  login: (name: string, email?: string) => void;
  logout: () => void;

  activePlaylistId: string;
  playlists: Playlist[];
  playlistChannels: Record<string, Channel[]>;
  activeCategories: PlaylistCategories | null;
  channels: Channel[];
  loadingChannels: boolean;

  loadingSearchIndex: boolean;
  searchIndexReady: boolean;
  searchIndexProgress: string;
  loadSearchIndex: (playlistId: string) => Promise<void>;
  buildSearchIndex: (playlistId: string, onProgress?: (msg: string) => void) => Promise<void>;
  searchChannels: (query: string) => Promise<Channel[]>;
  getChannelsByType: (type: 'live' | 'vod' | 'series') => Promise<Channel[]>;
  
  addPlaylist: (
    playlist: Playlist, 
    channels?: Channel[], 
    categories?: PlaylistCategories | null
  ) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  setActivePlaylist: (id: string) => Promise<void>;
  refreshPlaylist: (id: string) => Promise<void>;
  loadPlaylistFromUrl: (
    playlistId: string,
    url: string,
    onProgress?: (msg: string) => void
  ) => Promise<{ channels: number }>;
  loadChannelsForCategory: (
    playlistId: string,
    type: 'live' | 'vod' | 'series',
    categoryId: string,
    categoryName: string
  ) => Promise<void>;
  getChannelsForCategory: (
    playlistId: string,
    type: 'live' | 'vod' | 'series',
    categoryId: string,
    categoryName: string
  ) => Promise<Channel[]>;

  getActiveChannels: (type: 'live' | 'vod' | 'series') => Channel[];

  playbackQueue: Channel[];
  playbackIndex: number;
  setPlaybackQueue: (queue: Channel[], index: number) => void;
  setPlaybackIndex: (index: number) => void;

  favorites: string[];
  favoriteItems: Channel[];
  toggleFavorite: (item: Channel) => void;
  globalAlert: { title: string; message: string; buttonText: string; onPress: () => void; } | null;
  showGlobalAlert: (title: string, message: string, buttonText: string, onPress: () => void) => void;
  hideGlobalAlert: () => void;

  settings: {
    quality: 'Auto' | '4K' | '1080p' | '720p';
    forceHttp: boolean;
    notifications: boolean;
    parentalControl: boolean;
  };
  updateSettings: (s: Partial<AppState['settings']>) => void;

  continueWatching: WatchedItem[];
  updateContinueWatching: (item: WatchedItem) => void;
  removeFromContinueWatching: (id: string) => void;

  downloads: DownloadItem[];
  addDownload: (item: DownloadItem) => void;
  removeDownload: (id: string) => void;
  updateDownloadItem: (id: string, updates: Partial<DownloadItem>) => void;
  startDownload: (item: Omit<DownloadItem, 'status' | 'progress' | 'resumeData' | 'localUri'>) => Promise<void>;
  pauseDownload: (id: string) => Promise<void>;
  resumeDownload: (id: string) => Promise<void>;
  cancelDownload: (id: string) => Promise<void>;

  initializeFromStorage: () => Promise<void>;
}

export interface DownloadItem {
  id: string;
  title: string;
  poster: string;
  backdrop: string;
  quality: string;
  streamUrl: string;
  localUri: string;
  type: 'movie' | 'series';
  status: 'downloading' | 'paused' | 'completed' | 'error';
  progress: number;
  resumeData?: string;
}

const activeDownloads: Record<string, FileSystem.DownloadResumable> = {};

const USER_AGENTS = [
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Kodi/20.2 (Linux; Android 13) ExoPlayerLib/2.18.1',
  'VLC/3.0.18 LibVLC/3.0.18',
  'TiviMate/4.7.0',
];

const fetchWithXHR = (targetUrl: string, acceptHeader?: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', targetUrl, true);
    xhr.timeout = 30000;
    try {
      xhr.setRequestHeader('Accept', acceptHeader || 'application/json, application/x-mpegurl, */*');
    } catch (_) {}

    xhr.onload = () => {
      const body = xhr.responseText ?? '';
      if (body.trim().length > 0) {
        resolve(body);
      } else {
        const hint =
          xhr.status > 599
            ? `\n\nStatus ${xhr.status} > 599 suggests the port may be wrong or the server is not responding with HTTP.`
            : '';
        reject(new Error(`SERVER_EMPTY:${xhr.status}${hint}`));
      }
    };

    xhr.onerror = () => reject(new Error('NETWORK_ERROR'));
    xhr.ontimeout = () => reject(new Error('TIMEOUT'));
    xhr.onabort = () => reject(new Error('ABORTED'));

    xhr.send();
  });

export const useAppStore = create<AppState>((set, get) => ({
  isLoggedIn: false,
  globalAlert: null,
  showGlobalAlert: (title, message, buttonText, onPress) => set({ globalAlert: { title, message, buttonText, onPress } }),
  hideGlobalAlert: () => set({ globalAlert: null }),
  user: null,
  downloads: [],

  addDownload: (item) => {
    set(state => {
      const newDownloads = [...state.downloads.filter(d => d.id !== item.id), item];
      AsyncStorage.setItem('downloads', JSON.stringify(newDownloads));
      return { downloads: newDownloads };
    });
  },

  removeDownload: (id) => {
    set(state => {
      const newDownloads = state.downloads.filter(d => d.id !== id);
      AsyncStorage.setItem('downloads', JSON.stringify(newDownloads));
      return { downloads: newDownloads };
    });
  },

  updateDownloadItem: (id, updates) => {
    set(state => {
      const newDownloads = state.downloads.map(d => d.id === id ? { ...d, ...updates } : d);
      AsyncStorage.setItem('downloads', JSON.stringify(newDownloads));
      return { downloads: newDownloads };
    });
  },

  startDownload: async (item) => {
    const fileUri = (FileSystem as any).documentDirectory + `${item.id}.mp4`;
    
    // Create new download item state
    const newDownload: DownloadItem = {
      ...item,
      status: 'downloading',
      progress: 0,
      localUri: fileUri
    };
    get().addDownload(newDownload);

    try {
      const downloadResumable = FileSystem.createDownloadResumable(
        item.streamUrl,
        fileUri,
        { 
          headers: { 
            'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
            'Accept': '*/*',
            'Accept-Encoding': 'identity',
            'Connection': 'close',
            'Icy-MetaData': '1'
          } 
        },
        (dp) => {
          const progress = dp.totalBytesWritten / dp.totalBytesExpectedToWrite;
          get().updateDownloadItem(item.id, { progress });
        }
      );
      
      activeDownloads[item.id] = downloadResumable;
      
      const result = await downloadResumable.downloadAsync();
      
      if (result) {
        get().updateDownloadItem(item.id, { status: 'completed', progress: 1 });
      } else {
        get().updateDownloadItem(item.id, { status: 'error' });
      }
    } catch (e: any) {
      console.error("[Download Error]", e);
      get().updateDownloadItem(item.id, { status: 'error' });
    } finally {
      delete activeDownloads[item.id];
    }
  },

  pauseDownload: async (id) => {
    const resumable = activeDownloads[id];
    if (resumable) {
      try {
        const resumeData = await resumable.pauseAsync();
        const serialized = JSON.stringify(resumeData);
        get().updateDownloadItem(id, { status: 'paused', resumeData: serialized });
      } catch (e) {
        console.error("Failed to pause", e);
      }
    }
  },

  resumeDownload: async (id) => {
    const download = get().downloads.find(d => d.id === id);
    if (!download || !download.resumeData) return;

    try {
      const parsedResumeData = JSON.parse(download.resumeData);
      const downloadResumable = FileSystem.createDownloadResumable(
        download.streamUrl,
        download.localUri,
        { 
          headers: { 
            'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
            'Accept': '*/*',
            'Accept-Encoding': 'identity',
            'Connection': 'close',
            'Icy-MetaData': '1'
          } 
        },
        (dp) => {
          const progress = dp.totalBytesWritten / dp.totalBytesExpectedToWrite;
          get().updateDownloadItem(id, { progress });
        },
        parsedResumeData.resumeData
      );

      activeDownloads[id] = downloadResumable;
      get().updateDownloadItem(id, { status: 'downloading' });
      
      const result = await downloadResumable.downloadAsync();
      
      if (result) {
        get().updateDownloadItem(id, { status: 'completed', progress: 1 });
      } else {
        get().updateDownloadItem(id, { status: 'error' });
      }
    } catch (e: any) {
      console.error("[Download Resume Error]", e);
      get().updateDownloadItem(id, { status: 'error' });
    } finally {
      delete activeDownloads[id];
    }
  },

  cancelDownload: async (id) => {
    const download = get().downloads.find(d => d.id === id);
    const resumable = activeDownloads[id];
    if (resumable) {
      try {
        await resumable.pauseAsync(); // Stop active download safely
      } catch (e) {}
    }
    delete activeDownloads[id];
    get().removeDownload(id);
    
    if (download && download.localUri) {
      try {
        await FileSystem.deleteAsync(download.localUri, { idempotent: true });
      } catch (e) {}
    }
  },

  login: (name, email) => {
    const userData = { name, email: email ?? '', plan: 'Premium' };
    set({ isLoggedIn: true, user: userData });
    AsyncStorage.setItem('user', JSON.stringify(userData));
  },
  logout: () => {
    set({ isLoggedIn: false, user: null });
    AsyncStorage.removeItem('user');
  },

  activePlaylistId: '',
  playlists: [],
  playlistChannels: {},
  activeCategories: null,
  channels: [],
  loadingChannels: false,

  loadingSearchIndex: false,
  searchIndexReady: false,
  searchIndexProgress: '',

  searchChannels: async (query: string) => {
    if (!query) return [];
    const q = query.toLowerCase();
    const results: Channel[] = [];
    for (const item of globalSearchIndex) {
      if (results.length >= 50) break;
      if (item.name && item.name.toLowerCase().includes(q)) {
        results.push(item);
      }
    }
    return results;
  },


  continueWatching: [],
  updateContinueWatching: (item) => {
    set((state) => {
      const filtered = state.continueWatching.filter(i => i.id !== item.id && i.streamUrl !== item.streamUrl);
      const newList = [item, ...filtered].sort((a, b) => b.timestamp - a.timestamp).slice(0, 30);
      AsyncStorage.setItem('continueWatching', JSON.stringify(newList));
      return { continueWatching: newList };
    });
  },
  removeFromContinueWatching: (id) => {
    set((state) => {
      const newList = state.continueWatching.filter(i => i.id !== id);
      AsyncStorage.setItem('continueWatching', JSON.stringify(newList));
      return { continueWatching: newList };
    });
  },

  addPlaylist: async (playlist, channels, categories) => {
    const newPlaylists = [...get().playlists, playlist];
    set({ playlists: newPlaylists, activePlaylistId: playlist.id, channels: [] });
    if (categories) {
      set({ activeCategories: categories });
      await AsyncStorage.setItem(`categories_${playlist.id}`, JSON.stringify(categories));
    } else {
      try {
        const cachedCats = await AsyncStorage.getItem(`categories_${playlist.id}`);
        if (cachedCats) {
          set({ activeCategories: JSON.parse(cachedCats) });
        }
      } catch (e) {
        console.warn('Failed to load categories in addPlaylist:', e);
      }
    }
    if (channels) {
      set((s) => ({ playlistChannels: { ...s.playlistChannels, [playlist.id]: channels } }));
      await AsyncStorage.setItem(`channels_${playlist.id}`, JSON.stringify(channels));
    }
    await AsyncStorage.setItem('playlists', JSON.stringify(newPlaylists));
    await AsyncStorage.setItem('activePlaylistId', playlist.id);

    // Build the search index automatically in the background
    get().buildSearchIndex(playlist.id).catch((err) => {
      console.error('[addPlaylist] Auto-building search index failed:', err);
    });
  },

  deletePlaylist: async (id) => {
    const newPlaylists = get().playlists.filter((p) => p.id !== id);
    const newChannels = { ...get().playlistChannels };
    delete newChannels[id];
    set({ playlists: newPlaylists, playlistChannels: newChannels, activeCategories: null, channels: [] });
    if (get().activePlaylistId === id) {
      set({ activePlaylistId: newPlaylists[0]?.id ?? '' });
    }
    await AsyncStorage.setItem('playlists', JSON.stringify(newPlaylists));
    await AsyncStorage.removeItem(`channels_${id}`);
    await AsyncStorage.removeItem(`categories_${id}`);
  },

  setActivePlaylist: async (id) => {
    set({ activePlaylistId: id, channels: [] });
    await AsyncStorage.setItem('activePlaylistId', id);
    
    if (id === 'p1' || id === 'p2' || id === 'p3') {
      const categorySet = new Set(MOCK_CHANNELS.map((c) => c.category));
      const catsList = Array.from(categorySet).filter(Boolean).map(name => ({ id: name, name }));
      const cats: PlaylistCategories = {
        live: catsList,
        vod: [],
        series: []
      };
      set({ activeCategories: cats });
    } else {
      try {
        const cachedCats = await AsyncStorage.getItem(`categories_${id}`);
        if (cachedCats) {
          set({ activeCategories: JSON.parse(cachedCats) });
        } else {
          set({ activeCategories: null });
        }
      } catch (e) {
        set({ activeCategories: null });
      }
    }

    // Auto-load search index and build it in the background
    try {
      get().loadSearchIndex(id).catch((err) => {
        console.error('[setActivePlaylist] Error building search index:', err);
      });
    } catch (err) {
      console.error('[setActivePlaylist] Failed starting search index build:', err);
    }
  },

  refreshPlaylist: async (id) => {
    const playlist = get().playlists.find((p) => p.id === id);
    if (!playlist || playlist.isDemo) return;
    await get().loadPlaylistFromUrl(id, playlist.url);
  },

  loadPlaylistFromUrl: async (playlistId, url, onProgress) => {
    onProgress?.('Connecting to server...');

    // Build the list of URLs to try for this playlist load.
    // For Xtream Codes the url was already built by playlists.tsx as the
    // get.php URL; we also generate a simplified path variant as fallback.
    const getPhpMatch = url.match(/^(https?:\/\/[^/]+)\/get\.php\?username=([^&]+)&password=([^&]+)/);
    
    // If it is an Xtream Codes URL, try fetching via player_api.php dynamically
    // to avoid the IPTV server crashing with a 500 error on get.php.
    if (getPhpMatch) {
      const [, host, username, password] = getPhpMatch;
      
      const fetchJsonWithFallback = async (endpoint: string): Promise<any> => {
        const targetUrls = [
          endpoint,
          `https://corsproxy.io/?url=${encodeURIComponent(endpoint)}`,
          `https://api.allorigins.win/raw?url=${encodeURIComponent(endpoint)}`
        ];
        let lastErr: Error = new Error('JSON fetch failed');
        for (const u of targetUrls) {
          try {
            const resText = await fetchWithXHR(u);
            const parsed = JSON.parse(resText);
            if (parsed && (Array.isArray(parsed) || typeof parsed === 'object')) {
              return parsed;
            }
          } catch (e: any) {
            lastErr = e;
          }
        }
        throw lastErr;
      };

      try {
        console.log(`[Xtream Import] Verifying account credentials at: ${host}`);
        onProgress?.('Verifying Xtream Account Status...');
        const accountInfo = await fetchJsonWithFallback(`${host}/player_api.php?username=${username}&password=${password}`);
        
        console.log('[Xtream Import] Account info response:', accountInfo);
        
        if (!accountInfo || !accountInfo.user_info || accountInfo.user_info.auth === 0) {
          throw new Error('Authentication failed: Invalid Username or Password.');
        }
        
        if (accountInfo.user_info.status !== 'Active') {
          throw new Error(`Account status is: ${accountInfo.user_info.status || 'Expired or Inactive'}`);
        }

        console.log('[Xtream Import] Credentials verified. Account status active. Syncing categories...');
        onProgress?.('Fetching categories...');
        const [liveCats, vodCats, seriesCats] = await Promise.all([
          fetchJsonWithFallback(`${host}/player_api.php?username=${username}&password=${password}&action=get_live_categories`).catch((err) => { console.warn('Failed get_live_categories:', err); return []; }),
          fetchJsonWithFallback(`${host}/player_api.php?username=${username}&password=${password}&action=get_vod_categories`).catch((err) => { console.warn('Failed get_vod_categories:', err); return []; }),
          fetchJsonWithFallback(`${host}/player_api.php?username=${username}&password=${password}&action=get_series_categories`).catch((err) => { console.warn('Failed get_series_categories:', err); return []; })
        ]);

        if (Array.isArray(liveCats) || Array.isArray(vodCats) || Array.isArray(seriesCats)) {
          onProgress?.('Processing categories...');
          
          const liveCategories = Array.isArray(liveCats)
            ? liveCats.filter((c: any) => c && c.category_id && c.category_name).map((c: any) => ({ id: String(c.category_id), name: String(c.category_name) }))
            : [];
          const vodCategories = Array.isArray(vodCats)
            ? vodCats.filter((c: any) => c && c.category_id && c.category_name).map((c: any) => ({ id: String(c.category_id), name: String(c.category_name) }))
            : [];
          const seriesCategories = Array.isArray(seriesCats)
            ? seriesCats.filter((c: any) => c && c.category_id && c.category_name).map((c: any) => ({ id: String(c.category_id), name: String(c.category_name) }))
            : [];
            
          const categoriesObj: PlaylistCategories = {
            live: liveCategories,
            vod: vodCategories,
            series: seriesCategories
          };

          console.log(`[Xtream Import] Found categories count: Live=${liveCategories.length}, Movies=${vodCategories.length}, Series=${seriesCategories.length}`);

          set({ activeCategories: categoriesObj });
          await AsyncStorage.setItem(`categories_${playlistId}`, JSON.stringify(categoriesObj));

          const totalCategories = liveCategories.length + vodCategories.length + seriesCategories.length;

          set((s) => ({
            playlists: s.playlists.map((p) =>
              p.id === playlistId
                ? { ...p, channels: totalCategories, updated: 'Active', lastUpdatedTimestamp: Date.now() }
                : p
            ),
          }));

          await AsyncStorage.setItem('playlists', JSON.stringify(get().playlists));

          return { channels: totalCategories };
        }
      } catch (e: any) {
        console.error('[Xtream Import] Failed to verify or fetch categories:', e);
        throw new Error(e.message || 'Failed to authenticate with Xtream Codes server.');
      }
    }

    const baseUrls: string[] = [url];

    // If Xtream get.php format, also try the /username/password/all.m3u path variant
    if (getPhpMatch) {
      const [, base, u, p] = getPhpMatch;
      baseUrls.push(`${base}/${u}/${p}/`);
      baseUrls.push(`${base}/get.php?username=${u}&password=${p}&type=m3u_plus`);
    }

    // Also try HTTPS if the original is HTTP (some servers force HTTPS)
    for (const u of [...baseUrls]) {
      if (u.startsWith('http://')) baseUrls.push(u.replace('http://', 'https://'));
    }

    // Generate the full list of URLs to try:
    // First, try all direct options (so direct works fast if it works)
    const urlsToTry: string[] = [...baseUrls];

    // Then, try each URL through HTTPS CORS proxies (bypass user-agent blocks and cleartext restrictions)
    for (const u of baseUrls) {
      urlsToTry.push(`https://corsproxy.io/?url=${encodeURIComponent(u)}`);
      urlsToTry.push(`https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`);
    }

    let lastError: Error = new Error('Unknown error');

    for (let i = 0; i < urlsToTry.length; i++) {
      const targetUrl = urlsToTry[i];
      
      // Inform user if we are trying fallback options
      if (i > 0) {
        const isProxy = targetUrl.includes('corsproxy.io') || targetUrl.includes('allorigins.win');
        const proxyName = targetUrl.includes('corsproxy.io') ? 'CORSProxy' : 'AllOrigins';
        onProgress?.(`Trying alternate URL (${i}/${urlsToTry.length - 1})${isProxy ? ` via ${proxyName} proxy` : ''}...`);
      }

      try {
        const text = await fetchWithXHR(targetUrl);

        if (!text.includes('#EXTM3U') && !text.includes('#EXTINF')) {
          const preview = text.substring(0, 300).trim();
          // We throw a catchable error so we can proceed with other candidate URLs (e.g. proxies)
          throw new Error(
            `INVALID_CONTENT:Server responded but did not return M3U data.\n\nServer reply:\n${preview || '(empty)'}`
          );
        }

        onProgress?.('Parsing channels...');
        const parsedChannels = parseM3U(text);

        if (parsedChannels.length === 0) {
          throw new Error('Playlist loaded but contains 0 channels. Check the URL format.');
        }

        onProgress?.('Grouping categories...');
        const liveCatsList: { id: string; name: string }[] = [];
        const vodCatsList: { id: string; name: string }[] = [];
        const seriesCatsList: { id: string; name: string }[] = [];
        
        const catMap = new Map<string, Channel[]>();
        for (const ch of parsedChannels) {
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
          
          if (lowerName.includes('series') || lowerName.includes('season') || lowerName.includes('مسلسلات')) {
            seriesCatsList.push({ id: cid, name: catName });
            await AsyncStorage.setItem(`channels_${playlistId}_series_${cid}`, JSON.stringify(catChannels));
          } else if (lowerName.includes('movie') || lowerName.includes('cinema') || lowerName.includes('films') || lowerName.includes('افلام')) {
            vodCatsList.push({ id: cid, name: catName });
            await AsyncStorage.setItem(`channels_${playlistId}_vod_${cid}`, JSON.stringify(catChannels));
          } else {
            liveCatsList.push({ id: cid, name: catName });
            await AsyncStorage.setItem(`channels_${playlistId}_live_${cid}`, JSON.stringify(catChannels));
          }
        }
        
        const finalCategories: PlaylistCategories = {
          live: liveCatsList,
          vod: vodCatsList,
          series: seriesCatsList,
        };
        
        set((s) => ({
          activeCategories: finalCategories,
          playlists: s.playlists.map((p) =>
            p.id === playlistId
              ? { ...p, channels: parsedChannels.length, updated: 'Just now', lastUpdatedTimestamp: Date.now() }
              : p
          ),
        }));
        
        await AsyncStorage.setItem(`categories_${playlistId}`, JSON.stringify(finalCategories));
        await AsyncStorage.setItem('playlists', JSON.stringify(get().playlists));

        return { channels: parsedChannels.length };
      } catch (err: any) {
        const msg: string = err?.message ?? '';

        if (msg.startsWith('INVALID_CONTENT:')) {
          const preview = msg.substring('INVALID_CONTENT:'.length);
          lastError = new Error(
            `Server returned non-M3U data (possibly block page, check credentials).\n\n${preview}`
          );
          continue; // try next URL variant or proxy
        }

        if (msg.startsWith('SERVER_EMPTY:')) {
          const statusStr = msg.split(':')[1]?.split('\n')[0] ?? '?';
          const hint = msg.includes('\n') ? msg.substring(msg.indexOf('\n')) : '';
          lastError = new Error(
            `Server returned empty response (status ${statusStr}).${hint}\n\n` +
            `Possible causes:\n` +
            `• Wrong username/password\n` +
            `• Subscription expired\n` +
            `• Server blocked connection (IPTV providers often block React Native User-Agent)`
          );
          continue; // try next URL variant or proxy
        }

        if (msg === 'NETWORK_ERROR') {
          lastError = new Error(
            'Could not reach the server.\n• Check the URL/host is correct\n• Check your internet connection\n• Secure connection (HTTPS) may be required'
          );
          continue;
        }

        if (msg === 'TIMEOUT') {
          lastError = new Error('Connection timed out (30s). The server is too slow or unreachable.');
          continue;
        }

        if (msg === 'ABORTED') {
          lastError = new Error('Request was cancelled.');
          break;
        }

        // If it is another parse error or something else, throw it immediately
        throw err;
      }
    }

    throw lastError;
  },

  getChannelsForCategory: async (playlistId, type, categoryId, categoryName) => {
    console.log(`[getChannelsForCategory] Called for playlistId: ${playlistId}, type: ${type}, categoryId: ${categoryId}, categoryName: ${categoryName}`);
    if (playlistId === 'p1' || playlistId === 'p2' || playlistId === 'p3') {
      const filtered = MOCK_CHANNELS.filter(c => c.type === type && (c.category === categoryId || categoryId === 'All'));
      return filtered;
    }
    
    try {
      const cacheKey = `channels_${playlistId}_${type}_${categoryId}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (cached) {
        const parsed = JSON.parse(cached);
        console.log(`[getChannelsForCategory] Found cached channels in AsyncStorage. Count: ${parsed.length}`);
        return parsed;
      }
      
      const p = get().playlists.find(x => x.id === playlistId);
      const isXtream = p && (p.url.startsWith('xtream://') || p.url.includes('/get.php?'));
      
      if (isXtream) {
        let config: any = null;
        if (p.url.startsWith('xtream://')) {
          config = JSON.parse(base64Decode(p.url.replace('xtream://', '')));
        } else {
          const match = p.url.match(/^(https?:\/\/[^/]+)\/get\.php\?username=([^&]+)&password=([^&]+)/);
          if (match) {
            config = { host: match[1], username: match[2], password: match[3] };
          }
        }
        
        if (!config) {
          console.warn('[getChannelsForCategory] Failed to parse Xtream configuration from URL:', p.url);
          return [];
        }

        // Verify account first to prevent HTML errors on expired playlists
        try {
          const authUrl = `${config.host}/player_api.php?username=${config.username}&password=${config.password}`;
          const targetUrls = [
            authUrl,
            `https://corsproxy.io/?url=${encodeURIComponent(authUrl)}`,
            `https://api.allorigins.win/raw?url=${encodeURIComponent(authUrl)}`
          ];
          
          let authText = '';
          let authFetched = false;
          for (const u of targetUrls) {
            try {
              authText = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', u, true);
                xhr.timeout = 10000;
                xhr.onload = () => {
                  if (xhr.status >= 200 && xhr.status < 300) {
                    if (xhr.responseText) resolve(xhr.responseText);
                    else reject(new Error('Empty response'));
                  }
                  else reject(new Error(`Auth HTTP ${xhr.status}`));
                };
                xhr.onerror = () => reject(new Error('Auth Network error'));
                xhr.ontimeout = () => reject(new Error('Auth Timeout'));
                xhr.send();
              });
              authFetched = true;
              break;
            } catch (e) {
              // ignore and try next
            }
          }
          
          if (authFetched) {
            const authParsed = JSON.parse(authText);
            if (!authParsed || !authParsed.user_info || authParsed.user_info.auth === 0 || authParsed.user_info.status !== 'Active') {
              console.warn('[getChannelsForCategory] Account is invalid or expired. Silently returning empty array to avoid annoying errors.');
              
              get().showGlobalAlert('Subscription Expired', 'Your current subscription has expired. Please add a new valid playlist.', 'OK', () => { 
                get().hideGlobalAlert();
                const { router } = require('expo-router');
                router.replace('/playlists'); 
              });

              return []; // Silently return empty array to prevent UI crash/annoying errors
            }
          }
        } catch (e: any) {
          console.warn('[getChannelsForCategory] Auth check failed to parse (likely expired and returned HTML). Silently returning empty array.');
          return [];
        }
        
        let action = '';
        if (type === 'live') action = 'get_live_streams';
        else if (type === 'vod') action = 'get_vod_streams';
        else if (type === 'series') action = 'get_series';
        
        const fetchUrl = `${config.host}/player_api.php?username=${config.username}&password=${config.password}&action=${action}&category_id=${categoryId}`;
        console.log(`[getChannelsForCategory] Fetching streams from host: ${config.host}, url: ${fetchUrl}`);
        
        const targetUrls = [
          fetchUrl,
          `https://corsproxy.io/?url=${encodeURIComponent(fetchUrl)}`,
          `https://api.allorigins.win/raw?url=${encodeURIComponent(fetchUrl)}`
        ];
        
        let text = '';
        let fetched = false;
        for (let i = 0; i < targetUrls.length; i++) {
          const u = targetUrls[i];
          try {
            console.log(`[getChannelsForCategory] Fetching attempt ${i + 1}/${targetUrls.length} from: ${u}`);
            text = await new Promise((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              xhr.open('GET', u, true);
              xhr.timeout = 20000;
              xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                  if (xhr.responseText && xhr.responseText.trim().length > 0) resolve(xhr.responseText);
                  else reject(new Error(`Empty response, status: ${xhr.status}`));
                } else {
                  reject(new Error(`HTTP status error: ${xhr.status}`));
                }
              };
              xhr.onerror = () => reject(new Error('Network error'));
              xhr.ontimeout = () => reject(new Error('Timeout'));
              xhr.send();
            });
            console.log(`[getChannelsForCategory] Fetching succeeded from: ${u}. Response text sample (first 100 chars): ${text.substring(0, 100)}`);
            fetched = true;
            break;
          } catch (e: any) {
            console.warn(`[getChannelsForCategory] Failed fetching from ${u}: ${e.message || e}`);
          }
        }
        
        if (fetched) {
          const rawStreams = JSON.parse(text);
          console.log(`[getChannelsForCategory] Successfully parsed JSON. Raw streams length: ${Array.isArray(rawStreams) ? rawStreams.length : 'Not an array!'}`);
          const channelsList: Channel[] = [];
          if (Array.isArray(rawStreams)) {
            for (const item of rawStreams) {
              if (!item || !item.name) continue;
              
              let quality: '4K' | 'FHD' | 'HD' = 'HD';
              if (item.name.toUpperCase().includes('4K') || item.name.toUpperCase().includes('UHD')) {
                quality = '4K';
              } else if (item.name.toUpperCase().includes('FHD') || item.name.toUpperCase().includes('1080')) {
                quality = 'FHD';
              }
              
              if (type === 'live' && item.stream_id) {
                const streamUrl = `${config.host}/live/${config.username}/${config.password}/${item.stream_id}.m3u8`;
                const hasArchive = item.tv_archive === 1 || item.tv_archive === '1';
                const archiveDuration = parseInt(item.tv_archive_duration, 10) || 0;
                channelsList.push({
                  id: `xt_live_${item.stream_id}`,
                  name: item.name,
                  logo: item.stream_icon || '',
                  category: categoryName,
                  streamUrl,
                  current: 'Live Stream',
                  next: 'Upcoming Program',
                  quality,
                  isLive: true,
                  type: 'live',
                  hasArchive,
                  archiveDuration
                });
              } else if (type === 'vod' && item.stream_id) {
                const ext = item.container_extension || 'mp4';
                const streamUrl = `${config.host}/movie/${config.username}/${config.password}/${item.stream_id}.${ext}`;
                channelsList.push({
                  id: `xt_vod_${item.stream_id}`,
                  name: item.name,
                  logo: item.stream_icon || '',
                  category: categoryName,
                  streamUrl,
                  current: 'Movie',
                  next: 'VOD',
                  quality,
                  isLive: false,
                  type: 'vod'
                });
              } else if (type === 'series' && item.series_id) {
                const streamUrl = `${config.host}/series/${config.username}/${config.password}/${item.series_id}.m3u8`;
                channelsList.push({
                  id: `xt_series_${item.series_id}`,
                  name: item.name,
                  logo: item.cover || '',
                  category: categoryName,
                  streamUrl,
                  current: item.plot || 'TV Series',
                  next: 'Episodes Available',
                  quality: 'FHD',
                  isLive: false,
                  type: 'series'
                });
              }
            }
          } else {
            console.warn('[getChannelsForCategory] rawStreams is not an array, but type is:', typeof rawStreams);
          }
          
          console.log(`[getChannelsForCategory] Processed ${channelsList.length} channels. Live fetch successful.`);
          // Do not store in cache to prevent OOM crashes on TV bridge!
          return channelsList;
        } else {
          console.error('[getChannelsForCategory] All target URLs failed.');
          return [];
        }
      } else {
        console.warn(`[getChannelsForCategory] Playlist not found or not an Xtream Codes type. url: ${p?.url}`);
        return [];
      }
    } catch (e: any) {
      console.error('[getChannelsForCategory] Error in getChannelsForCategory:', e);
      return [];
    }
  },

  loadChannelsForCategory: async (playlistId, type, categoryId, categoryName) => {
    set({ loadingChannels: true });
    try {
      const channelsList = await get().getChannelsForCategory(playlistId, type, categoryId, categoryName);
      set({ channels: channelsList });
    } catch (e: any) {
      console.error('[loadChannelsForCategory] Error:', e);
      set({ channels: [] });
    } finally {
      set({ loadingChannels: false });
    }
  },

  getActiveChannels: (type) => {
    const activeId = get().activePlaylistId;
    if (activeId === 'p1' || activeId === 'p2' || activeId === 'p3') {
      return MOCK_CHANNELS.filter((c) => c.type === type);
    }
    return get().channels.filter((c) => c.type === type);
  },

  playbackQueue: [],
  playbackIndex: 0,
  setPlaybackQueue: (queue, index) => set({ playbackQueue: queue, playbackIndex: index }),
  setPlaybackIndex: (index) => set({ playbackIndex: index }),

  favorites: [],
  favoriteItems: [],
  toggleFavorite: (item) => {
    const favs = get().favorites;
    const items = get().favoriteItems || [];
    const id = item.id;
    let newFavs: string[];
    let newItems: Channel[];
    if (favs.includes(id)) {
      newFavs = favs.filter((f) => f !== id);
      newItems = items.filter((x) => x.id !== id);
    } else {
      newFavs = [...favs, id];
      newItems = [...items, item];
    }
    set({ favorites: newFavs, favoriteItems: newItems });
    AsyncStorage.setItem('favorites', JSON.stringify(newFavs));
    AsyncStorage.setItem('favoriteItems', JSON.stringify(newItems));
  },

  settings: {
    quality: 'Auto',
    forceHttp: false,
    notifications: true,
    parentalControl: false,
  },
  updateSettings: (s) =>
    set((state) => ({ settings: { ...state.settings, ...s } })),

  initializeFromStorage: async () => {
    try {
      const storedUser = await AsyncStorage.getItem('user');
      const storedFavs = await AsyncStorage.getItem('favorites');
      const storedFavItems = await AsyncStorage.getItem('favoriteItems');
      const storedSettings = await AsyncStorage.getItem('settings');
      const storedContinueWatching = await AsyncStorage.getItem('continueWatching');
      const storedDownloads = await AsyncStorage.getItem('downloads');

      const updates: Partial<AppState> = {};

      if (storedUser) {
        updates.isLoggedIn = true;
        updates.user = JSON.parse(storedUser);
      }
      if (storedFavs) updates.favorites = JSON.parse(storedFavs);
      if (storedFavItems) updates.favoriteItems = JSON.parse(storedFavItems);
      if (storedSettings) updates.settings = { ...get().settings, ...JSON.parse(storedSettings) };
      if (storedContinueWatching) updates.continueWatching = JSON.parse(storedContinueWatching);
      if (storedDownloads) updates.downloads = JSON.parse(storedDownloads);

      set(updates as any);

      const playlistsStr = await AsyncStorage.getItem('playlists');
      let loadedPlaylists: Playlist[] = [];
      if (playlistsStr) {
        loadedPlaylists = JSON.parse(playlistsStr).filter((p: any) => !p.isDemo);
        set({ playlists: loadedPlaylists });
      } else {
        set({ playlists: [] });
      }

      const activeId = await AsyncStorage.getItem('activePlaylistId');
      let finalActiveId = '';
      if (activeId && loadedPlaylists.some(p => p.id === activeId)) {
        finalActiveId = activeId;
        set({ activePlaylistId: activeId });
        const cachedCats = await AsyncStorage.getItem(`categories_${activeId}`);
        if (cachedCats) set({ activeCategories: JSON.parse(cachedCats) });
      } else if (loadedPlaylists.length > 0) {
        const fallbackId = loadedPlaylists[0].id;
        finalActiveId = fallbackId;
        set({ activePlaylistId: fallbackId });
        await AsyncStorage.setItem('activePlaylistId', fallbackId);
        const cachedCats = await AsyncStorage.getItem(`categories_${fallbackId}`);
        if (cachedCats) set({ activeCategories: JSON.parse(cachedCats) });
      } else {
        set({ activePlaylistId: '', activeCategories: null });
      }

      // Auto-load search index for active playlist on start
      if (finalActiveId) {
        try {
          await get().loadSearchIndex(finalActiveId);
          if (globalSearchIndex.length === 0) {
            get().buildSearchIndex(finalActiveId).catch(() => {});
          }
        } catch (err) {
          console.error('[initializeFromStorage] Failed loading search index:', err);
        }
      }

      const favsStr = await AsyncStorage.getItem('favorites');
      if (favsStr) set({ favorites: JSON.parse(favsStr) });
      const itemsStr = await AsyncStorage.getItem('favoriteItems');
      if (itemsStr) set({ favoriteItems: JSON.parse(itemsStr) ?? [] });

      const cwStr = await AsyncStorage.getItem('continueWatching');
      if (cwStr) set({ continueWatching: JSON.parse(cwStr) ?? [] });
    } catch (e) {
      console.error('Failed to load store', e);
    }
  },

  getChannelsByType: async (type) => {
    return globalSearchIndex.filter(item => item.type === type);
  },

  loadSearchIndex: async (playlistId) => {
    if (!playlistId) {
      globalSearchIndex = [];
      set({ searchIndexReady: false });
      return;
    }
    set({ loadingSearchIndex: true });
    try {
      // We no longer read a massive single search_index. 
      // We build it in memory from chunks.
      await get().buildSearchIndex(playlistId);
    } catch (e) {
      console.error('Failed to load search index', e);
      globalSearchIndex = [];
      set({ searchIndexReady: false, loadingSearchIndex: false });
    }
  },

    buildSearchIndex: async (playlistId, onProgress) => {
    set({ loadingSearchIndex: true, searchIndexReady: false });
    onProgress?.('Building search index...');
    
    try {
      let tempIndex = [];
      const playlist = get().playlists.find(x => x.id === playlistId);
      const isXtream = playlist && (playlist.url.startsWith('xtream://') || playlist.url.includes('/get.php?'));
      
      if (isXtream) {
        // Xtream Codes API: fetch all streams from server
        let config = null;
        if (playlist.url.startsWith('xtream://')) {
          config = JSON.parse(atob(playlist.url.replace('xtream://', '')));
        } else {
          const match = playlist.url.match(/^(https?:\/\/[^/]+)\/get\.php\?username=([^&]+)&password=([^&]+)/);
          if (match) config = { host: match[1], username: match[2], password: match[3] };
        }
        
        if (config) {
          const catMap = new Map();
          const categories = get().activeCategories;
          if (categories) {
            for (const t of ['live', 'vod', 'series']) {
              for (const cat of (categories[t as keyof PlaylistCategories] || [])) {
                catMap.set(String(cat.id), cat.name);
              }
            }
          }
          const actions = [
            { action: 'get_live_streams', type: 'live', name: 'Live TV' },
            { action: 'get_vod_streams', type: 'vod', name: 'Movies' },
            { action: 'get_series', type: 'series', name: 'Series' }
          ];
          
          for (const a of actions) {
            onProgress?.(`Fetching ${a.name} database...`);
            try {
              const url = `${config.host}/player_api.php?username=${config.username}&password=${config.password}&action=${a.action}`;
              const res = await fetch(url);
              const data = await res.json();
              if (Array.isArray(data)) {
                for (const item of data) {
                  if (!item || !item.name) continue;
                  let quality = 'HD';
                  if (item.name.toUpperCase().includes('4K') || item.name.toUpperCase().includes('UHD')) quality = '4K';
                  else if (item.name.toUpperCase().includes('FHD') || item.name.toUpperCase().includes('1080')) quality = 'FHD';
                  
                  let streamUrl = '';
                  let id = '';
                  let logo = '';
                  
                  if (a.type === 'live' && item.stream_id) {
                    streamUrl = `${config.host}/live/${config.username}/${config.password}/${item.stream_id}.m3u8`;
                    id = `xt_live_${item.stream_id}`;
                    logo = item.stream_icon || '';
                  } else if (a.type === 'vod' && item.stream_id) {
                    const ext = item.container_extension || 'mp4';
                    streamUrl = `${config.host}/movie/${config.username}/${config.password}/${item.stream_id}.${ext}`;
                    id = `xt_vod_${item.stream_id}`;
                    logo = item.stream_icon || '';
                  } else if (a.type === 'series' && item.series_id) {
                    streamUrl = `${config.host}/series/${config.username}/${config.password}/${item.series_id}.m3u8`;
                    id = `xt_series_${item.series_id}`;
                    logo = item.cover || '';
                  }
                  
                  if (id) {
                    tempIndex.push({
                      id,
                      name: item.name,
                      type: a.type,
                      logo,
                      category: catMap.get(String(item.category_id)) || item.category_name || (item.name ? item.name.split(/[:|-]/)[0].trim() : 'Unknown'),
                      streamUrl,
                      current: a.type === 'live' ? 'Live Stream' : (a.type === 'vod' ? 'Movie' : (item.plot || 'TV Series')),
                      next: '',
                      quality,
                      isLive: a.type === 'live'
                    });
                  }
                }
              }
            } catch (e) {
              console.warn(`Failed fetching ${a.action} for search index`, e);
            }
          }
        }
      } else {
        // Standard M3U: read from local chunks
        const catsJson = await AsyncStorage.getItem(`categories_${playlistId}`);
        if (catsJson) {
          const categories = JSON.parse(catsJson);
          const types = ['live', 'vod', 'series'];
          
          for (const type of types) {
            const typeCats = categories[type] || [];
            for (const cat of typeCats) {
              const chunkJson = await AsyncStorage.getItem(`channels_${playlistId}_${type}_${cat.id}`);
              if (chunkJson) {
                const chunk = JSON.parse(chunkJson);
                for (const c of chunk) {
                  tempIndex.push({
                    id: c.id,
                    name: c.name,
                    type: c.type,
                    logo: c.logo,
                    category: c.category,
                    streamUrl: c.streamUrl,
                    current: c.current || '',
                    next: c.next || '',
                    quality: c.quality || 'Auto',
                    isLive: c.type === 'live'
                  });
                }
              }
            }
          }
        }
      }
      
      globalSearchIndex = tempIndex;
      set({ searchIndexReady: true, loadingSearchIndex: false });
      onProgress?.('Search index ready!');
    } catch (e) {
      console.error('Failed to build search index:', e);
      globalSearchIndex = [];
      set({ searchIndexReady: false, loadingSearchIndex: false });
      onProgress?.('Failed to build index.');
    }
  },
}));