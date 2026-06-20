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
  Alert 
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { GoldButton } from '@/components/GoldButton';
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

  const [loading, setLoading] = useState(true);
  const [movieInfo, setMovieInfo] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<Channel[]>([]);

  console.log('[MovieDetail] Rendering screen. params.id:', params.id, 'movieInfo:', !!movieInfo, 'recommendations:', recommendations.length);

  const movieTitle = params.title || 'Movie Detail';
  const moviePoster = params.poster || '';
  const movieBackdrop = params.backdrop || params.poster || '';
  const movieDescription = params.description || 'No description available for this title.';
  const movieStreamUrl = params.streamUrl || '';
  const movieGenres = params.genres ? params.genres.split(',') : ['VOD'];
  const movieQuality = params.quality || 'HD';

  const isFavorite = favorites.includes(params.id || '');

  // Load Main Movie Info
  const activePlaylist = playlists.find((x) => x.id === activePlaylistId);
  const activePlaylistUrl = activePlaylist?.url;

  useEffect(() => {
    let active = true;
    console.log('[MovieDetail] first useEffect triggered. params.id:', params.id);

    async function loadMovieInfo() {
      setLoading(true);
      const p = activePlaylist;
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

        console.log(`[MovieDetail] Fetching info from: ${fetchUrl}`);

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
            text = await new Promise((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              xhr.open('GET', u, true);
              xhr.timeout = 20000;
              xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                  if (xhr.responseText && xhr.responseText.trim().length > 0) resolve(xhr.responseText);
                  else reject(new Error('Empty response'));
                } else {
                  reject(new Error(`HTTP status error: ${xhr.status}`));
                }
              };
              xhr.onerror = () => reject(new Error('Network error'));
              xhr.ontimeout = () => reject(new Error('Timeout'));
              xhr.send();
            });
            fetched = true;
            break;
          } catch (e: any) {
            console.warn(`[MovieDetail] Failed fetching from ${u}: ${e.message || e}`);
          }
        }

        if (fetched && active) {
          try {
            const data = JSON.parse(text);
            if (data && data.info) {
              setMovieInfo(data.info);
            }
          } catch (err) {
            console.error('Failed to parse movie info:', err);
          }
        }
      }
      setLoading(false);
    }

    loadMovieInfo();

    return () => {
      active = false;
    };
  }, [activePlaylistId, activePlaylistUrl, params.id]);

  // Load Similar Content Recommendations
  const primaryCategory = movieGenres[0] || 'VOD';
  useEffect(() => {
    let active = true;
    console.log('[MovieDetail] second useEffect triggered. primaryCategory:', primaryCategory, 'activeCategories:', !!activeCategories);

    async function loadRecommendations() {
      if (!activePlaylistId || !activeCategories) {
        // Fallback recommendations if no active categories loaded
        if (active) setRecommendations(getFallbackRecommendations());
        return;
      }

      try {
        const cat = activeCategories.vod.find(c => c.name === primaryCategory);
        if (cat) {
          const list = await getChannelsForCategory(activePlaylistId, 'vod', cat.id, cat.name);
          if (active) {
            const filtered = list.filter(m => m.id !== params.id).slice(0, 8);
            if (filtered.length > 0) {
              setRecommendations(filtered);
            } else {
              setRecommendations(getFallbackRecommendations());
            }
          }
        } else {
          if (active) setRecommendations(getFallbackRecommendations());
        }
      } catch (err) {
        console.warn('Failed loading VOD recommendations:', err);
        if (active) setRecommendations(getFallbackRecommendations());
      }
    }

    loadRecommendations();

    return () => {
      active = false;
    };
  }, [activePlaylistId, activeCategories, primaryCategory, params.id]);

  const getFallbackRecommendations = (): Channel[] => {
    return [
      { id: 'm_sim_1', name: 'Inception', logo: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300&h=450&fit=crop', category: primaryCategory, streamUrl: movieStreamUrl, type: 'vod' as const, isLive: false, current: '', next: '', quality: 'HD' as const },
      { id: 'm_sim_2', name: 'Interstellar', logo: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300&h=450&fit=crop', category: primaryCategory, streamUrl: movieStreamUrl, type: 'vod' as const, isLive: false, current: '', next: '', quality: 'HD' as const },
      { id: 'm_sim_3', name: 'The Dark Knight', logo: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=300&h=450&fit=crop', category: primaryCategory, streamUrl: movieStreamUrl, type: 'vod' as const, isLive: false, current: '', next: '', quality: 'HD' as const },
      { id: 'm_sim_4', name: 'Avatar', logo: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&h=450&fit=crop', category: primaryCategory, streamUrl: movieStreamUrl, type: 'vod' as const, isLive: false, current: '', next: '', quality: 'HD' as const },
      { id: 'm_sim_5', name: 'Gladiator', logo: 'https://images.unsplash.com/photo-1559583985-c80d8ad9b29f?w=300&h=450&fit=crop', category: primaryCategory, streamUrl: movieStreamUrl, type: 'vod' as const, isLive: false, current: '', next: '', quality: 'HD' as const }
    ];
  };

  const handleWatch = () => {
    router.push({
      pathname: '/player',
      params: {
        streamUrl: movieStreamUrl,
        title: movieTitle,
        quality: movieQuality,
        isLive: 'false'
      }
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
        Alert.alert('خطأ / Error', 'تعذر فتح الإعلان / Failed to open trailer.');
      });
    }
  };

  // Extract actors
  const getActors = (): Actor[] => {
    if (movieInfo?.actors_images && Array.isArray(movieInfo.actors_images)) {
      return movieInfo.actors_images.map((actor: any, idx: number) => ({
        id: `actor_${idx}`,
        name: actor.name || actor.cast_name || 'Unknown',
        image: actor.image || actor.profile_path || '',
      }));
    }
    if (movieInfo?.cast && typeof movieInfo.cast === 'string') {
      return movieInfo.cast
        .split(',')
        .map((name: string, idx: number) => {
          const trimmed = name.trim();
          return {
            id: `actor_c_${idx}`,
            name: trimmed,
            image: `https://ui-avatars.com/api/?name=${encodeURIComponent(trimmed)}&background=1A1A1A&color=D4A843&bold=true&size=150`,
          };
        })
        .filter((x: Actor) => x.name.length > 0);
    }
    return [];
  };

  // Get dynamic TMDb real genres
  const getGenresList = (): string[] => {
    if (movieInfo?.genre && typeof movieInfo.genre === 'string') {
      return movieInfo.genre.split(',').map((g: string) => g.trim());
    }
    return movieGenres;
  };

  // Safe Rating parser
  const getRating = (): number => {
    if (!movieInfo?.rating) return 8.5;
    const parsed = parseFloat(movieInfo.rating);
    return isNaN(parsed) || parsed === 0 ? 8.5 : parsed;
  };

  const actors = getActors();
  const genres = getGenresList();
  const rating = getRating();
  const director = movieInfo?.director || '';
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        
        <View style={styles.heroSection}>
          <Image source={{ uri: movieBackdrop }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'rgba(10,10,10,0.8)', '#0A0A0A']}
            style={StyleSheet.absoluteFill}
          />
          
          <Pressable 
            style={[styles.backBtn, { top: insets.top + 10, backgroundColor: 'rgba(0,0,0,0.5)' }]} 
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={24} color="#FFF" />
          </Pressable>
          
          <View style={styles.posterWrapper}>
            <Image source={{ uri: moviePoster }} style={[styles.poster, { borderColor: colors.gold }]} contentFit="cover" />
          </View>
        </View>

        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>{movieTitle}</Text>
          
          <View style={styles.metaRow}>
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{year}</Text>
            <Text style={[styles.metaDot, { color: colors.mutedForeground }]}>·</Text>
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{duration}</Text>
            <Text style={[styles.metaDot, { color: colors.mutedForeground }]}>·</Text>
            <View style={styles.ratingBadge}>
              <Feather name="star" size={14} color={colors.gold} />
              <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
            </View>
            <View style={{ marginLeft: 8 }}><QualityBadge quality={movieQuality as any} /></View>
          </View>
          
          {director ? (
            <Text style={[styles.directorText, { color: colors.mutedForeground }]}>
              Director / المخرج: <Text style={{ color: colors.text, fontWeight: '600' }}>{director}</Text>
            </Text>
          ) : null}

          <View style={styles.genres}>
            {genres.map(g => (
              <View key={g} style={[styles.genrePill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.genreText, { color: colors.text }]}>{g}</Text>
              </View>
            ))}
          </View>
          
          {loading ? (
            <ActivityIndicator size="small" color={colors.gold} style={{ marginVertical: 12 }} />
          ) : (
            description ? <Text style={[styles.description, { color: colors.mutedForeground }]}>{description}</Text> : null
          )}

          <View style={styles.actions}>
            <GoldButton 
              title="Watch Now" 
              icon={<Feather name="play" size={20} color="#1A1A1A" />}
              style={{ flex: 1 }}
              onPress={handleWatch}
            />
            {movieInfo?.youtube_trailer || movieInfo?.trailer ? (
              <Pressable 
                style={[styles.trailerBtn, { borderColor: colors.gold }]}
                onPress={handleWatchTrailer}
              >
                <Feather name="video" size={20} color={colors.gold} />
                <Text style={[styles.trailerBtnText, { color: colors.gold }]}>Trailer</Text>
              </Pressable>
            ) : null}
            <Pressable 
              style={[styles.favBtn, { borderColor: colors.border }]}
              onPress={handleToggleFav}
            >
              <Feather name="heart" size={24} color={isFavorite ? '#E53935' : colors.text} fill={isFavorite ? '#E53935' : 'transparent'} />
            </Pressable>
          </View>

          {!loading && actors.length > 0 && (
            <View style={styles.castSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Cast / طاقم العمل</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.castList}>
                {actors.map(actor => (
                  <View key={actor.id} style={styles.castCard}>
                    {actor.image ? (
                      <Image source={{ uri: actor.image }} style={styles.castImage} contentFit="cover" />
                    ) : (
                      <View style={[styles.castAvatarFallback, { borderColor: colors.gold, backgroundColor: colors.surface }]}>
                        <Text style={[styles.castFallbackText, { color: colors.gold }]}>{getInitials(actor.name)}</Text>
                      </View>
                    )}
                    <Text style={[styles.castName, { color: colors.text }]} numberOfLines={2}>{actor.name}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {recommendations.length > 0 && (
            <View style={styles.similarSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Similar Content / اقتراحات مشابهة</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.similarList}>
                {recommendations.map(item => (
                  <Pressable
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
                  </Pressable>
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
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 24,
  },
  backBtn: {
    position: 'absolute',
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  posterWrapper: {
    shadowColor: '#D4A843',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  poster: {
    width: 180,
    aspectRatio: 2/3,
    borderRadius: 16,
    borderWidth: 2,
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  metaText: {
    fontSize: 14,
    fontWeight: '500',
  },
  metaDot: {
    marginHorizontal: 8,
    fontSize: 14,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  directorText: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  genres: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  genrePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  genreText: {
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 32,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
    alignItems: 'center',
  },
  trailerBtn: {
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  trailerBtnText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  favBtn: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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