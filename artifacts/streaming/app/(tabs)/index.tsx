import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, useWindowDimensions, Platform } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { HeroCarousel } from '@/components/HeroCarousel';
import { ContentRow } from '@/components/ContentRow';
import { ChannelCard } from '@/components/ChannelCard';
import { MovieCard } from '@/components/MovieCard';
import { router } from 'expo-router';
import { useAppStore } from '@/store/app-store';
import { Channel } from '@/types';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768 || Platform.isTV;
  
  const activePlaylistId = useAppStore((s) => s.activePlaylistId);
  const activeCategories = useAppStore((s) => s.activeCategories);
  const getChannelsForCategory = useAppStore((s) => s.getChannelsForCategory);
  const setPlaybackQueue = useAppStore((s) => s.setPlaybackQueue);
  
  const [loading, setLoading] = useState(true);
  const [popularChannels, setPopularChannels] = useState<Channel[]>([]);
  const [recentMovies, setRecentMovies] = useState<Channel[]>([]);
  const [featuredItems, setFeaturedItems] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    
    async function loadHomeContent() {
      if (!activePlaylistId || !activeCategories) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        let channelsList: Channel[] = [];
        let moviesList: Channel[] = [];
        
        if (activeCategories.live && activeCategories.live.length > 0) {
          const firstLive = activeCategories.live[0];
          channelsList = await getChannelsForCategory(activePlaylistId, 'live', firstLive.id, firstLive.name);
        }
        
        if (activeCategories.vod && activeCategories.vod.length > 0) {
          const firstVod = activeCategories.vod[0];
          moviesList = await getChannelsForCategory(activePlaylistId, 'vod', firstVod.id, firstVod.name);
        }
        
        if (!active) return;
        
        setPopularChannels(channelsList.slice(0, 10));
        
        const mappedMovies = moviesList.map((m) => ({
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
        }));
        setRecentMovies(mappedMovies.slice(0, 10) as any);
        
        const pool = moviesList.length > 0 ? moviesList : channelsList;
        const mappedFeatured = pool.slice(0, 5).map((item) => ({
          id: item.id,
          title: item.name,
          subtitle: item.type === 'live' ? 'FEATURED LIVE TV' : 'FEATURED MOVIE',
          backdrop: { uri: item.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=1A1A1A&color=D4A843&bold=true&size=300&format=svg` },
          description: item.type === 'live' ? `Live Channel · ${item.category}` : `Movie VOD · ${item.category}`,
          rating: 8.5,
          year: 2026,
          duration: item.type === 'live' ? 'LIVE' : 'VOD',
          genres: [item.category],
          streamUrl: item.streamUrl,
          originalItem: item,
        }));
        
        setFeaturedItems(mappedFeatured);
      } catch (err) {
        console.error('Error loading Home content:', err);
      } finally {
        if (active) setLoading(false);
      }
    }
    
    loadHomeContent();
    
    return () => {
      active = false;
    };
  }, [activePlaylistId, activeCategories]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.gold} />
        <Text style={{ color: colors.mutedForeground, marginTop: 12 }}>Loading Home content...</Text>
      </View>
    );
  }

  if (!activePlaylistId) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Feather name="tv" size={48} color={colors.mutedForeground} />
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginTop: 12 }}>No playlist active</Text>
        <Pressable 
          style={{ marginTop: 16, backgroundColor: colors.gold, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}
          onPress={() => router.push('/playlists')}
        >
          <Text style={{ color: '#1A1A1A', fontWeight: 'bold' }}>Manage Playlists</Text>
        </Pressable>
      </View>
    );
  }

  // --- TV Layout ---
  if (isLargeScreen) {
    const heroItem = featuredItems[0]; // Take the first featured item as the main hero
    
    return (
      <View style={[styles.container, { backgroundColor: '#000' }]}>
        {heroItem ? (
          <View style={StyleSheet.absoluteFill}>
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
            <View style={[styles.tvHeroContent, { paddingTop: insets.top + 60 }]}>
              <Text style={[styles.tvHeroSubtitle, { color: colors.gold }]}>{heroItem.subtitle}</Text>
              <Text style={styles.tvHeroTitle} numberOfLines={2}>{heroItem.title}</Text>
              <View style={styles.tvHeroMeta}>
                <Text style={styles.tvHeroMetaText}>{heroItem.year}</Text>
                <View style={styles.tvHeroDot} />
                <Text style={styles.tvHeroMetaText}>{heroItem.duration}</Text>
                <View style={styles.tvHeroDot} />
                <Text style={styles.tvHeroMetaText}>{heroItem.genres.join(', ')}</Text>
              </View>
              <Text style={styles.tvHeroDesc} numberOfLines={3}>{heroItem.description}</Text>
              
              <View style={styles.tvHeroActions}>
                <Pressable
                  style={({ focused }) => [
                    styles.tvHeroBtnPrimary,
                    { backgroundColor: focused ? colors.gold : '#FFF' },
                    focused && { transform: [{ scale: 1.05 }] }
                  ]}
                  onPress={() => {
                    if (heroItem.subtitle.includes('LIVE')) {
                      router.push({ pathname: '/player', params: { streamUrl: heroItem.streamUrl || '', title: heroItem.title, isLive: 'true', quality: 'HD' } });
                    } else {
                      router.push({ pathname: '/movie-detail', params: { id: heroItem.id, title: heroItem.title, poster: heroItem.backdrop?.uri, backdrop: heroItem.backdrop?.uri, quality: 'HD', genres: heroItem.genres.join(','), description: heroItem.description, streamUrl: heroItem.streamUrl || '' } });
                    }
                  }}
                >
                  {({ focused }) => (
                    <>
                      <Feather name="play" size={24} color="#000" />
                      <Text style={[styles.tvHeroBtnPrimaryText, { color: '#000' }]}>Play Now</Text>
                    </>
                  )}
                </Pressable>
                
                <Pressable
                  style={({ focused }) => [
                    styles.tvHeroBtnSecondary,
                    { backgroundColor: focused ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)' },
                    focused && { transform: [{ scale: 1.05 }], borderColor: '#FFF' }
                  ]}
                >
                  <Feather name="info" size={24} color="#FFF" />
                  <Text style={styles.tvHeroBtnSecondaryText}>More Info</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}

        {/* Content Rows layered on bottom */}
        <View style={styles.tvBottomContent}>
           {recentMovies.length > 0 && (
            <ContentRow 
              title="Latest Movies" 
              data={recentMovies}
              onSeeAll={() => router.push('/(tabs)/movies')}
              renderItem={({ item }) => (
                <MovieCard 
                  movie={item} 
                  width={160} 
                  onPress={() => {
                    router.push({
                      pathname: '/movie-detail',
                      params: { id: item.id, title: item.title, poster: item.poster, backdrop: item.backdrop || item.poster, quality: item.quality, genres: item.genres.join(','), description: item.description, streamUrl: item.streamUrl || '' },
                    });
                  }} 
                />
              )}
            />
          )}
        </View>
      </View>
    );
  }

  // --- Mobile Layout ---
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 80 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { top: insets.top }]}>
          <Text style={[styles.logoText, { color: colors.gold }]}>EN TEC</Text>
          <View style={styles.headerRight}>
            <Pressable style={styles.iconButton} onPress={() => router.push('/search')}><Feather name="search" size={20} color={colors.foreground} /></Pressable>
            <Pressable style={styles.iconButton} onPress={() => router.push('/favorites')}><Feather name="heart" size={20} color={colors.foreground} /></Pressable>
            <Pressable style={styles.iconButton} onPress={() => router.push('/catchup')}><Feather name="clock" size={20} color={colors.foreground} /></Pressable>
            <Pressable style={styles.iconButton} onPress={() => router.push('/playlists')}><Feather name="folder" size={20} color={colors.foreground} /></Pressable>
          </View>
        </View>
        
        {featuredItems.length > 0 ? (
          <HeroCarousel 
            items={featuredItems} 
            onPlay={(item) => router.push({ pathname: '/player', params: { streamUrl: item.streamUrl || '', title: item.title, isLive: String(item.subtitle.includes('LIVE')), quality: 'HD' } })} 
            onInfo={(item) => {
              if (item.subtitle.includes('LIVE')) {
                router.push({ pathname: '/player', params: { streamUrl: item.streamUrl || '', title: item.title, isLive: 'true', current: item.description || '', quality: 'HD' } });
              } else {
                router.push({ pathname: '/movie-detail', params: { id: item.id, title: item.title, poster: typeof item.backdrop === 'object' && 'uri' in item.backdrop ? item.backdrop.uri : '', backdrop: typeof item.backdrop === 'object' && 'uri' in item.backdrop ? item.backdrop.uri : '', quality: 'HD', genres: item.genres.join(','), description: item.description || '', streamUrl: item.streamUrl || '' } });
              }
            }}
          />
        ) : (
          <View style={{ height: 100 }} />
        )}
        
        <View style={styles.content}>
          {popularChannels.length > 0 && (
            <ContentRow 
              title="Popular Channels" 
              data={popularChannels}
              onSeeAll={() => router.push('/(tabs)/live')}
              renderItem={({ item, index }) => (
                <ChannelCard 
                  channel={item} 
                  width={128} 
                  onPress={() => {
                    setPlaybackQueue(popularChannels, index);
                    router.push({ pathname: '/player', params: { id: item.id, streamUrl: item.streamUrl, title: item.name, isLive: 'true', current: item.current, next: item.next, quality: item.quality, logo: item.logo || '', category: item.category || '' } });
                  }} 
                />
              )}
            />
          )}
          
          {recentMovies.length > 0 && (
            <ContentRow 
              title="Recently Added Movies" 
              data={recentMovies}
              onSeeAll={() => router.push('/(tabs)/movies')}
              renderItem={({ item }) => (
                <MovieCard 
                  movie={item} 
                  width={110} 
                  onPress={() => {
                    router.push({ pathname: '/movie-detail', params: { id: item.id, title: item.title, poster: item.poster, backdrop: item.backdrop || item.poster, quality: item.quality, genres: item.genres.join(','), description: item.description, streamUrl: item.streamUrl || '' } });
                  }} 
                />
              )}
            />
          )}

          {popularChannels.length === 0 && recentMovies.length === 0 && (
            <View style={{ alignItems: 'center', padding: 40, gap: 12 }}>
              <Feather name="tv" size={48} color={colors.mutedForeground} />
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold' }}>Playlist has no channels</Text>
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
  tvHeroContent: { paddingHorizontal: 64, width: '60%' },
  tvHeroSubtitle: { fontSize: 16, fontWeight: 'bold', letterSpacing: 2, marginBottom: 12 },
  tvHeroTitle: { fontSize: 64, fontWeight: '900', color: '#FFF', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 10, marginBottom: 16 },
  tvHeroMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  tvHeroMetaText: { color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: '600' },
  tvHeroDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.5)' },
  tvHeroDesc: { fontSize: 18, color: 'rgba(255,255,255,0.7)', lineHeight: 28, marginBottom: 40, maxWidth: '90%' },
  tvHeroActions: { flexDirection: 'row', gap: 16 },
  tvHeroBtnPrimary: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 30 },
  tvHeroBtnPrimaryText: { fontSize: 18, fontWeight: 'bold' },
  tvHeroBtnSecondary: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 30, borderWidth: 2, borderColor: 'transparent' },
  tvHeroBtnSecondaryText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  tvBottomContent: { position: 'absolute', bottom: 40, left: 0, right: 0, paddingHorizontal: 64 },
  
  // Mobile Styles
  header: { position: 'absolute', left: 20, right: 20, zIndex: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  logoText: { fontSize: 20, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  headerRight: { flexDirection: 'row', gap: 12 },
  iconButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  content: { paddingTop: 32 }
});