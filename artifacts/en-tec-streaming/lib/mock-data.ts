import { Channel, Playlist, Movie, Series, FeaturedHero } from '../types';

export const MOCK_HEROES: FeaturedHero[] = [
  { id: 'h1', title: 'Karuppu 2026', subtitle: 'ACTION', backdrop: require('../assets/images/hero3.png'), description: 'The ultimate Tamil action saga...', rating: 8.7, year: 2026, duration: '2h 41m', genres: ['Action', 'Drama'] },
  { id: 'h2', title: 'FIFA World Cup 2026', subtitle: 'LIVE · SPORTS', backdrop: require('../assets/images/hero1.png'), description: 'The greatest tournament on Earth...', rating: 9.5, year: 2026, duration: 'LIVE', genres: ['Sports', 'Live'] },
  { id: 'h3', title: 'Dune: Part Two', subtitle: 'SCI-FI', backdrop: require('../assets/images/hero2.png'), description: 'Paul Atreides unites with Chani...', rating: 8.8, year: 2024, duration: '2h 46m', genres: ['Sci-Fi', 'Adventure'] }
];

export const MOCK_PLAYLISTS: Playlist[] = [
  { id: 'p1', name: 'My Main Playlist', url: 'demo://main', channels: 16881, updated: '2 hours ago', lastUpdatedTimestamp: Date.now(), isDemo: true },
  { id: 'p2', name: 'Sports Pack 4K', url: 'demo://sports', channels: 348, updated: '4 hours ago', lastUpdatedTimestamp: Date.now(), isDemo: true },
  { id: 'p3', name: 'Arabic Bundle', url: 'demo://arabic', channels: 1245, updated: '1 day ago', lastUpdatedTimestamp: Date.now(), isDemo: true }
];

const channelNames = [
  'FOX Sports 1', 'BeIN Sports 4K', 'Sky Sports F1', 'ESPN', 'Al Jazeera', 
  'CNN International', 'BBC News', 'MBC 4K', 'MBC 1', 'Rotana Cinema', 
  'Dubai TV', 'MBC Action', 'MBC Max', 'HBO', 'Cartoon Network', 
  'Disney Channel', 'Nickelodeon', 'Boomerang', 'NatGeo Wild', 
  'Discovery Channel', 'MTV Live', 'Netflix Live'
];

export const MOCK_CHANNELS: Channel[] = channelNames.map((name, i) => ({
  id: `c${i}`,
  name,
  logo: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1A1A1A&color=D4A843&bold=true&size=128&format=svg`,
  category: i < 4 ? 'Sports' : i < 7 ? 'News' : i < 11 ? 'Arabic' : i < 14 ? 'Movies' : i < 18 ? 'Kids' : i < 20 ? 'Documentaries' : i < 21 ? 'Music' : 'Entertainment',
  streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  current: 'Premier League Highlights',
  next: 'Live Match',
  quality: i % 3 === 0 ? '4K' : i % 2 === 0 ? 'FHD' : 'HD',
  isLive: true,
  type: 'live'
}));

export const MOCK_MOVIES: Movie[] = Array.from({ length: 15 }).map((_, i) => ({
  id: `m${i}`,
  title: `Mock Movie ${i}`,
  poster: `https://images.unsplash.com/photo-${1000 + i}?w=300&h=450&fit=crop`,
  backdrop: `https://images.unsplash.com/photo-${1000 + i}?w=800&h=450&fit=crop`,
  rating: 7 + (i % 3),
  year: 2020 + (i % 5),
  duration: '2h 15m',
  quality: '4K',
  genres: i % 3 === 0 ? ['Action', 'Drama'] : i % 2 === 0 ? ['Sci-Fi'] : ['Comedy'],
  description: 'An amazing mock movie for testing.',
  streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
}));

export const MOCK_SERIES: Series[] = Array.from({ length: 10 }).map((_, i) => ({
  id: `s${i}`,
  title: `Mock Series ${i}`,
  poster: `https://images.unsplash.com/photo-${2000 + i}?w=300&h=450&fit=crop`,
  backdrop: `https://images.unsplash.com/photo-${2000 + i}?w=800&h=450&fit=crop`,
  rating: 8.5,
  year: 2023,
  seasons: 3,
  genres: ['Drama'],
  description: 'A great series.',
  episodes: Array.from({ length: 5 }).map((_, j) => ({
    id: `e${i}-${j}`,
    season: 1,
    number: j + 1,
    title: `Episode ${j + 1}`,
    duration: '45m',
    thumbnail: `https://images.unsplash.com/photo-${3000 + i + j}?w=300&h=170&fit=crop`,
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
  }))
}));
