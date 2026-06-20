import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
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

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  
  const activePlaylistId = useAppStore((s) => s.activePlaylistId);
  const activeCategories = useAppStore((s) => s.activeCategories);
  const getChannelsForCategory = useAppStore((s) => s.getChannelsForCategory);
  
  const [loading, setLoading] = useState(true);
  const [popularChannels, setPopularChannels] = useState<Channel[]>([]);
  const [recentMovies, setRecentMovies] = useState<Channel[]>([]);
  const [featuredItems, setFeaturedItems] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    console.log('[HomeScreen] useEffect triggered. activePlaylistId:', activePlaylistId, 'activeCategories changed reference:', activeCategories ? true : false);
    
    async function loadHomeContent() {
      if (!activePlaylistId || !activeCategories) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        let channelsList: Channel[] = [];
        let moviesList: Channel[] = [];
        
        // Load Live channels
        if (activeCategories.live && activeCategories.live.length > 0) {
          const firstLive = activeCategories.live[0];
          channelsList = await getChannelsForCategory(activePlaylistId, 'live', firstLive.id, firstLive.name);
        }
        
        // Load Movies
        if (activeCategories.vod && activeCategories.vod.length > 0) {
          const firstVod = activeCategories.vod[0];
          moviesList = await getChannelsForCategory(activePlaylistId, 'vod', firstVod.id, firstVod.name);
        }
        
        if (!active) return;
        
        setPopularChannels(channelsList.slice(0, 10));
        
        // Map movies to VOD display objects
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
        
        // Build Featured Items for the carousel
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

  // If no playlist at all, we show empty state (though AuthGuard redirects, let's keep a safety render)
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 80 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { top: insets.top }]}>
          <Text style={[styles.logoText, { color: colors.gold }]}>EN TEC</Text>
          <View style={styles.headerRight}>
            <Pressable style={styles.iconButton} onPress={() => router.push('/(tabs)/live')}>
              <Feather name="search" size={20} color={colors.foreground} />
            </Pressable>
            <Pressable style={styles.iconButton} onPress={() => router.push('/favorites')}>
              <Feather name="heart" size={20} color={colors.foreground} />
            </Pressable>
            <Pressable style={styles.iconButton} onPress={() => router.push('/catchup')}>
              <Feather name="clock" size={20} color={colors.foreground} />
            </Pressable>
            <Pressable style={styles.iconButton} onPress={() => router.push('/playlists')}>
              <Feather name="folder" size={20} color={colors.foreground} />
            </Pressable>
          </View>
        </View>
        
        {featuredItems.length > 0 ? (
          <HeroCarousel 
            items={featuredItems} 
            onPlay={(item) => router.push({ pathname: '/player', params: { streamUrl: item.streamUrl || '', title: item.title, isLive: String(item.subtitle.includes('LIVE')), quality: 'HD' } })} 
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
              renderItem={({ item }) => (
                <ChannelCard 
                  channel={item} 
                  width={128} 
                  onPress={() => router.push({ 
                    pathname: '/player', 
                    params: { 
                      streamUrl: item.streamUrl, 
                      title: item.name,
                      isLive: 'true',
                      current: item.current,
                      next: item.next,
                      quality: item.quality,
                    } 
                  })} 
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
                    router.push({
                      pathname: '/movie-detail',
                      params: {
                        id: item.id,
                        title: item.title,
                        poster: item.poster,
                        backdrop: item.backdrop || item.poster,
                        quality: item.quality,
                        genres: item.genres.join(','),
                        description: item.description,
                        streamUrl: item.streamUrl || '',
                      },
                    });
                  }} 
                />
              )}
            />
          )}

          {popularChannels.length === 0 && recentMovies.length === 0 && (
            <View style={{ alignItems: 'center', padding: 40, gap: 12 }}>
              <Feather name="tv" size={48} color={colors.mutedForeground} />
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold' }}>Playlist has no channels</Text>
              <Text style={{ color: colors.mutedForeground, textAlign: 'center' }}>
                Add another playlist or wait for update.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingTop: 32,
  }
});