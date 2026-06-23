export interface Channel {
  id: string;
  name: string;
  logo: string;
  category: string;
  streamUrl: string;
  current: string;
  next: string;
  quality: '4K' | 'FHD' | 'HD';
  isLive: boolean;
  type: 'live' | 'vod' | 'series';
  hasArchive?: boolean;
  archiveDuration?: number;
}

export interface Playlist {
  id: string;
  name: string;
  url: string;
  channels: number;
  updated: string;
  lastUpdatedTimestamp: number;
  isDemo?: boolean;
}

export interface Movie {
  id: string;
  title: string;
  poster: string;
  backdrop: string;
  rating: number;
  year: number;
  duration: string;
  quality: '4K' | 'FHD' | 'HD';
  genres: string[];
  description: string;
  streamUrl: string;
}

export interface Series {
  id: string;
  title: string;
  poster: string;
  backdrop: string;
  rating: number;
  year: number;
  seasons: number;
  genres: string[];
  description: string;
  episodes: SeriesEpisode[];
}

export interface SeriesEpisode {
  id: string;
  season: number;
  number: number;
  title: string;
  duration: string;
  thumbnail: string;
  streamUrl: string;
}

export interface FeaturedHero {
  id: string;
  title: string;
  subtitle: string;
  backdrop: any;
  description: string;
  rating: number;
  year: number;
  duration: string;
  genres: string[];
  streamUrl?: string;
  originalItem?: Channel;
}
