# React Native IPTV Streaming App — Full Build Prompt

> **Project Name**: EN TEC Streaming  
> **Platform**: React Native (Expo or bare workflow)  
> **Target**: Android & iOS (Phone, Tablet, Android TV)  
> **Language**: TypeScript  

---

## 1. Project Overview

Build a premium, dark-themed IPTV streaming app using **React Native** and **TypeScript**. The app allows users to:
- Add IPTV playlists via **M3U URL**, **M3U file upload**, or **Xtream Codes API** credentials.
- Browse live TV channels, VOD movies, and TV series organized by categories.
- Stream video content using a **native media player** that supports H.264, H.265/HEVC, MKV, TS, and HLS (.m3u8) formats.
- Persist playlists and channel data locally with offline caching.

> **CRITICAL**: This is a **native** app. There are NO CORS restrictions, NO mixed content blocks, NO browser codec limitations. All HTTP requests go directly to IPTV servers without any proxy. The native video player handles ALL codecs natively.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | React Native with TypeScript |
| **Navigation** | React Navigation v7 (Bottom Tabs + Stack Navigator) |
| **State Management** | Zustand |
| **Local Storage** | AsyncStorage (for settings/playlists metadata) |
| **Local Database** | react-native-mmkv or WatermelonDB (for large channel lists cache) |
| **Video Player** | `react-native-vlc-media-player` (supports H.265, MKV, TS, HLS, RTMP, etc.) |
| **HTTP Client** | `fetch` (native, no CORS issues) or `axios` |
| **Icons** | `lucide-react-native` or `react-native-vector-icons` |
| **Fonts** | Inter (from Google Fonts, loaded via `expo-font` or `react-native-google-fonts`) |
| **Toast/Notifications** | `react-native-toast-message` |
| **File Picker** | `react-native-document-picker` (for M3U file import) |

---

## 3. Design System & Theme

The app uses a **dark-only** theme. All colors use the following palette:

```typescript
const theme = {
  colors: {
    background: '#0A0A0A',       // Main app background
    foreground: '#FAFAFA',       // Primary text
    surface: '#1A1A1A',          // Cards, containers
    surface2: '#2A2A2A',         // Elevated surfaces, inputs
    card: '#1A1A1A',             // Card background
    primary: '#D4A843',          // Warm gold (oklch 0.78 0.16 70)
    primaryForeground: '#1A1A1A',// Text on primary
    accent: '#5B7FFF',           // Electric blue
    muted: '#333333',            // Muted backgrounds
    mutedForeground: '#999999',  // Secondary text
    border: '#2E2E2E',           // Borders, dividers
    input: '#2A2A2A',            // Input background
    destructive: '#E53935',      // Red for delete/errors
    gold: '#D4A843',             // Gold accent
    live: '#E53935',             // Live badge red
  },
  gradients: {
    gold: ['#D4A843', '#A67C2E'],  // Gold gradient (for buttons)
    hero: ['transparent', 'rgba(10,10,10,0.4)', '#0A0A0A'], // Hero overlay
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  borderRadius: { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, full: 9999 },
  fontFamily: {
    regular: 'Inter-Regular',
    medium: 'Inter-Medium',
    semibold: 'Inter-SemiBold',
    bold: 'Inter-Bold',
    black: 'Inter-Black',
  },
  shadows: {
    glow: { shadowColor: '#D4A843', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 12 },
    card: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.6, shadowRadius: 15, elevation: 8 },
  },
};
```

### Typography Rules:
- Page titles: `28px`, `black` weight
- Section headers: `18px`, `bold`
- Card titles: `14px`, `bold`
- Body text: `14px`, `regular`
- Caption/meta: `11px`, `medium`, `mutedForeground` color
- All text is **white** on dark backgrounds.

### Component Style Rules:
- All cards: `borderRadius: 16`, `border: 1px solid border`, `backgroundColor: surface`
- Active/selected items: `border: 1px solid primary`, `backgroundColor: primary/10%` (with subtle gold glow shadow)
- Buttons with gold gradient: `LinearGradient` from `#D4A843` to `#A67C2E`, text is `black`, `bold`, `borderRadius: 12`
- Inputs: `backgroundColor: surface2`, `borderRadius: 12`, `border: 1px solid border`, `paddingHorizontal: 16`, `paddingVertical: 12`
- Glassmorphic overlays: `backgroundColor: rgba(10,10,10,0.6)` with blur effect (use `@react-native-community/blur`)

