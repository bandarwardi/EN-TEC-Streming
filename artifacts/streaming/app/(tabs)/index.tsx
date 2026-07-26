import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, useWindowDimensions, Platform, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Lineicons } from '@lineiconshq/react-native-lineicons';
import { MonitorBulk, PlayBulk, QuestionMarkCircleBulk } from '@lineiconshq/free-icons';
import { HeroCarousel } from '@/components/HeroCarousel';
import { ContentRow } from '@/components/ContentRow';
import { ChannelCard } from '@/components/ChannelCard';
import { MovieCard } from '@/components/MovieCard';
import { ContinueWatchingCard } from '@/components/ContinueWatchingCard';
import { HeroSkeleton } from '@/components/HeroSkeleton';
import { TVFocusable } from '@/components/TVFocusable';
import { router } from 'expo-router';
import { useAppStore } from '@/store/app-store';
import { Channel } from '@/types';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { base64Decode } from '@/lib/base64';
import { useIsFocused } from '@react-navigation/native';

export default function HomeScreen() {
  const isFocused = useIsFocused();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLargeScreen = width >= 1024 || Platform.isTV;

  const activePlaylistId = useAppStore((s) => s.activePlaylistId);
  const activeCategories = useAppStore((s) => s.activeCategories);
  const getChannelsForCategory = useAppStore((s) => s.getChannelsForCategory);
  const setPlaybackQueue = useAppStore((s) => s.setPlaybackQueue);
  const playlists = useAppStore((s) => s.playlists);
  const cachedHomeContent = useAppStore((s) => s.cachedHomeContent);
  const setCachedHomeContent = useAppStore((s) => s.setCachedHomeContent);

  const [loading, setLoading] = useState(true);
  const [contentRows, setContentRows] = useState<{ title: string; type: 'live' | 'vod' | 'series'; categoryId: string; items: any[] }[]>([]);
  const [featuredItems, setFeaturedItems] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const subscriptionExpired = useAppStore((s) => s.subscriptionExpired);
  const setSubscriptionExpired = useAppStore((s) => s.setSubscriptionExpired);

  const continueWatching = useAppStore((s) => s.continueWatching) || [];
  const favoriteItems = useAppStore((s) => s.favoriteItems) || [];
  const favoriteChannels = favoriteItems.filter((item) => item.type === 'live' || item.isLive === true || (item.isLive as unknown) === 'true');
  const [refreshKey, setRefreshKey] = useState(0);

  const onRefresh = () => {
    setRefreshing(true);
    setRefreshKey(prev => prev + 1);
  };



  useEffect(() => {
    let active = true;

    async function loadHomeContent() {
      if (!activePlaylistId || !activeCategories) {
        setLoading(false);
        return;
      }

      const hasValidCache = cachedHomeContent && cachedHomeContent.playlistId === activePlaylistId && cachedHomeContent.rows.length > 0;

      if (hasValidCache) {
        setContentRows(cachedHomeContent.rows);
        setFeaturedItems(cachedHomeContent.featured);
        
        if (refreshKey === 0) {
          setLoading(false);
          return;
        }
        
        // When refreshing, don't show the full page skeleton
        setLoading(false);
      } else {
        setLoading(true);
      }

      setSubscriptionExpired(false);
      try {
        const activePlaylist = playlists.find(p => p.id === activePlaylistId);
        let config: any = null;
        if (activePlaylist && activePlaylist.url) {
          if (activePlaylist.url.startsWith('xtream://')) {
            try { config = JSON.parse(base64Decode(activePlaylist.url.replace('xtream://', ''))); } catch (e) { }
          } else {
            const match = activePlaylist.url.match(/^(https?:\/\/[^/]+)\/get\.php\?username=([^&]+)&password=([^&]+)/);
            if (match) config = { host: match[1], username: match[2], password: match[3] };
          }
          if (config) {
            try {
              // Quick check for expired subscription to avoid infinite loading loop
              const authRes = await Promise.race([
                fetch(`${config.host}/player_api.php?username=${config.username}&password=${config.password}`, {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                  }
                }),
                new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 5000))
              ]) as Response;

              if (authRes.ok) {
                const data = await authRes.json();
                if (data && data.user_info && data.user_info.status !== 'Active') {
                  if (active) {
                    setSubscriptionExpired(true);
                    setLoading(false);
                  }
                  return;
                }
              }
            } catch (err) {
              console.warn('Auth check failed or timed out, proceeding with stream fetch...', err);
            }
          }
        }

        if (active && !hasValidCache) {
          setContentRows([]);
          setFeaturedItems([]);
        }

        let primaryHeroPool: Channel[] = [];
        let fallbackHeroPool: Channel[] = [];
        let accumulatedRows: any[] = [];

        const addRow = async (type: 'live' | 'vod' | 'series', category: any) => {
          if (!category) return false;
          const items = await getChannelsForCategory(activePlaylistId, type, category.id, category.name);
          if (items.length > 0) {
            if (type !== 'live') fallbackHeroPool.push(...items);
            if (type === 'series') primaryHeroPool.push(...items);
            const mapped = items.slice(0, 15).map(m => {
              if (type === 'live') return m;
              return {
                id: m.id,
                title: m.name,
                poster: m.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=1A1A1A&color=D4A843&bold=true&size=300&format=svg`,
                backdrop: m.logo,
                rating: 0,
                year: 0,
                duration: '',
                quality: m.quality,
                genres: [m.category],
                description: '',
                streamUrl: m.streamUrl,
              };
            });
            const newRow = {
              title: category.name,
              type,
              categoryId: category.id,
              items: mapped
            };
            if (active) {
              accumulatedRows.push(newRow);
            }
            return true;
          }
          return false;
        };

        let rowCount = 0;
        const MAX_ROWS = 6;

        const fillRows = async (type: 'live' | 'vod' | 'series', categories: any[], targetRows: number) => {
          let count = 0;
          for (let i = 0; i < categories.length; i++) {
            if (rowCount >= MAX_ROWS || count >= targetRows) break;
            const added = await addRow(type, categories[i]);
            if (added) {
              count++;
              rowCount++;
              // Removed 400ms delay for faster loading (since we now have caching)
            }
          }
        };

        // Shuffle categories to get dynamic rows and diverse hero pool on every load
        const shuffledSeries = [...(activeCategories.series || [])].sort(() => 0.5 - Math.random());
        const shuffledVod = [...(activeCategories.vod || [])].sort(() => 0.5 - Math.random());
        const shuffledLive = [...(activeCategories.live || [])].sort(() => 0.5 - Math.random());

        // Load series, vod, and live rows in parallel to speed up home screen loading
        await Promise.all([
          fillRows('series', shuffledSeries, 2),
          fillRows('vod', shuffledVod, 2),
          fillRows('live', shuffledLive, 2),
        ]);

        if (!active) return;

        const pool = primaryHeroPool.length > 0 ? primaryHeroPool : fallbackHeroPool;
        const shuffledPool = [...pool].sort(() => 0.5 - Math.random());
        const top5 = shuffledPool.slice(0, 5);

        const mappedFeatured = await Promise.all(top5.map(async (item) => {
          let backdropUri = item.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=1A1A1A&color=D4A843&bold=true&size=300&format=svg`;
          let description = item.type === 'live' ? `Live Channel · ${item.category}` : item.type === 'series' ? `TV Series · ${item.category}` : `Movie VOD · ${item.category}`;

          if (item.type === 'series' && config && item.id.startsWith('xt_series_')) {
            try {
              const seriesId = item.id.replace('xt_series_', '');
              const fetchUrl = `${config.host}/player_api.php?username=${config.username}&password=${config.password}&action=get_series_info&series_id=${seriesId}`;

              const text = await new Promise<string>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', fetchUrl, true);
                xhr.timeout = 10000;
                xhr.onload = () => {
                  if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.responseText || '');
                  else reject(new Error('error'));
                };
                xhr.onerror = () => reject(new Error('error'));
                xhr.ontimeout = () => reject(new Error('timeout'));
                xhr.send();
              });

              const data = JSON.parse(text);
              if (data && data.info) {
                const fetchedBackdrop = data.info.backdrop_path && Array.isArray(data.info.backdrop_path) && data.info.backdrop_path.length > 0
                  ? data.info.backdrop_path[0]
                  : data.info.backdrop_path && typeof data.info.backdrop_path === 'string'
                    ? data.info.backdrop_path
                    : '';
                if (fetchedBackdrop) {
                  backdropUri = fetchedBackdrop;
                }
                if (data.info.plot) {
                  description = data.info.plot;
                }
              }
            } catch (err) {
              // Ignore failure for individual items
            }
          }

          return {
            id: item.id,
            title: item.name,
            subtitle: item.type === 'live' ? 'FEATURED LIVE TV' : item.type === 'series' ? 'FEATURED SERIES' : 'FEATURED MOVIE',
            backdrop: { uri: backdropUri },
            poster: { uri: item.logo },
            description,
            rating: 8.5,
            year: 2026,
            duration: item.type === 'live' ? 'LIVE' : 'VOD',
            genres: [item.category],
            streamUrl: item.streamUrl,
            originalItem: item,
          };
        }));

        if (active) {
          setContentRows(accumulatedRows);
          setFeaturedItems(mappedFeatured);
          setCachedHomeContent(activePlaylistId, accumulatedRows, mappedFeatured);
        }
      } catch (err) {
        console.error('Error loading Home content:', err);
      } finally {
        if (active) {
          setRefreshing(false);
          setLoading(false);
        }
      }
    }

    loadHomeContent();

    return () => {
      active = false;
    };
  }, [activePlaylistId, activeCategories, refreshKey]);

  if (subscriptionExpired) {
    return (
      <View style={[styles.container, {
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        position: 'absolute',
        top: 0, bottom: 0, left: isLargeScreen ? -80 : 0, right: 0,
        zIndex: 9999,
        elevation: 9999
      }]}>
        <Ionicons name="warning-outline" size={64} color="#EF4444" />
        <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold', marginTop: 16 }}>Subscription Expired</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 16, marginTop: 8, textAlign: 'center', maxWidth: 400 }}>
          Your IPTV subscription has expired or is inactive. Please contact your provider to renew your subscription.
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginTop: 24 }}>
          <TVFocusable
            style={{ backgroundColor: colors.gold, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
            onPress={() => router.push('/playlists')}
          >
            <Text style={{ color: '#1A1A1A', fontWeight: 'bold', fontSize: 16 }}>Manage Playlists</Text>
          </TVFocusable>
          <TVFocusable
            style={{ backgroundColor: '#25D366', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}
            onPress={() => {
              const { Linking } = require('react-native');
              Linking.openURL('https://wa.me/17085844733?text=' + encodeURIComponent('I want to renew my subscription'));
            }}
          >
            <Ionicons name="logo-whatsapp" size={20} color="#FFF" />
            <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>+17085844733</Text>
          </TVFocusable>
        </View>
      </View>
    );
  }

  if (!activePlaylistId) {
    return (
      <View style={[styles.container, { backgroundColor: isLargeScreen ? 'transparent' : colors.background, justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Lineicons icon={MonitorBulk} size={48} color={colors.mutedForeground} />
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginTop: 12 }}>No playlist active</Text>
        <TVFocusable
          style={{ marginTop: 16, backgroundColor: colors.gold, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}
          onPress={() => router.push('/playlists')}
        >
          <Text style={{ color: '#1A1A1A', fontWeight: 'bold' }}>Manage Playlists</Text>
        </TVFocusable>
      </View>
    );
  }

  // --- TV Layout ---
  if (isLargeScreen) {
    const heroItem = featuredItems[0]; // Take the first featured item as the main hero

    return (
      <View style={[styles.container, { backgroundColor: '#000', opacity: isFocused ? 1 : 0, pointerEvents: isFocused ? 'auto' : 'none' }]}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          {loading ? (
            <HeroSkeleton />
          ) : heroItem ? (
            <View style={{ width: '100%', height: height * 0.75 }}>
              <Image source={heroItem.backdrop} style={StyleSheet.absoluteFill} contentFit="cover" />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.6)', '#000']}
                locations={[0, 0.4, 1]}
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                colors={['#000', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.5, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={[styles.tvHeroContent, { position: 'absolute', bottom: 120, left: 0 }]}>
                <Text style={[styles.tvHeroSubtitle, { color: colors.gold }]}>{heroItem.subtitle}</Text>
                <Text style={styles.tvHeroTitle} numberOfLines={1}>{heroItem.title}</Text>
                <View style={styles.tvHeroMeta}>
                  <Text style={styles.tvHeroMetaText}>{heroItem.year}</Text>
                  <View style={styles.tvHeroDot} />
                  <Text style={styles.tvHeroMetaText}>{heroItem.duration}</Text>
                  <View style={styles.tvHeroDot} />
                  <Text style={styles.tvHeroMetaText}>{heroItem.genres.join(', ')}</Text>
                </View>
                <Text style={styles.tvHeroDesc} numberOfLines={2}>{heroItem.description}</Text>

                <View style={styles.tvHeroActions}>
                  <TVFocusable
                    style={({ focused }: any) => [
                      styles.tvHeroBtnPrimary,
                      { backgroundColor: focused ? colors.gold : '#FFF' }
                    ]}
                    onPress={() => {
                      if (heroItem.originalItem.type === 'live') {
                        router.push({ pathname: '/player', params: { streamUrl: heroItem.streamUrl || '', title: heroItem.title, isLive: 'true', quality: 'HD' } });
                      } else if (heroItem.originalItem.type === 'series') {
                        router.push({ pathname: '/series-detail', params: { id: heroItem.id, title: heroItem.title, poster: heroItem.backdrop?.uri, backdrop: heroItem.backdrop?.uri, genres: heroItem.genres.join(','), description: heroItem.description, streamUrl: heroItem.streamUrl || '' } });
                      } else {
                        router.push({ pathname: '/movie-detail', params: { id: heroItem.id, title: heroItem.title, poster: heroItem.backdrop?.uri, backdrop: heroItem.backdrop?.uri, quality: 'HD', genres: heroItem.genres.join(','), description: heroItem.description, streamUrl: heroItem.streamUrl || '' } });
                      }
                    }}
                    scaleAmount={1.05}
                  >
                    {({ focused }: any) => (
                      <>
                        <Lineicons icon={PlayBulk} size={24} color="#000" />
                        <Text style={[styles.tvHeroBtnPrimaryText, { color: '#000' }]}>Play Now</Text>
                      </>
                    )}
                  </TVFocusable>


                </View>
              </View>
            </View>
          ) : null}

          <View style={styles.tvBottomContent}>
            {favoriteChannels.length > 0 && (
              <ContentRow
                title="Favorite Channels"
                data={favoriteChannels}
                onSeeAll={() => router.push('/(tabs)/favorites')}
                renderItem={({ item, index: itemIndex }) => (
                  <ChannelCard
                    channel={item}
                    width={200}
                    onPress={() => {
                      setPlaybackQueue(favoriteChannels, itemIndex);
                      router.push({
                        pathname: '/player',
                        params: {
                          id: item.id,
                          streamUrl: item.streamUrl,
                          title: item.name || item.title,
                          isLive: 'true',
                          current: item.current || '',
                          next: item.next || '',
                          quality: item.quality || 'HD',
                          logo: item.logo || item.poster || '',
                          category: item.category || ''
                        }
                      });
                    }}
                  />
                )}
              />
            )}
            {continueWatching.length > 0 && (
              <ContentRow
                title="Continue Watching"
                data={continueWatching}
                onSeeAll={() => router.push('/continue-watching')}
                renderItem={({ item }) => (
                  <ContinueWatchingCard
                    item={item}
                    onPress={() => {
                      router.push({
                        pathname: '/player',
                        params: { id: item.id, streamUrl: item.streamUrl, title: item.title, isLive: item.type === 'live' ? 'true' : 'false', current: item.current || '', next: item.next || '', quality: item.quality, logo: item.poster || item.backdrop || '', category: item.category || '', autoResume: 'true' }
                      });
                    }}
                  />
                )}
              />
            )}
            {contentRows.map((row, index) => (
              <ContentRow
                key={`tv-row-${index}`}
                title={row.title}
                data={row.items}
                onSeeAll={() => {
                  const tab = row.type === 'live' ? '/(tabs)/live' : row.type === 'vod' ? '/(tabs)/movies' : '/(tabs)/series';
                  router.push({ pathname: tab, params: { categoryId: row.categoryId } });
                }}
                renderItem={({ item, index: itemIndex }) =>
                  row.type === 'live' ? (
                    <ChannelCard
                      channel={item}
                      width={200}
                      onPress={() => {
                        setPlaybackQueue(row.items, itemIndex);
                        router.push({ pathname: '/player', params: { id: item.id, streamUrl: item.streamUrl, title: item.name, isLive: 'true', current: item.current, next: item.next, quality: item.quality, logo: item.logo || '', category: item.category || '' } });
                      }}
                    />
                  ) : (
                    <MovieCard
                      movie={item}
                      width={160}
                      onPress={() => {
                        if (row.type === 'series') {
                          router.push({
                            pathname: '/series-detail',
                            params: { id: item.id, title: item.title || item.name, poster: item.poster || item.logo, backdrop: item.backdrop || item.poster || item.logo, quality: item.quality, genres: item.genres?.join(',') || '', description: item.description, streamUrl: item.streamUrl || '' },
                          });
                        } else {
                          router.push({
                            pathname: '/movie-detail',
                            params: { id: item.id, title: item.title, poster: item.poster, backdrop: item.backdrop || item.poster, quality: item.quality, genres: item.genres.join(','), description: item.description, streamUrl: item.streamUrl || '' },
                          });
                        }
                      }}
                    />
                  )
                }
              />
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  // --- Mobile Layout ---
  return (
    <View style={[styles.container, { backgroundColor: isLargeScreen ? 'transparent' : colors.background, opacity: isFocused ? 1 : 0, pointerEvents: isFocused ? 'auto' : 'none' }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        scrollEventThrottle={100}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />
        }
      >

        {loading ? (
          <HeroSkeleton />
        ) : featuredItems.length > 0 ? (
          <HeroCarousel
            items={featuredItems}
            onPlay={(item) => {
              if (item.subtitle.includes('LIVE')) {
                router.push({ pathname: '/player', params: { streamUrl: item.streamUrl || '', title: item.title, isLive: 'true', quality: 'HD' } });
              } else if (item.originalItem?.type === 'series') {
                router.push({ pathname: '/series-detail', params: { id: item.id, title: item.title, poster: item.backdrop?.uri, backdrop: item.backdrop?.uri, genres: item.genres.join(','), description: item.description, streamUrl: item.streamUrl || '' } });
              } else {
                router.push({ pathname: '/movie-detail', params: { id: item.id, title: item.title, poster: item.backdrop?.uri, backdrop: item.backdrop?.uri, quality: 'HD', genres: item.genres.join(','), description: item.description, streamUrl: item.streamUrl || '' } });
              }
            }}
            onInfo={(item) => {
              if (item.subtitle.includes('LIVE')) {
                router.push({ pathname: '/player', params: { streamUrl: item.streamUrl || '', title: item.title, isLive: 'true', current: item.description || '', quality: 'HD' } });
              } else if (item.originalItem?.type === 'series') {
                router.push({ pathname: '/series-detail', params: { id: item.id, title: item.title, poster: typeof item.backdrop === 'object' && 'uri' in item.backdrop ? item.backdrop.uri : '', backdrop: typeof item.backdrop === 'object' && 'uri' in item.backdrop ? item.backdrop.uri : '', genres: item.genres.join(','), description: item.description || '', streamUrl: item.streamUrl || '' } });
              } else {
                router.push({ pathname: '/movie-detail', params: { id: item.id, title: item.title, poster: typeof item.backdrop === 'object' && 'uri' in item.backdrop ? item.backdrop.uri : '', backdrop: typeof item.backdrop === 'object' && 'uri' in item.backdrop ? item.backdrop.uri : '', quality: 'HD', genres: item.genres.join(','), description: item.description || '', streamUrl: item.streamUrl || '' } });
              }
            }}
          />
        ) : (
          <View style={{ height: 100 }} />
        )}

        <View style={styles.content}>
          {favoriteChannels.length > 0 && (
            <ContentRow
              title="Favorite Channels"
              data={favoriteChannels}
              onSeeAll={() => router.push('/(tabs)/favorites')}
              renderItem={({ item, index: itemIndex }) => (
                <ChannelCard
                  channel={item}
                  width={160}
                  onPress={() => {
                    setPlaybackQueue(favoriteChannels, itemIndex);
                    router.push({
                      pathname: '/player',
                      params: {
                        id: item.id,
                        streamUrl: item.streamUrl,
                        title: item.name || item.title,
                        isLive: 'true',
                        current: item.current || '',
                        next: item.next || '',
                        quality: item.quality || 'HD',
                        logo: item.logo || item.poster || '',
                        category: item.category || ''
                      }
                    });
                  }}
                />
              )}
            />
          )}
          {continueWatching.length > 0 && (
            <ContentRow
              title="Continue Watching"
              data={continueWatching}
              onSeeAll={() => router.push('/continue-watching')}
              renderItem={({ item }) => (
                <ContinueWatchingCard
                  item={item}
                  onPress={() => {
                    router.push({
                      pathname: '/player',
                      params: {
                        id: item.id,
                        streamUrl: item.streamUrl,
                        title: item.title,
                        isLive: item.type === 'live' ? 'true' : 'false',
                        quality: item.quality || 'HD',
                        poster: typeof item.poster === 'object' ? item.poster?.uri : item.poster,
                        backdrop: typeof item.backdrop === 'object' ? item.backdrop?.uri : item.backdrop,
                        description: item.description,
                        category: item.category,
                        autoResume: 'true'
                      }
                    });
                  }}
                />
              )}
            />
          )}

          {contentRows.map((row, index) => (
            <ContentRow
              key={`mobile-row-${index}`}
              title={row.title}
              data={row.items}
              onSeeAll={() => {
                const tab = row.type === 'live' ? '/(tabs)/live' : row.type === 'vod' ? '/(tabs)/movies' : '/(tabs)/series';
                router.push({ pathname: tab, params: { categoryId: row.categoryId } });
              }}
              renderItem={({ item, index: itemIndex }) =>
                row.type === 'live' ? (
                  <ChannelCard
                    channel={item}
                    width={160}
                    onPress={() => {
                      setPlaybackQueue(row.items, itemIndex);
                      router.push({ pathname: '/player', params: { id: item.id, streamUrl: item.streamUrl, title: item.name, isLive: 'true', current: item.current, next: item.next, quality: item.quality, logo: item.logo || '', category: item.category || '' } });
                    }}
                  />
                ) : row.type === 'series' ? (
                  <MovieCard
                    movie={item}
                    width={110}
                    onPress={() => {
                      router.push({
                        pathname: '/series-detail',
                        params: { id: item.id, title: item.title, poster: item.poster, backdrop: item.backdrop || item.poster, genres: item.genres.join(','), description: item.description, streamUrl: item.streamUrl || '' },
                      });
                    }}
                  />
                ) : (
                  <MovieCard
                    movie={item}
                    width={110}
                    onPress={() => {
                      router.push({
                        pathname: '/movie-detail',
                        params: { id: item.id, title: item.title, poster: item.poster, backdrop: item.backdrop || item.poster, quality: item.quality, genres: item.genres.join(','), description: item.description, streamUrl: item.streamUrl || '' },
                      });
                    }}
                  />
                )
              }
            />
          ))}

          {contentRows.length === 0 && (
            <View style={{ alignItems: 'center', padding: 40, gap: 12 }}>
              <Lineicons icon={MonitorBulk} size={48} color={colors.mutedForeground} />
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold' }}>Playlist has no content</Text>
              <Text style={{ color: colors.mutedForeground, textAlign: 'center' }}>Add another playlist or wait for update.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // TV Styles
  tvHeroContent: { paddingLeft: 32, paddingRight: 40, width: '60%', position: 'absolute', bottom: 120 },
  tvHeroSubtitle: { fontSize: 16, fontWeight: 'bold', letterSpacing: 2, marginBottom: 12 },
  tvHeroTitle: { fontSize: 48, fontWeight: '900', color: '#FFF', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 10, marginBottom: 16 },
  tvHeroMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  tvHeroMetaText: { color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: '600' },
  tvHeroDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.5)' },
  tvHeroDesc: { fontSize: 18, color: 'rgba(255,255,255,0.7)', lineHeight: 28, marginBottom: 40, maxWidth: '90%' },
  tvHeroActions: { flexDirection: 'row', gap: 16 },
  tvHeroBtnPrimary: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 30 },
  tvHeroBtnPrimaryText: { fontSize: 18, fontWeight: 'bold' },
  tvHeroBtnSecondary: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 30, borderWidth: 2, borderColor: 'transparent' },
  tvHeroBtnSecondaryText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  tvBottomContent: { paddingLeft: 32, paddingRight: 40, marginTop: -80 },

  // Mobile Styles
  header: { position: 'absolute', zIndex: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logoText: { fontSize: 20, fontWeight: '900', textShadowColor: 'rgba(0,0,0,1)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  headerRight: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  iconButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  subscribeBtn: { backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  subscribeText: { color: '#000', fontWeight: 'bold', fontSize: 13 },
  content: { paddingTop: 24 }
});
