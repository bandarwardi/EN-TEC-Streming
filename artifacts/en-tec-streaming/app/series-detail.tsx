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
import { useAppStore } from '@/store/app-store';
import { base64Decode } from '@/lib/base64';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Episode {
  id: string;
  season: number;
  number: number;
  title: string;
  duration: string;
  thumbnail: string;
  streamUrl: string;
}

interface Actor {
  id: string;
  name: string;
  image: string;
}

export default function SeriesDetailScreen() {
  const params = useLocalSearchParams<{
    id: string;
    title: string;
    poster: string;
    backdrop: string;
    genres: string;
    description: string;
    streamUrl: string;
  }>();

  const colors = useColors();
  const insets = useSafeAreaInsets();

  const activePlaylistId = useAppStore((s) => s.activePlaylistId);
  const playlists = useAppStore((s) => s.playlists);
  const favorites = useAppStore((s) => s.favorites);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);

  const [loading, setLoading] = useState(true);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [seasonsCount, setSeasonsCount] = useState(1);
  const [seriesInfo, setSeriesInfo] = useState<any>(null);

  const seriesTitle = params.title || 'Series Detail';
  const seriesPoster = params.poster || '';
  const seriesBackdrop = params.backdrop || params.poster || '';
  const seriesDescription = params.description || 'No description available for this series.';
  const seriesStreamUrl = params.streamUrl || '';
  const seriesGenres = params.genres ? params.genres.split(',') : ['TV Series'];

  const isFavorite = favorites.includes(params.id || '');

  const activePlaylist = playlists.find((x) => x.id === activePlaylistId);
  const activePlaylistUrl = activePlaylist?.url;

  useEffect(() => {
    let active = true;

    async function loadSeriesInfo() {
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

        const seriesId = params.id.replace('xt_series_', '');
        const fetchUrl = `${config.host}/player_api.php?username=${config.username}&password=${config.password}&action=get_series_info&series_id=${seriesId}`;
        
        console.log(`[SeriesDetail] Fetching info from: ${fetchUrl}`);

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
            console.warn(`[SeriesDetail] Failed fetching from ${u}: ${e.message || e}`);
          }
        }

        if (fetched && active) {
          try {
            const data = JSON.parse(text);
            const episodesList: Episode[] = [];
            const seasonsSet = new Set<number>();

            if (data && data.info) {
              setSeriesInfo(data.info);
            }

            if (data && data.episodes) {
              const eps = data.episodes;
              if (typeof eps === 'object' && !Array.isArray(eps)) {
                for (const seasonNum in eps) {
                  const seasonEps = eps[seasonNum];
                  if (Array.isArray(seasonEps)) {
                    const sNum = parseInt(seasonNum, 10) || 1;
                    seasonsSet.add(sNum);
                    for (const ep of seasonEps) {
                      const ext = ep.container_extension || 'mp4';
                      episodesList.push({
                        id: String(ep.id || ep.episode_id),
                        season: sNum,
                        number: parseInt(ep.episode_num || ep.episode_number, 10) || 1,
                        title: ep.title || `Episode ${ep.episode_num || ep.episode_number || 1}`,
                        duration: ep.info?.duration || ep.duration || '45m',
                        thumbnail: ep.info?.movie_image || ep.info?.screenshot || seriesBackdrop || seriesPoster || '',
                        streamUrl: `${config.host}/series/${config.username}/${config.password}/${ep.id || ep.episode_id}.${ext}`
                      });
                    }
                  }
                }
              } else if (Array.isArray(eps)) {
                for (const ep of eps) {
                  const sNum = parseInt(ep.season, 10) || 1;
                  seasonsSet.add(sNum);
                  const ext = ep.container_extension || 'mp4';
                  episodesList.push({
                    id: String(ep.id || ep.episode_id),
                    season: sNum,
                    number: parseInt(ep.episode_num || ep.episode_number, 10) || 1,
                    title: ep.title || `Episode ${ep.episode_num || ep.episode_number || 1}`,
                    duration: ep.info?.duration || ep.duration || '45m',
                    thumbnail: ep.info?.movie_image || ep.info?.screenshot || seriesBackdrop || seriesPoster || '',
                    streamUrl: `${config.host}/series/${config.username}/${config.password}/${ep.id || ep.episode_id}.${ext}`
                  });
                }
              }
            }

            setEpisodes(episodesList.sort((a, b) => a.season - b.season || a.number - b.number));
            setSeasonsCount(seasonsSet.size || 1);
          } catch (err) {
            console.error('Failed to parse series info:', err);
          }
        }
      } else {
        // Fallback for static M3U series (single stream)
        const episodesList: Episode[] = [
          {
            id: params.id || '1',
            season: 1,
            number: 1,
            title: 'Full TV Series Stream',
            duration: 'VOD',
            thumbnail: seriesBackdrop || seriesPoster || '',
            streamUrl: seriesStreamUrl
          }
        ];
        setEpisodes(episodesList);
        setSeasonsCount(1);
      }
      setLoading(false);
    }

    loadSeriesInfo();

    return () => {
      active = false;
    };
  }, [activePlaylistId, activePlaylistUrl, params.id]);

  const handleWatchFirst = () => {
    if (episodes.length > 0) {
      const ep = episodes[0];
      router.push({
        pathname: '/player',
        params: {
          streamUrl: ep.streamUrl,
          title: `${seriesTitle} - S${ep.season}:E${ep.number}`,
          quality: 'FHD',
          isLive: 'false'
        }
      });
    }
  };

  const handleWatchEpisode = (ep: Episode) => {
    router.push({
      pathname: '/player',
      params: {
        streamUrl: ep.streamUrl,
        title: `${seriesTitle} - S${ep.season}:E${ep.number}`,
        quality: 'FHD',
        isLive: 'false'
      }
    });
  };

  const handleToggleFav = () => {
    const channelItem = {
      id: params.id || '',
      name: seriesTitle,
      logo: seriesPoster,
      category: seriesGenres[0] || 'Series',
      streamUrl: seriesStreamUrl,
      current: 'TV Series',
      next: 'Episodes Available',
      quality: 'FHD' as const,
      isLive: false,
      type: 'series' as const
    };
    toggleFavorite(channelItem);
  };

  const handleWatchTrailer = () => {
    const trailerId = seriesInfo?.youtube_trailer || seriesInfo?.trailer;
    if (trailerId) {
      const url = trailerId.startsWith('http')
        ? trailerId
        : `https://www.youtube.com/watch?v=${trailerId}`;
      Linking.openURL(url).catch(() => {
        Alert.alert('Error', 'Failed to open trailer.');
      });
    }
  };

  const getActors = (): Actor[] => {
    if (seriesInfo?.actors_images && Array.isArray(seriesInfo.actors_images)) {
      return seriesInfo.actors_images.map((actor: any, idx: number) => ({
        id: `actor_${idx}`,
        name: actor.name || actor.cast_name || 'Unknown',
        image: actor.image || actor.profile_path || '',
      }));
    }
    if (seriesInfo?.cast && typeof seriesInfo.cast === 'string') {
      const rawParts = seriesInfo.cast.split(/[,;|]|\r?\n|\s{2,}|\s*-\s*|\s*\/\s*/);
      let cleaned = rawParts.map(p => p.trim()).filter(p => p.length > 0);

      if (cleaned.length === 1 && cleaned[0].includes(' ')) {
        const words = cleaned[0].split(/\s+/).filter(w => w.length > 0);
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
        image: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1A1A1A&color=D4A843&bold=true&size=150`,
      }));
    }
    return [];
  };

  const actors = getActors();
  const director = seriesInfo?.director || '';
  const releaseDate = seriesInfo?.releaseDate || seriesInfo?.releasedate || '';
  const year = releaseDate ? releaseDate.substring(0, 4) : '2026';
  const rating = seriesInfo?.rating ? parseFloat(seriesInfo.rating) : 8.5;
  const description = seriesInfo?.plot || seriesDescription;

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
          <Image source={{ uri: seriesBackdrop }} style={StyleSheet.absoluteFill} contentFit="cover" />
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
            <Image source={{ uri: seriesPoster }} style={[styles.poster, { borderColor: colors.gold }]} contentFit="cover" />
          </View>
        </View>

        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>{seriesTitle}</Text>
          
          <View style={styles.metaRow}>
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{year}</Text>
            <Text style={[styles.metaDot, { color: colors.mutedForeground }]}>·</Text>
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{seasonsCount} {seasonsCount > 1 ? 'Seasons' : 'Season'}</Text>
            <Text style={[styles.metaDot, { color: colors.mutedForeground }]}>·</Text>
            <View style={styles.ratingBadge}>
              <Feather name="star" size={14} color={colors.gold} />
              <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
            </View>
          </View>

          {director ? (
            <Text style={[styles.directorText, { color: colors.mutedForeground }]}>
              Director: <Text style={{ color: colors.text, fontWeight: '600' }}>{director}</Text>
            </Text>
          ) : null}
          
          <Text style={[styles.description, { color: colors.mutedForeground }]}>{description}</Text>
          
          {loading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="large" color={colors.gold} />
              <Text style={{ color: colors.mutedForeground, marginTop: 12 }}>Syncing episodes...</Text>
            </View>
          ) : (
            <>
              <View style={styles.actions}>
                <GoldButton 
                  title={episodes.length > 0 ? `Watch S${episodes[0].season}:E${episodes[0].number}` : "Watch Now"} 
                  icon={<Feather name="play" size={20} color="#1A1A1A" />}
                  style={{ flex: 1 }}
                  onPress={handleWatchFirst}
                  disabled={episodes.length === 0}
                />
                {seriesInfo?.youtube_trailer || seriesInfo?.trailer ? (
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
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Cast</Text>
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

              <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>Episodes ({episodes.length})</Text>
              
              <View style={styles.episodesList}>
                {episodes.map(ep => (
                  <Pressable 
                    key={ep.id} 
                    style={[styles.episodeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => handleWatchEpisode(ep)}
                  >
                    <View style={styles.epThumbnailContainer}>
                      <Image source={{ uri: ep.thumbnail }} style={styles.epThumbnail} contentFit="cover" />
                      <View style={styles.epPlayOverlay}>
                        <Feather name="play-circle" size={24} color="#FFF" />
                      </View>
                    </View>
                    <View style={styles.epInfo}>
                      <Text style={[styles.epLabel, { color: colors.gold }]}>S{ep.season} · E{ep.number}</Text>
                      <Text style={[styles.epTitle, { color: colors.text }]} numberOfLines={1}>{ep.title}</Text>
                      <Text style={[styles.epDuration, { color: colors.mutedForeground }]}>{ep.duration}</Text>
                    </View>
                  </Pressable>
                ))}
                
                {episodes.length === 0 && (
                  <Text style={{ color: colors.mutedForeground, textAlign: 'center', marginVertical: 20 }}>
                    No episodes available for this series.
                  </Text>
                )}
              </View>
            </>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  castSection: {
    marginVertical: 8,
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
  episodesList: {
    gap: 12,
  },
  episodeCard: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  epThumbnailContainer: {
    width: 120,
    aspectRatio: 16/9,
    position: 'relative',
    backgroundColor: '#1A1A1A',
  },
  epThumbnail: {
    width: '100%',
    height: '100%',
  },
  epPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  epInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  epLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  epTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  epDuration: {
    fontSize: 12,
  }
});