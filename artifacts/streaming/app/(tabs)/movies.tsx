import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, useWindowDimensions, Platform } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { MovieCard } from '@/components/MovieCard';
import { router, useNavigation } from 'expo-router';
import { useAppStore } from '@/store/app-store';
import { Channel } from '@/types';

export default function MoviesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768 || Platform.isTV;

  const activePlaylistId = useAppStore((s) => s.activePlaylistId);
  const activeCategories = useAppStore((s) => s.activeCategories);
  const getChannelsForCategory = useAppStore((s) => s.getChannelsForCategory);

  const [selectedCategory, setSelectedCategory] = useState<{ id: string; name: string } | null>(null);
  const [localMovies, setLocalMovies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const hasDefaulted = useRef(false);

  const categories = useMemo(() => activeCategories?.vod || [], [activeCategories]);

  const loadCategory = useCallback(async (cat: { id: string; name: string }) => {
    if (!activePlaylistId) return;
    setLoading(true);
    setLocalMovies([]);
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

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      hasDefaulted.current = false;
      if (categories.length > 0) {
        setSelectedCategory(categories[0]);
        hasDefaulted.current = true;
      }
    });
    return unsubscribe;
  }, [navigation, categories]);

  useEffect(() => {
    if (categories.length > 0 && !hasDefaulted.current) {
      setSelectedCategory(categories[0]);
      hasDefaulted.current = true;
    }
  }, [categories]);

  useEffect(() => {
    hasDefaulted.current = false;
    setSelectedCategory(null);
    setLocalMovies([]);
  }, [activePlaylistId]);

  // --- TV Layout ---
  if (isLargeScreen) {
    return (
      <View style={[styles.tvContainer, { backgroundColor: colors.background }]}>
        {/* Pane 1: Categories */}
        <View style={[styles.tvPaneCategories, { borderColor: colors.border }]}>
          <View style={styles.tvHeader}>
            <Text style={[styles.tvTitle, { color: colors.text }]}>Movies</Text>
          </View>
          <FlatList
            data={categories}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isSelected = selectedCategory?.id === item.id;
              return (
                <Pressable
                  onPress={() => setSelectedCategory(item)}
                  style={({ focused }) => [
                    styles.tvCategoryItem,
                    isSelected && { backgroundColor: 'rgba(212,168,67,0.15)', borderLeftWidth: 3, borderLeftColor: colors.gold },
                    focused && { backgroundColor: colors.gold, transform: [{ scale: 1.02 }] }
                  ]}
                >
                  {({ focused }) => (
                    <Text style={[
                      styles.tvCategoryText, 
                      { color: focused ? '#000' : (isSelected ? colors.gold : colors.text), fontWeight: isSelected ? 'bold' : '500' }
                    ]} numberOfLines={1}>
                      {item.name}
                    </Text>
                  )}
                </Pressable>
              );
            }}
          />
        </View>

        {/* Pane 2: Content (Movies Grid) */}
        <View style={styles.tvPaneContent}>
          <View style={styles.tvTopBar}>
            <Pressable
              style={({ focused }) => [
                styles.tvSearchBar,
                { backgroundColor: focused ? colors.gold : colors.surface2, borderColor: focused ? colors.gold : colors.border }
              ]}
              onPress={() => router.push('/search')}
            >
              {({ focused }) => (
                <>
                  <Feather name="search" size={18} color={focused ? '#000' : colors.mutedForeground} />
                  <Text style={[styles.tvSearchText, { color: focused ? '#000' : colors.mutedForeground }]}>
                    Search movies, categories...
                  </Text>
                </>
              )}
            </Pressable>
            <View style={{ flex: 1 }} />
            <Text style={[styles.count, { color: colors.mutedForeground }]}>
              {localMovies.length.toLocaleString()} titles
            </Text>
          </View>

          {loading ? (
            <View style={styles.centerAll}>
              <ActivityIndicator size="large" color={colors.gold} />
            </View>
          ) : localMovies.length === 0 ? (
            <View style={styles.centerAll}>
              <Feather name="film" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.text, marginTop: 12 }]}>No movies found</Text>
            </View>
          ) : (
            <FlatList
              key="tv_movies_grid"
              data={localMovies}
              keyExtractor={(item) => item.id}
              numColumns={4}
              renderItem={({ item }) => (
                <View style={styles.tvGridItem}>
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
              contentContainerStyle={{ padding: 24, paddingBottom: 80 }}
            />
          )}
        </View>
      </View>
    );
  }

  // --- Mobile Layout ---
  if (selectedCategory) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {selectedCategory.name}
          </Text>
          <Text style={[styles.count, { color: colors.mutedForeground }]}>
            {localMovies.length.toLocaleString()} titles
          </Text>
        </View>

        <View style={styles.horizontalTabsContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={categories}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.tabsScrollContent}
            style={{ flex: 1 }}
            renderItem={({ item }) => {
              const isSelected = selectedCategory?.id === item.id;
              return (
                <Pressable
                  onPress={() => setSelectedCategory(item)}
                  style={[
                    styles.tabPill,
                    {
                      backgroundColor: isSelected ? colors.gold : colors.surface2,
                      borderColor: isSelected ? colors.gold : colors.border,
                    }
                  ]}
                >
                  <Text
                    style={[
                      styles.tabPillText,
                      { color: isSelected ? '#1A1A1A' : colors.text, fontWeight: isSelected ? '700' : '500' }
                    ]}
                  >
                    {item.name}
                  </Text>
                </Pressable>
              );
            }}
          />

          <Pressable
            onPress={() => setSelectedCategory(null)}
            style={[styles.viewAllTabBtn, { backgroundColor: colors.surface2, borderColor: colors.border }]}
          >
            <Feather name="grid" size={14} color={colors.gold} />
            <Text style={[styles.viewAllTabBtnText, { color: colors.text }]}>View All</Text>
          </Pressable>
        </View>

        <Pressable
          style={[styles.searchBar, { backgroundColor: colors.surface2, borderColor: colors.border }]}
          onPress={() => router.push('/search')}
        >
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <Text style={[styles.searchInput, { color: colors.mutedForeground }]}>
            Search movies, categories...
          </Text>
        </Pressable>

        {loading ? (
          <View style={styles.centerAll}>
            <ActivityIndicator size="large" color={colors.gold} />
          </View>
        ) : localMovies.length === 0 ? (
          <View style={styles.centerAll}>
            <Feather name="film" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.text, marginTop: 12 }]}>No movies found</Text>
          </View>
        ) : (
          <FlatList
            key="movies_grid"
            data={localMovies}
            keyExtractor={(item) => item.id}
            numColumns={3}
            renderItem={({ item }) => (
              <View style={styles.gridItem}>
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
            contentContainerStyle={[styles.gridContent, { paddingBottom: insets.bottom + 80 }]}
          />
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Movies</Text>
        <Text style={[styles.count, { color: colors.mutedForeground }]}>
          {categories.length.toLocaleString()} categories
        </Text>
      </View>

      <Pressable
        style={[styles.searchBar, { backgroundColor: colors.surface2, borderColor: colors.border }]}
        onPress={() => router.push('/search')}
      >
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <Text style={[styles.searchInput, { color: colors.mutedForeground }]}>
          Search movies, categories...
        </Text>
      </Pressable>

      {categories.length === 0 ? (
        <View style={styles.centerAll}>
          <Feather name="folder" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.text, marginTop: 12 }]}>No categories found</Text>
        </View>
      ) : (
        <FlatList
          key="categories_list"
          data={categories}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setSelectedCategory(item)}
              style={({ pressed }) => [
                styles.categoryItem,
                { backgroundColor: colors.surface2, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }
              ]}
            >
              <View style={styles.categoryLeft}>
                <View style={[styles.categoryIconBg, { backgroundColor: colors.gold + '15' }]}>
                  <Feather name="film" size={18} color={colors.gold} />
                </View>
                <Text style={[styles.categoryName, { color: colors.text }]}>{item.name}</Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </Pressable>
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 80 }]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerAll: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  
  // TV Styles
  tvContainer: { flex: 1, flexDirection: 'row' },
  tvPaneCategories: { width: 280, borderRightWidth: 1 },
  tvPaneContent: { flex: 1 },
  tvHeader: { padding: 24, paddingBottom: 16 },
  tvTitle: { fontSize: 24, fontWeight: 'bold' },
  tvCategoryItem: { paddingHorizontal: 24, paddingVertical: 16, borderLeftWidth: 3, borderLeftColor: 'transparent' },
  tvCategoryText: { fontSize: 16 },
  tvTopBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8 },
  tvSearchBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, height: 48, borderRadius: 24, borderWidth: 1, width: 300 },
  tvSearchText: { fontSize: 15 },
  tvGridItem: { flex: 1, padding: 12, maxWidth: '25%' },

  // Mobile Styles
  horizontalTabsContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10, gap: 8 },
  viewAllTabBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, height: 36 },
  viewAllTabBtnText: { fontSize: 12, fontWeight: '700' },
  tabsScrollContent: { gap: 8, paddingRight: 10 },
  tabPill: { paddingHorizontal: 16, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  tabPillText: { fontSize: 13 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, gap: 12 },
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