---

## 4. Data Models

```typescript
// Channel (used for Live TV, VOD Movies, and Series)
interface Channel {
  id: string;
  name: string;
  logo: string;        // URL to channel logo/poster
  category: string;    // Category name
  streamUrl: string;   // Direct stream URL (empty for series containers)
  current: string;     // Current program / "Movie" / "TV Series"
  next: string;        // Next program / "VOD" / "Episodes Available"
  quality: '4K' | 'FHD' | 'HD';
  isLive: boolean;
}

// Playlist (user-added IPTV source)
interface Playlist {
  id: string;
  name: string;
  url: string;           // M3U URL, "local://filename", or "xtream://base64config"
  channels: number;      // Total channel/category count
  updated: string;       // Human-readable last update time
  lastUpdatedTimestamp?: number; // Unix ms
}

// Categories structure (for Xtream and M3U playlists)
interface PlaylistCategories {
  live: { id: string; name: string }[];
  vod: { id: string; name: string }[];
  series: { id: string; name: string }[];
}

// Series episode
interface SeriesEpisode {
  id: string;
  number: number;
  title: string;
  duration: string;
  thumbnail: string;
  streamUrl?: string;
}

// Movie detail (for demo/mock data)
interface Movie {
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
  cast: { name: string; avatar: string }[];
}

// Featured Hero item (for home page carousel)
interface FeaturedHero {
  id: string;
  title: string;
  subtitle: string;
  backdrop: string;
  description: string;
  rating: number;
  year: number;
  duration: string;
  genres: string[];
}
```

---

## 5. Navigation Structure

```
BottomTabNavigator (5 tabs):
├── HomeStack
│   ├── HomeScreen
│   └── PlayerScreen (push)
├── LiveStack
│   ├── LiveScreen (categories sidebar + channel grid)
│   └── PlayerScreen (push)
├── MoviesStack
│   ├── MoviesScreen (categories sidebar + movie grid)
│   ├── MovieDetailScreen (push)
│   └── PlayerScreen (push)
├── SeriesStack
│   ├── SeriesScreen (categories sidebar + series grid)
│   ├── SeriesDetailScreen (push, shows episodes)
│   └── PlayerScreen (push)
└── SettingsStack
    ├── SettingsScreen
    └── PlaylistsScreen (push)

LoginScreen (shown before tabs if not logged in)
PlayerScreen (full-screen, hides tab bar)
```

### Bottom Tab Bar Design:
- Background: `background` color with 95% opacity + blur
- 5 tabs: **Home** (🏠), **Live TV** (📺), **Movies** (🎬), **Series** (📁), **Settings** (⚙️)
- Active tab icon: `primary` gold color with a subtle glow container (`backgroundColor: primary/15%`, `borderRadius: 12`)
- Inactive tab icon: `mutedForeground` color
- Tab labels: `11px`, `medium` weight
- Safe area inset at bottom

---

## 6. Screen Specifications

### 6.1 Login Screen
- Background: dark with two subtle radial gradient blurs (gold at top-left 20%, blue at bottom-right 80%)
- Centered card (`glassmorphic` style: semi-transparent background + blur + subtle white border)
- Logo at top center
- Title: "Welcome back" (24px bold), subtitle: "Sign in to start streaming in 4K." (14px muted)
- **Tab switcher** between "Sign In" and "M3U Playlist" (pill-style toggle, active tab has gold background)
- **Sign In tab**: Email input (with Mail icon), Password input (with Lock icon), "Sign In" gold gradient button, OR divider, "Continue with Google" button
- **M3U Playlist tab**: URL input (with Link icon), Name input (optional), "Load Playlist" gold gradient button
- "Continue as Guest →" link at bottom

