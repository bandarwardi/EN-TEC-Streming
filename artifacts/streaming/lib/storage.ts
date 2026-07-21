import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const CACHE_DIR = FileSystem.documentDirectory + 'app_cache/';
let isInit = false;

// --- Web Fallback to Express API ---
const idbWrite = async (key: string, data: string) => {
  try {
    await fetch('/api/cache/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, data })
    });
  } catch (e) {
    console.error('API cache write failed:', e);
  }
};

const idbRead = async (key: string): Promise<string | null> => {
  try {
    const res = await fetch(`/api/cache/read?key=${encodeURIComponent(key)}`);
    if (res.ok) {
      return await res.text();
    }
    return null;
  } catch (e) {
    console.error('API cache read failed:', e);
    return null;
  }
};

const idbDelete = async (key: string) => {
  try {
    await fetch(`/api/cache/delete?key=${encodeURIComponent(key)}`, { method: 'DELETE' });
  } catch (e) {
    console.error('API cache delete failed:', e);
  }
};
// ----------------------------------

export const initCache = async () => {
  if (Platform.OS === 'web') return;
  if (isInit) return;
  const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
  isInit = true;
};

export const writeCacheString = async (key: string, text: string) => {
  try {
    if (Platform.OS === 'web') {
      await idbWrite(key, text);
      return;
    }
    await initCache();
    const uri = CACHE_DIR + key + '.json';
    await FileSystem.writeAsStringAsync(uri, text);
  } catch (e) {
    console.error(`[writeCacheString] Failed to write ${key}:`, e);
  }
};

export const writeCache = async (key: string, data: any) => {
  try {
    if (Platform.OS === 'web') {
      await idbWrite(key, JSON.stringify(data));
      return;
    }
    await initCache();
    const uri = CACHE_DIR + key + '.json';
    await FileSystem.writeAsStringAsync(uri, JSON.stringify(data));
  } catch (e) {
    console.error(`[writeCache] Failed to write ${key}:`, e);
  }
};

export const readCacheString = async (key: string): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      return await idbRead(key);
    }
    await initCache();
    const uri = CACHE_DIR + key + '.json';
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return null;
    return await FileSystem.readAsStringAsync(uri);
  } catch (e) {
    console.error(`[readCacheString] Failed to read ${key}:`, e);
    return null;
  }
};

export const readCache = async <T>(key: string): Promise<T | null> => {
  try {
    if (Platform.OS === 'web') {
      const text = await idbRead(key);
      return text ? JSON.parse(text) as T : null;
    }
    await initCache();
    const uri = CACHE_DIR + key + '.json';
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return null;
    const text = await FileSystem.readAsStringAsync(uri);
    return JSON.parse(text) as T;
  } catch (e) {
    console.error(`[readCache] Failed to read ${key}:`, e);
    return null;
  }
};

export const deleteCache = async (key: string) => {
  try {
    if (Platform.OS === 'web') {
      await idbDelete(key);
      return;
    }
    await initCache();
    const uri = CACHE_DIR + key + '.json';
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch (e) {}
};
