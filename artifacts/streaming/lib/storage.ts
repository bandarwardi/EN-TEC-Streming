import * as FileSystem from 'expo-file-system';

const CACHE_DIR = FileSystem.documentDirectory + 'app_cache/';

let isInit = false;

export const initCache = async () => {
  if (isInit) return;
  const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
  isInit = true;
};

export const writeCacheString = async (key: string, text: string) => {
  try {
    await initCache();
    const uri = CACHE_DIR + key + '.json';
    await FileSystem.writeAsStringAsync(uri, text);
  } catch (e) {
    console.error(`[writeCacheString] Failed to write ${key}:`, e);
  }
};

export const writeCache = async (key: string, data: any) => {
  try {
    await initCache();
    const uri = CACHE_DIR + key + '.json';
    await FileSystem.writeAsStringAsync(uri, JSON.stringify(data));
  } catch (e) {
    console.error(`[writeCache] Failed to write ${key}:`, e);
  }
};

export const readCacheString = async (key: string): Promise<string | null> => {
  try {
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
    await initCache();
    const uri = CACHE_DIR + key + '.json';
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch (e) {}
};