### 6.2 Home Screen
- **Header**: Hamburger menu button (left), Logo (left), Search button (right), Bell/notification button (right)
- **Hero Carousel** (70% of screen height):
  - Auto-rotates every 6 seconds through 3 featured items
  - Full-bleed backdrop image with gradient overlay (transparent → 40% dark → solid dark)
  - Bottom overlay content: subtitle (gold, uppercase, 12px tracking-widest), title (36px black weight), meta row (⭐ rating, year, duration, genres separated by " · "), description (14px, 2-line clamp), action buttons row (Play button with white bg, My List button with transparent bg + border, Info icon button), dot indicators
- **Content Rows** (horizontal scroll):
  - Row 1 "Continue Watching": Landscape cards (aspect 16:9), 160px wide, with progress bar at bottom
  - Row 2 "Popular Channels": Square cards (128px), channel logo, LIVE badge (top-left red pill), channel name + current program below
  - Row 3 "Recently Added": Portrait poster cards (aspect 2:3), 128px wide, quality badge (top-right), rating badge (bottom-left with ⭐)
- Each row has: section title (18px bold, left) + "See all →" link (right, muted)

### 6.3 Live TV Screen
- **Header**: Back button (circle), "Live TV" title (24px black), selected category subtitle (12px muted)
- **Layout**: Two-column layout (on tablet/landscape: left sidebar for categories, right for channel grid; on phone portrait: categories as horizontal scroll at top, grid below)
- **Categories panel**:
  - Search input at top ("Search categories…")
  - Scrollable list of category pills/buttons
  - Active category: gold bg, white text, glow shadow
  - Inactive: surface bg, muted text, border
- **Channel Grid** (2 columns on phone, 3-4 on tablet):
  - Search input ("Search channels in {category}…")
  - Each card: channel logo (48px rounded square, top-left), LIVE badge (top-right), channel name (14px bold, truncated), current program (11px muted, "▶ ..."), next program (11px muted/70, "→ ..."), quality badge (bottom)
  - Active card (on press): border becomes gold, subtle glow
  - Skeleton loading state: animated shimmer placeholders (12 cards)
  - Empty state: icon + "No channels found" message
  - **Infinite scroll / Pagination**: Load 60 items initially, load 60 more on scroll to bottom (use FlatList `onEndReached`)
- Tapping a channel opens PlayerScreen

### 6.4 Movies Screen
- Same layout as Live TV but for VOD content
- Category sidebar fetches VOD categories
- **Demo mode** (when using demo playlists): shows seed movies with genre filter pills at top (All, Action, Drama, Comedy, Sci-Fi, Thriller, Adventure)
- Movie cards: portrait poster (2:3 aspect), quality badge (top-right), rating badge with ⭐ (bottom-left), title below, year + duration text
- Tapping a movie card navigates to **MovieDetailScreen**

### 6.5 Movie Detail Screen
- Full-bleed backdrop image (top 60% of screen) with gradient overlay
- Back button (top-left, rounded circle with dark blur bg)
- Poster image (208px wide, 2:3 aspect, rounded-2xl with border + shadow)
- Title (30px black weight), meta row (year, duration, ⭐ rating badge), description, genres pill
- Action buttons: "Watch Now" (play icon, gold gradient), "Add to Favorite" (heart icon)
- **Cast section**: horizontal scroll of circular avatar images with name below

### 6.6 Series Screen
- Same category + grid layout as Movies, but fetches `series` categories
- Series cards: poster image (2:3 aspect), series name, season count
- Tapping navigates to **SeriesDetailScreen**

### 6.7 Series Detail Screen
- Same layout as Movie Detail
- Title format: "NF — {title} ({year})"
- Meta: year, season count, rating
- Action buttons: "Watch Now", "Trailer Series", "Add to Favorite"
- **Episodes section** below:
  - "Current Episode" (first episode): landscape card with play overlay, season/episode label, title, duration, description
  - "Upcoming Episodes": horizontal scroll of landscape episode cards (224px wide), play overlay, S1·E{n} and duration labels, title below
- **For Xtream series**: Fetch real episodes from `get_series_info` API. Build stream URLs as: `{host}/series/{username}/{password}/{episode_id}.m3u8`

### 6.8 Player Screen (Full-Screen Video Player)
- **Full-screen**, status bar hidden, tab bar hidden, landscape orientation supported
- Video player: use `react-native-vlc-media-player` (or `react-native-video` with native decoders)
  - Supports: HLS (.m3u8), MPEG-TS (.ts), MP4, MKV, H.264, **H.265/HEVC**, FLV, RTMP
  - No CORS proxy needed. Direct HTTP/HTTPS requests to IPTV servers.
  - Disable TLS certificate verification for self-signed certs on IPTV servers.
