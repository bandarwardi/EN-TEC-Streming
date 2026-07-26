import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, useWindowDimensions, Platform, ScrollView, TextInput } from 'react-native';
import { TVFocusable } from '@/components/TVFocusable';
import { MarqueeText } from '@/components/MarqueeText';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Lineicons } from '@lineiconshq/react-native-lineicons';
import { Search1Bulk, MonitorBulk, DashboardSquare1Bulk, Folder1Bulk, ArrowRightBulk } from '@lineiconshq/free-icons';
import { MovieCard } from '@/components/MovieCard';
import { router, useNavigation, useLocalSearchParams, useRouter } from 'expo-router';
import { useAppStore } from '@/store/app-store';
import { Channel, Movie } from '@/types';
import { SearchKeyboardModal } from '@/components/SearchKeyboardModal';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';

export default function MoviesScreen() {
  const isFocused = useIsFocused();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isLargeScreen = width >= 1024 || Platform.isTV;
  const numColumns = isLargeScreen ? 4 : 3;
  const mobileNumColumns = Math.max(2, Math.floor((width - 40) / 130));

  const activePlaylistId = useAppStore((s) => s.activePlaylistId);
  const activeCategories = useAppStore((s) => s.activeCategories);
  const getChannelsForCategory = useAppStore((s) => s.getChannelsForCategory);
  const setPlaybackQueue = useAppStore((s) => s.setPlaybackQueue);

  const [selectedCategory, setSelectedCategory] = useState<{ id: string; name: string } | null>(null);
  const [localMovies, setLocalMovies] = useState<Movie[]>([]);
  const [displayCount, setDisplayCount] = useState(50);
  const [loading, setLoading] = useState(false);
  const hasDefaulted = useRef(false);
  const flatListRef = useRef<FlatList>(null);

  const [categorySearch, setCategorySearch] = useState('');
  const [movieSearch, setMovieSearch] = useState('');
  const [showCategoryKeyboard, setShowCategoryKeyboard] = useState(false);
  const [showMovieKeyboard, setShowMovieKeyboard] = useState(false);

  const categories = useMemo(() => activeCategories?.vod || [], [activeCategories]);

  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return categories;
    const q = categorySearch.toLowerCase().trim();
    return categories.filter((c: any) => c.name.toLowerCase().includes(q));
  }, [categories, categorySearch]);

  const filteredMovies = useMemo(() => {
    if (!movieSearch.trim()) return localMovies;
    const q = movieSearch.toLowerCase().trim();
    return localMovies.filter(m => m.title.toLowerCase().includes(q));
  }, [localMovies, movieSearch]);

  const loadCategory = useCallback(async (cat: { id: string; name: string }) => {
    if (!activePlaylistId) return;
    setDisplayCount(50);
    setLoading(true);

    try {
      const result = await getChannelsForCategory(activePlaylistId, 'vod', cat.id, cat.name);
      const mapped = result.map((c: Channel) => ({
        id: c.id,
        title: c.name,
        poster: c.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=1A1A1A&color=D4A843&bold=true&size=300&format=svg`,
        backdrop: c.logo,
        rating: 0,
        year: 0,
        duration: '',
        quality: c.quality,
        genres: [c.category],
        description: '',
        streamUrl: c.streamUrl,
      }));
      setLocalMovies(mapped);
    } catch (e) {
      setLocalMovies([]);
    } finally {
      setLoading(false);
    }
  }, [activePlaylistId, getChannelsForCategory]);

  useEffect(() => {
    if (selectedCategory) {
      loadCategory(selectedCategory);
    }
  }, [selectedCategory, loadCategory]);

  const { categoryId, focusId } = useLocalSearchParams<{ categoryId?: string; focusId?: string }>();

  useEffect(() => {
    if (focusId && localMovies.length > 0) {
      const idx = localMovies.findIndex(m => m.id === focusId);
      if (idx >= 0) {
        if (idx >= displayCount) {
          setDisplayCount(idx + 20);
        }
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
        }, 500);
      }
    }
  }, [localMovies, focusId]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (categoryId && categories.length > 0) {
        const targetCat = categories.find(c => c.id === categoryId);
        if (targetCat) {
          if (!selectedCategory || selectedCategory.id !== targetCat.id) {
            setSelectedCategory(targetCat);
          }
          hasDefaulted.current = true;
          router.setParams({ categoryId: '' });
          return;
        }
      }

      if (categories.length > 0) {
        if (!selectedCategory) {
          setSelectedCategory(categories[0]);
        }
        hasDefaulted.current = true;
      } else {
        if (selectedCategory) {
          setSelectedCategory(null);
        }
        hasDefaulted.current = false;
      }
    });
    return unsubscribe;
  }, [navigation, categories, categoryId, selectedCategory]);

  useEffect(() => {
    if (categories.length > 0 && !hasDefaulted.current) {
      if (isLargeScreen) {
        setSelectedCategory(categories[0]);
      }
      hasDefaulted.current = true;
    }
  }, [categories, isLargeScreen]);

  useEffect(() => {
    hasDefaulted.current = false;
    setSelectedCategory(null);
    setLocalMovies([]);
  }, [activePlaylistId]);



  if (isLargeScreen) {
    const isWeb = Platform.OS === 'web';
    const glassPaneStyle: any = isWeb ? {
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(30px)',
      WebkitBackdropFilter: 'blur(30px)',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.08)',
      marginTop: 12,
      marginBottom: 32,
      marginRight: 16,
      overflow: 'hidden',
    } : {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.08)',
      marginTop: 12,
      marginBottom: 32,
      marginRight: 16,
      overflow: 'hidden',
    };

    return (
      <View style={[styles.tvContainer, { backgroundColor: isLargeScreen ? 'transparent' : colors.background, paddingLeft: 24, opacity: isFocused ? 1 : 0, pointerEvents: isFocused ? 'auto' : 'none' }]}>
        <View style={[{ flexDirection: 'row', flex: 1 }, glassPaneStyle]}>
          {/* Pane 1: Categories */}
          <View style={[styles.tvPaneCategories, { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.08)' }]}>
            <View style={styles.tvHeader}>
              <Text style={[styles.tvTitle, { color: colors.text }]}>Movies</Text>
              <View style={[styles.searchBox, { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)' }]}>
                <Ionicons name="search" size={14} color={colors.mutedForeground} />
                {isLargeScreen ? (
                  <TVFocusable onPress={() => setShowCategoryKeyboard(true)} style={{ flex: 1, paddingVertical: 4 }}>
                    <Text style={[styles.searchInput, { color: categorySearch ? colors.text : colors.mutedForeground, marginTop: 4 }]}>
                      {categorySearch || "Search categories..."}
                    </Text>
                  </TVFocusable>
                ) : (
                  <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder="Search categories..."
                    placeholderTextColor={colors.mutedForeground}
                    value={categorySearch}
                    onChangeText={setCategorySearch}
                  />
                )}
                {categorySearch ? (
                  <Pressable onPress={() => setCategorySearch('')}>
                    <Ionicons name="close-circle" size={14} color={colors.mutedForeground} />
                  </Pressable>
                ) : null}
              </View>
            </View>
            <ScrollView style={{ flex: 1 }}>
              {filteredCategories.map((item) => {
                const isSelected = selectedCategory?.id === item.id;
                return (
                  <TVFocusable
                    key={item.id}
                    onPress={() => setSelectedCategory(item)}
                    style={({ focused }: any) => [
                      styles.tvCategoryItem,
                      isSelected && { backgroundColor: 'rgba(212,168,67,0.15)', borderLeftWidth: 3, borderLeftColor: colors.gold },
                      focused && { backgroundColor: colors.gold, transform: [{ scale: 1.02 }] }
                    ]}
                  >
                    {({ focused }: any) => (
                      <MarqueeText 
                        text={item.name}
                        isFocused={focused || isSelected}
                        style={[
                          styles.tvCategoryText, 
                          { color: focused ? '#000' : (isSelected ? colors.gold : colors.text), fontWeight: isSelected ? 'bold' : '500' }
                        ]} 
                      />
                    )}
                  </TVFocusable>
                );
              })}
            </ScrollView>
          </View>

          {/* Pane 2: Movies */}
          <View style={[styles.tvPaneContent, { flex: 1 }]}>
            <View style={[styles.tvHeader, { paddingBottom: 16 }]}>
              <Text style={[styles.tvTitle, { color: colors.text }]}>
                {selectedCategory ? selectedCategory.name : 'Select a Category'}
              </Text>
              {selectedCategory && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.searchBox, { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)' }]}>
                    <Ionicons name="search" size={14} color={colors.mutedForeground} />
                    {isLargeScreen ? (
                      <TVFocusable onPress={() => setShowMovieKeyboard(true)} style={{ flex: 1, paddingVertical: 4 }}>
                        <Text style={[styles.searchInput, { color: movieSearch ? colors.text : colors.mutedForeground, marginTop: 4 }]}>
                          {movieSearch || "Search movies..."}
                        </Text>
                      </TVFocusable>
                    ) : (
                      <TextInput
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder="Search movies..."
                        placeholderTextColor={colors.mutedForeground}
                        value={movieSearch}
                        onChangeText={setMovieSearch}
                      />
                    )}
                    {movieSearch ? (
                      <Pressable onPress={() => setMovieSearch('')}>
                        <Ionicons name="close-circle" size={14} color={colors.mutedForeground} />
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              )}
            </View>
            {loading ? (
              <View style={styles.centerAll}>
                <ActivityIndicator size="large" color={colors.gold} />
              </View>
            ) : !selectedCategory ? (
              <View style={styles.centerAll}>
                <Lineicons icon={Folder1Bulk} size={48} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.text, marginTop: 12 }]}>Choose a category from the left</Text>
              </View>
            ) : filteredMovies.length === 0 ? (
              <View style={styles.centerAll}>
                <Lineicons icon={Search1Bulk} size={48} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.text, marginTop: 12 }]}>No movies found</Text>
              </View>
            ) : (
              <View style={{ flex: 1, opacity: loading ? 0.5 : 1 }}>
                <FlatList
                  ref={flatListRef}
                  onScrollToIndexFailed={(info) => {
                    const offset = info.averageItemLength * Math.floor(info.index / numColumns);
                    flatListRef.current?.scrollToOffset({ offset, animated: false });
                    setTimeout(() => {
                      try {
                        flatListRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 });
                      } catch (e) {}
                    }, 300);
                  }}
                  removeClippedSubviews={true}
                  initialNumToRender={8}
                  maxToRenderPerBatch={12}
                  windowSize={5}
                  key={`movies_grid_${numColumns}`}
                  data={filteredMovies.slice(0, displayCount)}
                  onEndReached={() => setDisplayCount(prev => prev + 50)}
                  onEndReachedThreshold={0.5}
                keyExtractor={(item) => item.id}
                numColumns={numColumns}
                renderItem={({ item }) => (
                  <View style={[styles.tvGridItem, { width: `${100 / numColumns}%`, maxWidth: `${100 / numColumns}%` }]}>
                    <MovieCard
                      movie={item}
                      width={'100%' as any}
                      onPress={() => {
                        router.push({
                          pathname: '/movie-detail',
                          params: {
                            id: item.id,
                            title: item.title,
                            poster: item.poster,
                            backdrop: item.backdrop,
                            quality: item.quality,
                            genres: item.genres.join(','),
                            description: item.description,
                            streamUrl: item.streamUrl || '',
                          },
                        });
                      }}
                    />
                  </View>
                )}
                contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 40 }}
              />
              </View>
            )}
          </View>
        </View>

        <SearchKeyboardModal 
          visible={showCategoryKeyboard}
          value={categorySearch}
          onChangeText={setCategorySearch}
          onClose={() => setShowCategoryKeyboard(false)}
          placeholder="Search categories..."
        />
        <SearchKeyboardModal 
          visible={showMovieKeyboard}
          value={movieSearch}
          onChangeText={setMovieSearch}
          onClose={() => setShowMovieKeyboard(false)}
          placeholder="Search movies..."
        />
      </View>
    );
  }

  // --- Mobile Layout ---
  const categoryNumColumns = 1;

  if (selectedCategory) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top, opacity: isFocused ? 1 : 0, pointerEvents: isFocused ? 'auto' : 'none' }]}>
        <View style={[styles.header, isLandscape && { paddingTop: 4, paddingBottom: 4 }]}>
          <TVFocusable 
            onPress={() => setSelectedCategory(null)} 
            style={{ marginRight: 8, padding: 8, zIndex: 9999, elevation: 9999 }}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            disableBorder
          >
             <View pointerEvents="none">
               <Lineicons icon={ArrowRightBulk} size={24} color={colors.text} style={{ transform: [{ rotate: '180deg' }] }} />
             </View>
          </TVFocusable>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={[styles.title, { color: colors.text, fontSize: isLandscape ? 18 : 22 }]} numberOfLines={isLandscape ? 1 : 2}>
              {selectedCategory.name}
            </Text>
            <Text style={[styles.count, { color: colors.mutedForeground, fontSize: isLandscape ? 11 : 13 }]}>
              {localMovies.length.toLocaleString()} movies
            </Text>
          </View>
        </View>



        {!isLandscape && (
          <TVFocusable
            style={[styles.searchBar, { backgroundColor: colors.surface2, borderColor: colors.border }]}
            onPress={() => router.push('/search')}
          >
            <Lineicons icon={Search1Bulk} size={16} color={colors.mutedForeground} />
            <Text style={[styles.searchInput, { color: colors.mutedForeground }]}>
              Search movies, categories...
            </Text>
          </TVFocusable>
        )}

        {loading ? (
          <View style={styles.centerAll}>
            <ActivityIndicator size="large" color={colors.gold} />
          </View>
        ) : localMovies.length === 0 ? (
          <View style={styles.centerAll}>
            <Lineicons icon={MonitorBulk} size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.text, marginTop: 12 }]}>No movies found</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            onScrollToIndexFailed={(info) => {
              const offset = info.averageItemLength * Math.floor(info.index / mobileNumColumns);
              flatListRef.current?.scrollToOffset({ offset, animated: false });
              setTimeout(() => {
                try {
                  flatListRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 });
                } catch (e) {}
              }, 300);
            }}
            removeClippedSubviews={true}
            initialNumToRender={8}
            maxToRenderPerBatch={12}
            windowSize={5}
            key={`movies_grid_${mobileNumColumns}`}
            data={localMovies.slice(0, displayCount)}
            onEndReached={() => setDisplayCount(prev => prev + 50)}
            onEndReachedThreshold={0.5}
            keyExtractor={(item) => item.id}
            numColumns={mobileNumColumns}
            renderItem={({ item }) => (
              <View style={[styles.gridItem, { width: `${100 / mobileNumColumns}%`, maxWidth: `${100 / mobileNumColumns}%` }]}>
                <MovieCard
                  autoFocus={focusId === item.id}
                  movie={item}
                  width={'100%' as any}
                  onPress={() => {
                    router.push({
                      pathname: '/movie-detail',
                      params: {
                        id: item.id,
                        title: item.title,
                        poster: item.poster,
                        backdrop: item.backdrop,
                        quality: item.quality,
                        genres: item.genres.join(','),
                        description: item.description,
                        streamUrl: item.streamUrl || '',
                      },
                    });
                  }}
                />
              </View>
            )}
            contentContainerStyle={[styles.gridContent, { paddingBottom: isLandscape ? insets.bottom + 80 : insets.bottom + 120 }]}
          />
        )}

        {!isLandscape && (
          <TVFocusable
            disableBorder
            onPress={() => setSelectedCategory(null)}
            style={[styles.floatingViewAllBtn, { backgroundColor: colors.surface, borderColor: colors.gold, bottom: insets.bottom + 90 }]}
          >
            <Lineicons icon={DashboardSquare1Bulk} size={18} color={colors.gold} />
            <Text style={[styles.floatingViewAllText, { color: colors.text }]}>View All Categories</Text>
          </TVFocusable>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top, opacity: isFocused ? 1 : 0, pointerEvents: isFocused ? 'auto' : 'none' }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Movies</Text>
        <Text style={[styles.count, { color: colors.mutedForeground }]}>
          {categories.length.toLocaleString()} categories
        </Text>
      </View>

      <TVFocusable
        style={[styles.searchBar, { backgroundColor: colors.surface2, borderColor: colors.border }]}
        onPress={() => router.push('/search')}
      >
        <Lineicons icon={Search1Bulk} size={16} color={colors.mutedForeground} />
        <Text style={[styles.searchInput, { color: colors.mutedForeground }]}>
          Search movies, categories...
        </Text>
      </TVFocusable>

      {categories.length === 0 ? (
        <View style={styles.centerAll}>
          <Lineicons icon={Folder1Bulk} size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.text, marginTop: 12 }]}>No categories found</Text>
        </View>
      ) : (
        <FlatList
removeClippedSubviews={true}
initialNumToRender={8}
maxToRenderPerBatch={12}
windowSize={5}
          key={`categories_grid_${categoryNumColumns}`}
          data={categories}
          numColumns={categoryNumColumns}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={{ width: `${100 / categoryNumColumns}%`, padding: 0 }}>
              <TVFocusable
                onPress={() => setSelectedCategory(item)}
                style={({ focused }: any) => [
                  styles.categoryItem,
                  { backgroundColor: focused ? colors.surface : colors.surface2, borderColor: focused ? colors.gold : colors.border },
                  { padding: 14 }
                ]}
              >
                <View style={[styles.categoryLeft, { flex: 1, flexDirection: 'row' }]}>
                  <View style={[styles.categoryIconBg, { backgroundColor: colors.gold + '15' }]}>
                    <Lineicons icon={Folder1Bulk} size={18} color={colors.gold} />
                  </View>
                  <Text 
                    style={[styles.categoryName, { color: colors.text, textAlign: 'left', flex: 1 }]} 
                    numberOfLines={2}
                  >
                    {item.name}
                  </Text>
                </View>
              </TVFocusable>
            </View>
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 80 }]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    gap: 8,
  },
  mobileChannelListContent: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    overflow: 'hidden'
  },
  mobileChannelListLogoContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#FFF',
    padding: 2
  },
  mobileChannelListLogo: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: 6
  },
  mobileChannelListLogoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  mobileChannelListTextContainer: {
    flex: 1,
    justifyContent: 'center'
  },
  mobileChannelListName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4
  },
  mobileChannelListCurrent: {
    fontSize: 13
  },
  mobileChannelListBadgeContainer: {
    justifyContent: 'center',
    alignItems: 'center'
  },

  container: { flex: 1 },
  centerAll: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  
  // TV Styles
  tvContainer: { flex: 1, flexDirection: 'row' },
  tvPaneCategories: { width: 320 },
  tvPaneContent: { flex: 1 },
  tvHeader: { padding: 24, paddingBottom: 16 },
  tvTitle: { fontSize: 24, fontWeight: 'bold' },
  tvCategoryItem: { paddingHorizontal: 24, paddingVertical: 16, borderLeftWidth: 3, borderLeftColor: 'transparent' },
  tvCategoryText: { fontSize: 16 },
  tvTopBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8 },
  tvSearchBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, height: 48, borderRadius: 24, borderWidth: 1, width: 300 },
  tvSearchText: { fontSize: 15 },
  tvGridItem: { padding: 12 },

  // Mobile Styles
  horizontalTabsContainer: { flexDirection: 'row', gap: 8, paddingHorizontal: 20 },
  floatingViewAllBtn: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 30, paddingHorizontal: 20, height: 48, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 5 },
  floatingViewAllText: { fontSize: 14, fontWeight: 'bold' },
  tabsScrollContent: { gap: 8, paddingRight: 40 },
  tabPill: { paddingHorizontal: 16, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  tabPillText: { fontSize: 13 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 4, gap: 12 },
  title: { fontSize: 24, fontWeight: 'bold' },
  count: { fontSize: 13, marginTop: 2 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, marginBottom: 12, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 44 },
  searchInput: { flex: 1, fontSize: 14 },
  gridContent: { paddingHorizontal: 10 },
  gridItem: { flex: 1, padding: 6 },
  listContent: { paddingHorizontal: 20, paddingTop: 4 },
  categoryItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  categoryLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  categoryIconBg: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  categoryName: { fontSize: 16, fontWeight: '600' },
  emptyTitle: { fontSize: 18, fontWeight: 'bold' },
});
