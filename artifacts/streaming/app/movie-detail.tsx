import { TVFocusable } from '@/components/TVFocusable';
import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable, 
  Dimensions, 
  ActivityIndicator, 
  Linking, 
  Alert,
  useWindowDimensions
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Lineicons } from '@lineiconshq/react-native-lineicons';
import { ArrowLeftBulk, PlayBulk, Trash3Bulk, Download1Bulk, CameraMovie1Bulk, HeartBulk } from '@lineiconshq/free-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system/legacy';
import { QualityBadge } from '@/components/QualityBadge';
import { useAppStore } from '@/store/app-store';
import { base64Decode } from '@/lib/base64';
import { Channel } from '@/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Actor {
  id: string;
  name: string;
  image: string;
}

export default function MovieDetailScreen() {
  const params = useLocalSearchParams<{
    id: string;
    title: string;
    poster: string;
    backdrop: string;
    quality: string;
    genres: string;
    description: string;
    streamUrl: string;
  }>();

  const colors = useColors();
  const insets = useSafeAreaInsets();

  const activePlaylistId = useAppStore((s) => s.activePlaylistId);
  const playlists = useAppStore((s) => s.playlists);
  const activeCategories = useAppStore((s) => s.activeCategories);
  const getChannelsForCategory = useAppStore((s) => s.getChannelsForCategory);
  const favorites = useAppStore((s) => s.favorites);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const downloads = useAppStore((s) => s.downloads);
  const startDownload = useAppStore((s) => s.startDownload);
  const removeDownload = useAppStore((s) => s.removeDownload);

  const [loading, setLoading] = useState(true);
  const [movieInfo, setMovieInfo] = useState<any>(null);
  const [actors, setActors] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [moreRecommendations, setMoreRecommendations] = useState<any[]>([]);
  const [actorsImages, setActorsImages] = useState<Record<string, string>>({});

  const scrollViewRef = React.useRef<ScrollView>(null);

  useEffect(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  }, [params.id]);

  useEffect(() => {
    if (!movieInfo) return;
    
    const castNames: string[] = [];
    if (movieInfo.actors_images && Array.isArray(movieInfo.actors_images)) {
      movieInfo.actors_images.forEach((actor: any) => {
        const img = actor.image || actor.profile_path || '';
        const name = actor.name || actor.cast_name;
        if (!img && name) {
          castNames.push(name);
        }
      });
    } else if (movieInfo.cast && typeof movieInfo.cast === 'string') {
      const rawParts = movieInfo.cast.split(/[,;|]|\r?\n|\s{2,}|\s*-\s*|\s*\/\s*/);
      let cleaned = rawParts.map((p: string) => p.trim()).filter((p: string) => p.length > 0);

      if (cleaned.length === 1 && cleaned[0].includes(' ')) {
        const words = cleaned[0].split(/\s+/).filter((w: string) => w.length > 0);
        if (words.length > 3) {
          const grouped: string[] = [];
          for (let i = 0; i < words.length; i += 2) {
            if (i + 1 < words.length) {
              grouped.push(`${words[i]} ${words[i + 1]}`);
            } else {
              grouped.push(words[i]);
            }
          }
          cleaned = grouped;
        }
      }
      castNames.push(...cleaned);
    }

    if (castNames.length === 0) return;

    const TMDB_API_KEY = '2eae50aadf0d62874cdc2a281e7130cd';

    async function fetchImages() {
      const results: Record<string, string> = {};
      const promises = castNames.map(async (name) => {
        try {
          const url = `https://api.themoviedb.org/3/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(name)}`;
          const response = await fetch(url);
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            const path = data.results[0].profile_path;
            if (path) {
              results[name] = `https://image.tmdb.org/t/p/w185${path}`;
            }
          }
        } catch (e) {
          console.warn(`[TMDB] Failed to fetch image for: ${name}`, e);
        }
      });

      await Promise.all(promises);
      
      if (Object.keys(results).length > 0) {
        setActorsImages(prev => ({ ...prev, ...results }));
      }
    }

    fetchImages();
  }, [movieInfo]);

  const movieTitle = params.title || 'Movie Detail';
  const moviePoster = params.poster || '';
  const fetchedBackdrop = movieInfo?.backdrop_path && Array.isArray(movieInfo.backdrop_path) && movieInfo.backdrop_path.length > 0 
    ? movieInfo.backdrop_path[0] 
    : movieInfo?.backdrop_path && typeof movieInfo.backdrop_path === 'string' 
      ? movieInfo.backdrop_path 
      : '';
  
  const movieBackdrop = fetchedBackdrop || params.backdrop || params.poster || '';
  const movieDescription = params.description || 'No description available for this title.';
  const movieStreamUrl = params.streamUrl || '';
  const movieGenres = params.genres ? params.genres.split(',') : ['VOD'];
  const movieQuality = params.quality || 'HD';

  const isFavorite = favorites.includes(params.id || '');
  const downloadedItem = downloads.find(d => d.id === params.id);
  const isDownloaded = downloadedItem?.status === 'completed';
  const isDownloading = downloadedItem?.status === 'downloading' || downloadedItem?.status === 'paused';
  const downloadProgress = downloadedItem?.progress || 0;

  useEffect(() => {
    let active = true;
    async function loadMovieInfo() {
      setLoading(true);
      const p = playlists.find((x) => x.id === activePlaylistId);
      const isXtream = p && (p.url.startsWith('xtream://') || p.url.includes('/get.php?'));

      if (isXtream && params.id) {
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
          setLoading(false);
          return;
        }

        const movieId = params.id.replace('xt_vod_', '');
        const fetchUrl = `${config.host}/player_api.php?username=${config.username}&password=${config.password}&action=get_vod_info&vod_id=${movieId}`;

        try {
          const response = await fetch(fetchUrl);
          const data = await response.json();
          if (data && data.info && active) {
            setMovieInfo(data.info);
          }
        } catch (err) {
          console.error('Failed to parse movie info:', err);
        }
      }
      setLoading(false);
    }

    loadMovieInfo();
    return () => { active = false; };
  }, [activePlaylistId, params.id]);

  const primaryCategory = movieGenres[0] || 'VOD';
  useEffect(() => {
    let active = true;
    async function loadRecommendations() {
      if (!activePlaylistId || !activeCategories) {
        if (active) setRecommendations(getFallbackRecommendations());
        return;
      }

      try {
        const cat = activeCategories.vod.find(c => c.name === primaryCategory);
        if (cat) {
          const list = await getChannelsForCategory(activePlaylistId, 'vod', cat.id, cat.name);
          if (active) {
            const filtered = list.filter(m => m.id !== params.id);
            setRecommendations(filtered.slice(0, 8));
            setMoreRecommendations(filtered.slice(8, 16));
          }
        } else {
          if (active) {
            setRecommendations(getFallbackRecommendations());
            setMoreRecommendations([]);
          }
        }
      } catch (err) {
        if (active) {
          setRecommendations(getFallbackRecommendations());
          setMoreRecommendations([]);
        }
      }
    }
    loadRecommendations();
    return () => { active = false; };
  }, [activePlaylistId, activeCategories, primaryCategory, params.id]);

  const getFallbackRecommendations = (): Channel[] => [
    { id: 'm_sim_1', name: 'Inception', logo: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300&h=450&fit=crop', category: primaryCategory, streamUrl: movieStreamUrl, type: 'vod' as const, isLive: false, current: '', next: '', quality: 'HD' as const },
    { id: 'm_sim_2', name: 'Interstellar', logo: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300&h=450&fit=crop', category: primaryCategory, streamUrl: movieStreamUrl, type: 'vod' as const, isLive: false, current: '', next: '', quality: 'HD' as const },
    { id: 'm_sim_3', name: 'The Dark Knight', logo: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=300&h=450&fit=crop', category: primaryCategory, streamUrl: movieStreamUrl, type: 'vod' as const, isLive: false, current: '', next: '', quality: 'HD' as const },
    { id: 'm_sim_4', name: 'Avatar', logo: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&h=450&fit=crop', category: primaryCategory, streamUrl: movieStreamUrl, type: 'vod' as const, isLive: false, current: '', next: '', quality: 'HD' as const },
    { id: 'm_sim_5', name: 'Gladiator', logo: 'https://images.unsplash.com/photo-1559583985-c80d8ad9b29f?w=300&h=450&fit=crop', category: primaryCategory, streamUrl: movieStreamUrl, type: 'vod' as const, isLive: false, current: '', next: '', quality: 'HD' as const }
  ];

  const handleWatch = () => {
    let urlToPlay = isDownloaded && downloadedItem?.localUri ? downloadedItem.localUri : movieStreamUrl;
    router.push({
      pathname: '/player',
      params: {
        id: params.id || '',
        streamUrl: urlToPlay,
        title: movieTitle,
        quality: movieQuality,
        isLive: 'false',
        poster: moviePoster,
        backdrop: movieBackdrop,
        description: movieDescription,
        category: primaryCategory
      }
    });
  };

  const handleDownload = async () => {
    if (isDownloaded && downloadedItem) {
      try {
        await FileSystem.deleteAsync(downloadedItem.localUri, { idempotent: true });
        removeDownload(params.id || '');
      } catch (e) {
        console.error("Failed to delete", e);
      }
      return;
    }
    if (isDownloading) return;
    
    startDownload({
      id: params.id || '',
      title: movieTitle,
      poster: moviePoster,
      backdrop: movieBackdrop,
      quality: movieQuality,
      streamUrl: movieStreamUrl,
      type: 'movie'
    });
  };

  const handleToggleFav = () => {
    const channelItem = {
      id: params.id || '',
      name: movieTitle,
      logo: moviePoster,
      category: movieGenres[0] || 'VOD',
      streamUrl: movieStreamUrl,
      current: 'Movie',
      next: 'VOD',
      quality: movieQuality as any,
      isLive: false,
      type: 'vod' as const
    };
    toggleFavorite(channelItem);
  };

  const handleWatchTrailer = () => {
    const trailerId = movieInfo?.youtube_trailer || movieInfo?.trailer;
    if (trailerId) {
      const url = trailerId.startsWith('http')
        ? trailerId
        : `https://www.youtube.com/watch?v=${trailerId}`;
      Linking.openURL(url).catch(() => {
        Alert.alert('Error', 'Failed to open trailer.');
      });
    }
  };

  useEffect(() => {
    const getActors = (): Actor[] => {
      if (movieInfo?.actors_images && Array.isArray(movieInfo.actors_images)) {
        return movieInfo.actors_images.map((actor: any, idx: number) => {
          const img = actor.image || actor.profile_path || '';
          const realImg = img.startsWith('http') || img ? (img.startsWith('http') ? img : `https://image.tmdb.org/t/p/w185${img}`) : (actorsImages[actor.name || actor.cast_name] || '');
          return {
            id: `actor_${idx}`,
            name: actor.name || actor.cast_name || 'Unknown',
            image: realImg,
          };
        });
      }
      if (movieInfo?.cast && typeof movieInfo.cast === 'string') {
        const rawParts = movieInfo.cast.split(/[,;|]|\r?\n|\s{2,}|\s*-\s*|\s*\/\s*/);
        let cleaned = rawParts.map((p: string) => p.trim()).filter((p: string) => p.length > 0);

        if (cleaned.length === 1 && cleaned[0].includes(' ')) {
          const words = cleaned[0].split(/\s+/).filter((w: string) => w.length > 0);
          if (words.length > 3) {
            const grouped: string[] = [];
            for (let i = 0; i < words.length; i += 2) {
              if (i + 1 < words.length) {
                grouped.push(`${words[i]} ${words[i + 1]}`);
              } else {
                grouped.push(words[i]);
              }
            }
            cleaned = grouped;
          }
        }

        return cleaned.map((name: string, idx: number) => ({
          id: `actor_c_${idx}`,
          name,
          image: actorsImages[name] || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1A1A1A&color=D4A843&bold=true&size=150`,
        }));
      }
      return [];
    };
    setActors(getActors());
  }, [movieInfo, actorsImages]);

  const getGenresList = (): string[] => {
    if (movieInfo?.genre && typeof movieInfo.genre === 'string') {
      return movieInfo.genre.split(',').map((g: string) => g.trim());
    }
    return movieGenres;
  };

  const getRating = (): number => {
    if (!movieInfo?.rating) return 8.5;
    const parsed = parseFloat(movieInfo.rating);
    return isNaN(parsed) || parsed === 0 ? 8.5 : parsed;
  };

  const genres = getGenresList();
  const rating = getRating();
  const releaseDate = movieInfo?.releasedate || movieInfo?.release_date || '';
  const year = releaseDate ? releaseDate.substring(0, 4) : '2026';
  const duration = movieInfo?.duration || movieInfo?.runtime || 'VOD';
  const description = movieInfo?.plot || movieDescription;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .slice(0, 2)
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView ref={scrollViewRef} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        
        <View style={styles.heroSection}>
          <Image source={{ uri: movieBackdrop || moviePoster }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(10,10,10,0.6)', colors.background]}
            style={[StyleSheet.absoluteFill, { top: '60%' }]}
          />
          <TVFocusable 
            style={[styles.backBtn, { top: insets.top + 10 }]} 
            onPress={() => router.back()}
          >
            <Lineicons icon={ArrowLeftBulk} size={28} color="#FFF" style={styles.shadowIcon} />
          </TVFocusable>
          <View style={[styles.titleSection, { position: 'absolute', bottom: 60, left: 0, right: 0, zIndex: 10 }]}>
          <Text style={[styles.title, { color: colors.gold }]}>{movieTitle}</Text>
          <LinearGradient
            colors={['#D4A843', '#A67C2E']}
            style={styles.playPillContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <TVFocusable 
              style={styles.playPill}
              onPress={handleWatch}
              scaleAmount={1.05}
              focusedBorderColor="#FFF"
              borderThickness={3}
            >
              <Lineicons icon={PlayBulk} size={24} color="#1A1A1A" />
              <Text style={styles.playPillText}>Watch Now</Text>
            </TVFocusable>
          </LinearGradient>
        </View>
          </View>

        <View style={styles.content}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Movie Details</Text>
          <Text style={[styles.tagline, { color: '#E8A317' }]}>Top Pick For You</Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={[styles.metaRowText, { color: colors.mutedForeground }]}>
              {year} • {duration} • {rating.toFixed(1)}/10 • {genres.slice(0, 2).join(' | ')}
            </Text>
            {!loading && movieInfo && (
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
                {movieInfo.subtitles && movieInfo.subtitles.length > 0 && (
                  <Text style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>CC</Text>
                )}
                {movieInfo.audio_track && movieInfo.audio_track.length > 0 && (
                  <Text style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>MULTI-AUDIO</Text>
                )}
              </View>
            )}
          </View>

          {loading ? (
            <ActivityIndicator size="small" color={colors.gold} style={{ marginVertical: 12, alignSelf: 'flex-start' }} />
          ) : (
            description ? <Text style={[styles.description, { color: '#DDD' }]}>{description}</Text> : null
          )}

          {actors.length > 0 && (
             <Text style={[styles.starsText, { color: colors.mutedForeground }]}>
               Stars: <Text style={{ color: '#DDD' }}>{actors.map(a => a.name).join(', ')}</Text>
             </Text>
          )}

          <View style={styles.actionButtonsRow}>
            <TVFocusable style={styles.actionIconBtn} onPress={handleToggleFav}>
              <View style={styles.actionIconCircle}>
                <Lineicons icon={HeartBulk} size={20} color={isFavorite ? '#E53935' : '#FFF'} />
              </View>
              <Text style={styles.actionIconText}>Favorite</Text>
            </TVFocusable>
            
            <TVFocusable style={styles.actionIconBtn} onPress={handleDownload} disabled={isDownloading}>
              <View style={styles.actionIconCircle}>
                {isDownloading ? (
                  <Text style={{ color: colors.gold, fontSize: 10, fontWeight: 'bold' }}>
                    {Math.round(downloadProgress * 100)}%
                  </Text>
                ) : isDownloaded ? (
                  <Lineicons icon={Trash3Bulk} size={20} color={colors.primary} />
                ) : (
                  <Lineicons icon={Download1Bulk} size={20} color="#FFF" />
                )}
              </View>
              <Text style={styles.actionIconText}>
                {isDownloading ? 'Downloading' : isDownloaded ? 'Delete' : 'Download'}
              </Text>
            </TVFocusable>

            {movieInfo?.youtube_trailer || movieInfo?.trailer ? (
              <TVFocusable style={styles.actionIconBtn} onPress={handleWatchTrailer}>
                <View style={styles.actionIconCircle}>
                  <Lineicons icon={CameraMovie1Bulk} size={20} color="#FFF" />
                </View>
                <Text style={styles.actionIconText}>Trailer</Text>
              </TVFocusable>
            ) : null}
          </View>

          {!loading && actors.length > 0 && (
            <View style={styles.castSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Cast</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.castList}>
                {actors.map(actor => (
                  <TVFocusable 
                    key={actor.id} 
                    style={styles.castCard}
                    onPress={undefined}
                  >
                    {actor.image ? (
                      <Image source={{ uri: actor.image }} style={styles.castImage} contentFit="cover" />
                    ) : (
                      <View style={[styles.castAvatarFallback, { borderColor: colors.gold, backgroundColor: colors.surface }]}>
                        <Text style={[styles.castFallbackText, { color: colors.gold }]}>{getInitials(actor.name)}</Text>
                      </View>
                    )}
                    <Text style={[styles.castName, { color: colors.text }]} numberOfLines={2}>{actor.name}</Text>
                  </TVFocusable>
                ))}
              </ScrollView>
            </View>
          )}

          {recommendations.length > 0 && (
            <View style={styles.similarSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Similar Content</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.similarList}>
                {recommendations.map(item => (
                  <TVFocusable
                    key={item.id}
                    style={styles.similarCard}
                    onPress={() => {
                      router.push({
                        pathname: '/movie-detail',
                        params: {
                          id: item.id,
                          title: item.name,
                          poster: item.logo,
                          backdrop: item.logo,
                          quality: item.quality || 'HD',
                          genres: item.category,
                          description: '',
                          streamUrl: item.streamUrl
                        }
                      });
                    }}
                  >
                    <Image
                      source={{ uri: item.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=1A1A1A&color=D4A843&bold=true&size=150&format=svg` }}
                      style={styles.similarPoster}
                      contentFit="cover"
                    />
                    <Text style={[styles.similarTitle, { color: colors.text }]} numberOfLines={2}>
                      {item.name}
                    </Text>
                  </TVFocusable>
                ))}
              </ScrollView>
            </View>
          )}

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroSection: {
    height: SCREEN_HEIGHT * 0.55,
    width: '100%',
    position: 'relative',
  },
  backBtn: {
    position: 'absolute',
    left: 20,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  shadowIcon: {
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  titleSection: {
    alignItems: 'center',
    marginTop: -20,
    paddingHorizontal: 24,
    zIndex: 5,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  badgeText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  playPillContainer: {
    borderRadius: 30,
    alignSelf: 'center',
    marginTop: 10,
    shadowColor: '#D4A843',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  playPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 36,
    gap: 12,
    borderRadius: 30,
  },
  playPillText: {
    color: '#1A1A1A',
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  content: {
    padding: 24,
    paddingTop: 32,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  tagline: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  metaRowText: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 20,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
  },
  starsText: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 24,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 32,
  },
  actionIconBtn: {
    alignItems: 'center',
    gap: 8,
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  actionIconText: {
    color: '#FFF',
    fontSize: 12,
  },
  castSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  castList: {
    paddingBottom: 8,
  },
  castCard: {
    alignItems: 'center',
    marginRight: 16,
    width: 80,
  },
  castImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 6,
    backgroundColor: '#2A2A2A',
  },
  castAvatarFallback: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    borderWidth: 1,
  },
  castFallbackText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  castName: {
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 14,
  },
  similarSection: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#202020',
    paddingTop: 24,
  },
  similarList: {
    paddingBottom: 8,
  },
  similarCard: {
    marginRight: 14,
    width: 100,
  },
  similarPoster: {
    width: 100,
    aspectRatio: 2/3,
    borderRadius: 8,
    backgroundColor: '#1A1A1A',
    marginBottom: 6,
  },
  similarTitle: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});