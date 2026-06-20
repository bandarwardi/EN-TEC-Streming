import { base64Decode } from './base64';

// Mock Xtream Codes API
export const xtreamApi = {
  getServerInfo: async (host: string, username: string, password: string) => {
    return { user_info: { status: 'Active', exp_date: '2025-12-31' } };
  },
  getCategories: async (host: string, username: string, password: string, type: 'live' | 'vod' | 'series') => {
    return [{ category_id: "1", category_name: "General" }];
  },
  getStreams: async (host: string, username: string, password: string, type: 'live' | 'vod' | 'series', categoryId: string) => {
    return [];
  },
  buildStreamUrl: (host: string, username: string, password: string, streamId: string | number, type: 'live' | 'vod' | 'series') => {
    const typePath = type === 'live' ? 'live' : type === 'vod' ? 'movie' : 'series';
    return `${host}/${typePath}/${username}/${password}/${streamId}.m3u8`;
  },
  getSeriesInfo: async (host: string, username: string, password: string, seriesId: string | number) => {
    return { info: {}, episodes: { "1": [] } };
  },
  parseCredential: (url: string) => {
    try {
      const b64 = url.replace('xtream://', '');
      return JSON.parse(base64Decode(b64));
    } catch {
      return null;
    }
  }
};