- **Controls overlay** (auto-hide after 4 seconds, show on tap):
  - **Top bar**: Back button, title text, action icons (Info, Heart/Favorite, Subtitles, Audio Track, Cast, PiP)
  - **Side rails**: Brightness slider (left, vertical), Volume slider (right, vertical)
  - **Center**: Rewind 10s button, large Play/Pause button (rounded, blur bg), Forward 10s button
  - **Bottom bar (Live mode)**: category label, channel name with LIVE tag, current → next program, LIVE badge, quality label
  - **Bottom bar (VOD mode)**: time elapsed / total time, seekbar (gold progress bar with draggable thumb + glow), title, subtitle
  - Quality selector popup (Auto, 4K, 1080p, 720p)
  - Live mode: "Channels" button → slide-in side panel with channel list for quick switching
- **Error handling overlay**: When playback fails, show overlay with:
  - Shield icon (pulsing red)
  - Arabic error text: "عذرًا، تعذر تشغيل البث"
  - Stream URL displayed in monospace
  - "فتح رابط البث مباشرةً" button (opens URL externally)
  - "نسخ رابط البث" button (copies to clipboard)
  - "إعادة المحاولة" retry link

### 6.9 Settings Screen
- **Account section**: avatar circle (gold gradient bg with first letter), name, email, plan badge ("Premium 4K" with crown icon, gold gradient pill)
- **Player section**: Default Quality (Auto/4K/1080p/720p toggle), Subtitles (English/Arabic/Off toggle), Force HTTP toggle
- **App section**: Playlists (→ navigate to PlaylistsScreen, shows count), Notifications toggle, Parental Control toggle
- **Subscription section**: Current Plan display
- **About section**: App Version, Device Key
- **Sign Out button**: red border, destructive style

### 6.10 Playlists Screen
- **Header**: Back button, "Playlists" title, "Add" gold gradient button
- **Playlist list**: each playlist is a card with:
  - Name (bold), URL (monospace, truncated, for Xtream show "{host} (User: {username})"), channel count + last updated
  - Active playlist: gold border, gold tinted bg, green checkmark icon
  - Refresh button (except for local files), Delete button (except for demo playlists p1/p2/p3)
  - Tap to set as active playlist
- **Add Playlist Modal** (bottom sheet):
  - Tab switcher: "M3U URL" / "M3U File" / "Xtream Codes"
  - **M3U URL tab**: Name input, URL input, Cancel/Add buttons
  - **M3U File tab**: Name input, file picker (drag-drop area with Upload icon), Cancel/Import buttons
  - **Xtream Codes tab**: Warning notice ("IPTV accounts can get banned for frequent queries. Backend will cache category lists, streams, and series for 12 hours."), Name input, Host URL input, Username input, Password input, Cancel/Add buttons
  - Gold gradient submit buttons, loading states

### 6.11 Catch-Up Screen (placeholder)
- "Catch Up" title, subtitle "Review previously aired content"
- Timeline items for demo (time, title, description, Watch button)

---

## 7. API Integration (Xtream Codes)

All requests are direct HTTP (no proxy needed in native).

### 7.1 Authentication / Server Info
```
GET {host}/player_api.php?username={user}&password={pass}
```
Returns account info, expiry, allowed connections.

### 7.2 Fetch Categories
```
GET {host}/player_api.php?username={user}&password={pass}&action=get_live_categories
GET {host}/player_api.php?username={user}&password={pass}&action=get_vod_categories
GET {host}/player_api.php?username={user}&password={pass}&action=get_series_categories
```
Each returns: `[{ "category_id": "1", "category_name": "Sports" }, ...]`

### 7.3 Fetch Streams by Category
```
GET {host}/player_api.php?username={user}&password={pass}&action=get_live_streams&category_id={id}
GET {host}/player_api.php?username={user}&password={pass}&action=get_vod_streams&category_id={id}
GET {host}/player_api.php?username={user}&password={pass}&action=get_series&category_id={id}
```

