import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Pressable, 
  TextInput, 
  ActivityIndicator, 
  Dimensions 
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { TVFocusable } from '@/components/TVFocusable';
import { useAppStore } from '@/store/app-store';
import { Channel } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type SearchTab = 'all' | 'live' | 'vod' | 'series';

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const activePlaylistId = useAppStore((s) => s.activePlaylistId);
  const searchIndexReady = useAppStore((s) => s.searchIndexReady);
  const loadingSearchIndex = useAppStore((s) => s.loadingSearchIndex);
  const searchIndexProgress = useAppStore((s) => s.searchIndexProgress);
  const loadSearchIndex = useAppStore((s) => s.loadSearchIndex);
  const buildSearchIndex = useAppStore((s) => s.buildSearchIndex);
  const searchChannels = useAppStore((s) => s.searchChannels);
  const setPlaybackQueue = useAppStore((s) => s.setPlaybackQueue);

  const [query, setQuery] = useState('');
  const [filteredResults, setFilteredResults] = useState<Channel[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const [statusMessage, setStatusMessage] = useState('');
  const [hasAttemptedAutoBuild, setHasAttemptedAutoBuild] = useState(false);
  const inputRef = useRef<any>(null);

  // Auto-focus input after screen transition completes
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(t);
  }, []);

  // Auto-build search index if empty
  useEffect(() => {
    if (activePlaylistId && !searchIndexReady && !loadingSearchIndex && !hasAttemptedAutoBuild) {
      setHasAttemptedAutoBuild(true);
      handleBuildIndex();
    }
  }, [activePlaylistId, searchIndexReady, loadingSearchIndex, hasAttemptedAutoBuild]);

  const handleBuildIndex = async () => {
    if (activePlaylistId) {
      await buildSearchIndex(activePlaylistId, (msg) => {
        setStatusMessage(msg);
      });
    }
  };

  // Perform async debounce filter
  useEffect(() => {
    if (query.trim().length < 2) {
      setFilteredResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchChannels(query);
        if (activeTab !== 'all') {
          setFilteredResults(results.filter(r => r.type === activeTab));
        } else {
          setFilteredResults(results);
        }
      } catch (e) {
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, activeTab, searchChannels]);

  const handleItemPress = (item: Channel, index: number) => {
    if (item.type === 'live') {
      const liveResults = filteredResults.filter(r => r.type === 'live');
      const indexInLive = liveResults.findIndex(r => r.id === item.id);
      setPlaybackQueue(liveResults, indexInLive >= 0 ? indexInLive : 0);
      router.push({
        pathname: '/player',
        params: {
          id: item.id,
          streamUrl: item.streamUrl,
          title: item.name,
          isLive: 'true',
          current: item.current || 'Live Stream',
          next: item.next || '',
          quality: item.quality || 'HD',
          logo: item.logo || '',
          category: item.category || ''
        }
      });
    } else if (item.type === 'vod') {
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
    } else if (item.type === 'series') {
      router.push({
        pathname: '/series-detail',
        params: {
          id: item.id,
          title: item.name,
          poster: item.logo,
          backdrop: item.logo,
          genres: item.category,
          description: ''
        }
      });
    }
  };

  const renderResultCard = ({ item, index }: { item: Channel; index: number }) => {
    const typeLabel = 
      item.type === 'live' ? 'Live TV' : 
      item.type === 'vod' ? 'Movie' : 'TV Series';
      
    const typeColor = 
      item.type === 'live' ? colors.destructive : 
      item.type === 'vod' ? colors.accent : colors.gold;

    return (
      <TVFocusable 
        style={({ focused }: any) => [
          styles.card, 
          { backgroundColor: focused ? 'rgba(255,255,255,0.05)' : colors.surface, borderColor: focused ? '#FFF' : colors.border },
          focused && { borderWidth: 4, transform: [{ scale: 1.02 }] }
        ]}
        onPress={() => handleItemPress(item, index)}
        focusable={true}
      >
        <View style={styles.cardImageWrapper}>
          <Image 
            source={{ uri: item.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=1A1A1A&color=D4A843&bold=true&size=120&format=png` }} 
            style={styles.cardImage}
            contentFit={item.type === 'live' ? 'contain' : 'cover'}
          />
        </View>
        
        <View style={styles.cardDetails}>
          <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.badgeRow}>
            <View style={[styles.typeBadge, { backgroundColor: typeColor + '20' }]}>
              <Text style={[styles.typeBadgeText, { color: typeColor }]}>
                {typeLabel}
              </Text>
            </View>
            {item.category ? (
              <Text style={[styles.cardCategory, { color: colors.mutedForeground }]} numberOfLines={1}>
                {item.category}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={[styles.playIconWrapper, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
          <Feather 
            name={item.type === 'live' ? 'tv' : 'arrow-right'} 
            size={18} 
            color={colors.gold} 
          />
        </View>
      </TVFocusable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Search Header */}
      <View style={styles.header}>
        <TVFocusable 
          style={({ focused }: any) => [
            styles.backBtn,
            focused && { transform: [{ scale: 1.1 }], backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, borderWidth: 3, borderColor: '#FFF' }
          ]} 
          onPress={() => router.back()}
          focusable={true}
        >
          {({ focused }: any) => (
            <Feather name="arrow-left" size={22} color={focused ? colors.gold : colors.text} />
          )}
        </TVFocusable>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Feather name="search" size={18} color={colors.mutedForeground} style={{ marginRight: 8 }} />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Search channels, movies, series..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.text }]}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TVFocusable disableBorder onPress={() => setQuery('')}>
              <Feather name="x" size={18} color={colors.text} />
            </TVFocusable>
          )}
        </View>
        {!loadingSearchIndex && (
          <TVFocusable 
            style={({ focused }: any) => [
              styles.syncBtn,
              focused && { transform: [{ scale: 1.1 }], backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, borderWidth: 3, borderColor: '#FFF' }
            ]} 
            onPress={handleBuildIndex}
            focusable={true}
          >
            {({ focused }: any) => (
              <Feather name="refresh-cw" size={20} color={focused ? "#FFF" : colors.gold} />
            )}
          </TVFocusable>
        )}
      </View>

      {/* Tabs */}
      {searchIndexReady && !loadingSearchIndex && (
        <View style={[styles.tabsBar, { borderBottomColor: colors.border }]}>
          {(['all', 'live', 'vod', 'series'] as SearchTab[]).map((tab) => {
            const isSelected = activeTab === tab;
            const label = 
              tab === 'all' ? 'All' : 
              tab === 'live' ? 'Live TV' : 
              tab === 'vod' ? 'Movies' : 'Series';
            return (
              <TVFocusable
                key={tab}
                style={({ focused }: any) => [
                  styles.tabItem,
                  isSelected && { borderBottomColor: colors.gold },
                  focused && { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, borderWidth: 3, borderColor: '#FFF' }
                ]}
                onPress={() => setActiveTab(tab)}
                focusable={true}
              >
                {({ focused }: any) => (
                  <Text style={[
                    styles.tabLabel,
                    { color: isSelected || focused ? colors.gold : colors.text }
                  ]}>
                    {label}
                  </Text>
                )}
              </TVFocusable>
            );
          })}
        </View>
      )}

      {/* Main Body */}
      {(isSearching || loadingSearchIndex) ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.gold} />
          {loadingSearchIndex && (
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
              {searchIndexProgress || 'Loading search engine...'}
            </Text>
          )}
        </View>
      ) : !searchIndexReady ? (
        <View style={styles.centerContainer}>
          <Feather name="database" size={64} color={colors.mutedForeground} style={{ marginBottom: 16 }} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No Search Data
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            No searchable items found. You can try refreshing the database using the sync button in the header.
          </Text>
        </View>
      ) : query.trim().length >= 2 && filteredResults.length === 0 ? (
        <View style={styles.centerContainer}>
          <Feather name="frown" size={64} color={colors.mutedForeground} style={{ marginBottom: 16 }} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No Results Found
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            Try searching for a different movie, series, or live channel.
          </Text>
        </View>
      ) : query.trim().length < 2 ? (
        <View style={styles.centerContainer}>
          <Feather name="search" size={64} color={colors.mutedForeground} style={{ marginBottom: 16 }} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Search Everything
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            Type at least 2 characters to search across all items
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredResults}
          keyExtractor={(item) => item.id}
          renderItem={renderResultCard}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Feather name="slash" size={48} color={colors.mutedForeground} style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No results found
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                Try searching with a different term
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
    padding: 0,
  },
  syncBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    marginBottom: 20,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  primaryBtnText: {
    color: '#1A1A1A',
    fontWeight: 'bold',
    fontSize: 14,
  },
  listContent: {
    padding: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  cardImageWrapper: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardDetails: {
    flex: 1,
    marginLeft: 12,
    gap: 4,
  },
  cardName: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardCategory: {
    fontSize: 12,
    flex: 1,
  },
  playIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