### 7.4 Stream URL Construction
- **Live**: `{host}/live/{username}/{password}/{stream_id}.m3u8`
- **VOD**: `{host}/movie/{username}/{password}/{stream_id}.m3u8`
- **Series Episode**: `{host}/series/{username}/{password}/{episode_id}.m3u8`

> Use `.m3u8` extension to force HLS streaming mode (avoids MP4 MOOV atom issues and MKV container issues)

### 7.5 Series Info
```
GET {host}/player_api.php?username={user}&password={pass}&action=get_series_info&series_id={id}
```
Returns: `{ "info": {...}, "episodes": { "1": [...], "2": [...] } }` (keyed by season number)

### 7.6 Xtream Credential Storage
Encode as: `"xtream://" + base64(JSON.stringify({ host, username, password }))`

---

## 8. M3U Playlist Parsing

Parse `#EXTINF` lines from M3U/M3U8 files:

```
#EXTM3U
#EXTINF:-1 tvg-id="CNN" tvg-logo="http://logo.png" group-title="News",CNN International
http://stream.example.com/live/cnn.m3u8
```

Extract from each `#EXTINF` line:
- **name**: text after the last comma
- **logo**: `tvg-logo` attribute value (fallback: generate via `https://ui-avatars.com/api/?name={name}&background=1A1A1A&color=fff&bold=true&size=128&format=svg`)
- **category**: `group-title` attribute value (fallback: "General")
- **quality**: detect from name ("4K"/"UHD" → 4K, "FHD"/"1080" → FHD, else → HD)
- **streamUrl**: the URL line following `#EXTINF`
- **id**: base64 of URL (first 16 alphanumeric chars) for deterministic IDs

### Category Auto-Classification (for M3U):
- Keywords `"series"`, `"season"`, `"مسلسلات"` → series category
- Keywords `"movie"`, `"cinema"`, `"films"`, `"افلام"` → vod category
- Everything else → live category

---

## 9. State Management (Zustand Store)

```typescript
interface AppState {
  // Auth
  isLoggedIn: boolean;
  user: { name: string; email: string; plan: string } | null;
  login: (name: string) => void;
  logout: () => void;

  // Playlists
  activePlaylistId: string;
  playlists: Playlist[];
  addPlaylist: (playlist: Playlist, channels: Channel[] | null, categories: PlaylistCategories | null) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  setActivePlaylist: (id: string) => Promise<void>;
  refreshPlaylistById: (id: string) => Promise<void>;

  // Channels & Categories
  channels: Channel[];
  activeCategories: PlaylistCategories | null;
  loadingChannels: boolean;
  loadChannelsForCategory: (playlistId: string, type: 'live' | 'vod' | 'series', categoryId: string, categoryName: string) => Promise<void>;

  // Player
  player: { volume: number; quality: 'Auto' | '4K' | '1080p' | '720p'; isPlaying: boolean };
  setVolume: (v: number) => void;
  setQuality: (q: 'Auto' | '4K' | '1080p' | '720p') => void;

  // Settings
  language: 'ar' | 'en';
  forceHttp: boolean;
  setForceHttp: (val: boolean) => void;

  // Init
  initializeFromStorage: () => Promise<void>;
}
```

### Caching Strategy:
- **Playlists metadata**: stored in AsyncStorage (JSON)
- **Channel lists per category**: stored in local database (MMKV/SQLite). Cache key: `channels_{playlistId}_{type}_{categoryId}`
- **Categories per playlist**: stored in local database. Cache key: `categories_{playlistId}`
- **Cache TTL**: 12 hours. On app launch, check each playlist's `lastUpdatedTimestamp`. If older than 12 hours, auto-refresh in background.
- **Fallback**: If refresh fails, use expired cache data.

---

## 10. Demo / Seed Data

Include these demo playlists (non-deletable, non-refreshable):
- "My Main Playlist" (p1, 16881 channels)
- "Sports Pack 4K" (p2, 348 channels)
- "Arabic Bundle" (p3, 1245 channels)

Include 22 seed live channels across categories: Sports (FOX SPORTS 1, BeIN Sports, Sky Sports F1, ESPN), News (Al Jazeera, CNN, BBC News), Arabic (MBC 4K, MBC 1, Rotana Cinema, Dubai TV), Movies (MBC ACTION, MBC MAX, HBO), Kids (Cartoon Network, Disney Channel, Nickelodeon, Boomerang), Documentaries (NatGeo, Discovery), Music (MTV Live), Entertainment (Netflix Live).

Generate channel logos using: `https://ui-avatars.com/api/?name={name}&background={color}&color=fff&bold=true&size=128&format=svg`

Include 15 seed movies and 10 seed series with Unsplash images as posters/backdrops.

Include 3 featured hero items for the home carousel (Karuppu 2026, FIFA World Cup 2026, Dune: Part Two).

---

## 11. Important Implementation Notes

1. **No CORS proxy anywhere.** All HTTP requests go direct. Remove any `corsproxy.io` references.
2. **Video player must support H.265/HEVC and MKV.** Use `react-native-vlc-media-player` which uses libVLC under the hood.
3. **TLS handling**: For IPTV servers with self-signed or invalid certificates, configure the HTTP client to accept all certificates (common in IPTV).
4. **Image loading**: Use `react-native-fast-image` for efficient image caching and loading with fallback support.
5. **FlatList everywhere**: Use FlatList (not ScrollView) for all lists with many items. Implement `onEndReached` for infinite scroll.
6. **Performance**: Use `React.memo`, `useMemo`, `useCallback` for expensive renders. Channel/movie grids can have thousands of items.
7. **Orientation**: Lock to portrait for most screens. Allow landscape on PlayerScreen.
8. **Status bar**: Light content (white icons) on all screens. Hidden on PlayerScreen.
9. **Platform differences**: Use `Platform.select` where needed. Bottom tab bar should respect `SafeAreaView`.
10. **Error boundaries**: Wrap screens in error boundaries with retry options.
11. **User-Agent for IPTV requests**: Rotate through: "VLC/3.0.18 LibVLC/3.0.18", "TiviMate/4.7.0", "IPTVSmartersPro", "ExoPlayer/2.18.0", "XCIPTV/5.0".

---

## 12. File Structure

```
src/
├── App.tsx                          # Entry point, navigation setup, store init
├── theme/
│   └── theme.ts                     # Colors, spacing, typography, shadows
├── navigation/
│   ├── BottomTabNavigator.tsx        # 5-tab bottom navigation
│   ├── HomeStack.tsx
│   ├── LiveStack.tsx
│   ├── MoviesStack.tsx
│   ├── SeriesStack.tsx
│   └── SettingsStack.tsx
├── screens/
│   ├── LoginScreen.tsx
│   ├── HomeScreen.tsx
│   ├── LiveScreen.tsx
│   ├── MoviesScreen.tsx
│   ├── MovieDetailScreen.tsx
│   ├── SeriesScreen.tsx
│   ├── SeriesDetailScreen.tsx
│   ├── PlayerScreen.tsx
│   ├── SettingsScreen.tsx
│   ├── PlaylistsScreen.tsx
│   └── CatchUpScreen.tsx
├── components/
│   ├── LiveBadge.tsx                 # Red "LIVE" pill with pulse animation
│   ├── QualityBadge.tsx              # "4K" / "FHD" / "HD" pill
│   ├── Logo.tsx                      # EN TEC logo
│   ├── HeroCarousel.tsx              # Home page hero section
│   ├── ContentRow.tsx                # Horizontal scroll row
│   ├── ChannelCard.tsx               # Grid card for channels
│   ├── MovieCard.tsx                 # Portrait poster card
│   ├── CategoryPill.tsx              # Category selector button
│   ├── SearchInput.tsx               # Styled search input
│   ├── SkeletonCard.tsx              # Loading placeholder
│   ├── GoldButton.tsx                # Gold gradient button
│   └── AddPlaylistModal.tsx          # Bottom sheet for adding playlists
├── store/
│   └── app-store.ts                  # Zustand store
├── lib/
│   ├── mock-data.ts                  # Seed channels, movies, series, heroes
│   ├── m3u-parser.ts                 # M3U text parser
│   ├── xtream-api.ts                 # Xtream Codes API functions
│   └── storage.ts                    # AsyncStorage / MMKV helpers
└── types/
    └── index.ts                      # All TypeScript interfaces
```
