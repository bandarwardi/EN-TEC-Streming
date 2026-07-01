import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, useWindowDimensions, Platform } from 'react-native';
import { TVFocusable } from '@/components/TVFocusable';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Lineicons } from '@lineiconshq/react-native-lineicons';
import { Search1Bulk, MonitorBulk, DashboardSquare1Bulk, Folder1Bulk, ArrowRightBulk } from '@lineiconshq/free-icons';
import { MovieCard } from '@/components/MovieCard';
import { router, useNavigation, useLocalSearchParams } from 'expo-router';
import { useAppStore } from '@/store/app-store';
import { Channel } from '@/types';

export default function SeriesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isLargeScreen = width >= 1024 || Platform.isTV;
  const numColumns = isLargeScreen ? Math.max(4, Math.floor((width - 250) / 160)) : 3;
  const mobileNumColumns = Math.max(2, Math.floor((width - 40) / 130));

  const activePlaylistId = useAppStore((s) => s.activePlaylistId);
  const activeCategories = useAppStore((s) => s.activeCategories);
  const getChannelsForCategory = useAppStore((s) => s.getChannelsForCategory);

  const [selectedCategory, setSelectedCategory] = useState<{ id: string; name: string } | null>(null);
  const [localSeries, setLocalSeries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const hasDefaulted = useRef(false);

  const categories = useMemo(() => activeCategories?.series || [], [activeCategories]);

  const loadCategory = useCallback(async (cat: { id: string; name: string }) => {
    if (!activePlaylistId) return;
    setLoading(true);
    setLocalSeries([]);
    try {
      const result = await getChannelsForCategory(activePlaylistId, 'series', cat.id, cat.name);
      const mapped = result.map((c: Channel) => ({
        id: c.id,
        title: c.name,
        poster: c.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=1A1A1A&color=D4A843&bold=true&size=300&format=svg`,
        backdrop: c.logo,
        rating: 0,
        year: 0,
        seasons: 1,
        genres: [c.category],
        description: '',
        streamUrl: c.streamUrl,
        episodes: [],
      }));
      setLocalSeries(mapped);
    } catch (e) {
      setLocalSeries([]);
    } finally {
      setLoading(false);
    }
  }, [activePlaylistId, getChannelsForCategory]);

  useEffect(() => {
    if (selectedCategory) {
      loadCategory(selectedCategory);
    }
  }, [selectedCategory, loadCategory]);

  const { categoryId } = useLocalSearchParams<{ categoryId?: string }>();

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (categoryId && categories.length > 0) {
        const targetCat = categories.find(c => c.id === categoryId);
        if (targetCat) {
          setSelectedCategory(targetCat);
          hasDefaulted.current = true;
          router.setParams({ categoryId: '' });
          return;
        }
      }

      hasDefaulted.current = false;
      if (categories.length > 0 && !selectedCategory) {
        setSelectedCategory(categories[0]);
      }
    });
    return unsubscribe;
  }, [navigation, categories, categoryId, selectedCategory]);

  useEffect(() => {
    if (categories.length > 0 && !hasDefaulted.current) {
      setSelectedCategory(categories[0]);
      hasDefaulted.current = true;
    }
  }, [categories]);

  useEffect(() => {
    hasDefaulted.current = false;
    setSelectedCategory(null);
    setLocalSeries([]);
  }, [activePlaylistId]);

  // --- TV Layout ---
  if (isLargeScreen) {
    return (
      <View style={[styles.tvContainer, { backgroundColor: colors.background }]}>
        {/* Pane 1: Categories */}
        <View style={[styles.tvPaneCategories, { borderColor: colors.border }]}>
          <View style={styles.tvHeader}>
            <Text style={[styles.tvTitle, { color: colors.text }]}>Series</Text>
          </View>
          <FlatList
            data={categories}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isSelected = selectedCategory?.id === item.id;
              return (
                <TVFocusable
                  onPress={() => setSelectedCategory(item)}
                  style={({ focused }: any) => [
                    styles.tvCategoryItem,
                    isSelected && { backgroundColor: 'rgba(212,168,67,0.15)', borderLeftWidth: 3, borderLeftColor: colors.gold },
                    focused && { backgroundColor: colors.gold, transform: [{ scale: 1.02 }] }
                  ]}
                >
                  {({ focused }: any) => (
                    <Text style={[
                      styles.tvCategoryText, 
                      { color: focused ? '#000' : (isSelected ? colors.gold : colors.text), fontWeight: isSelected ? 'bold' : '500' }
                    ]} numberOfLines={1}>
                      {item.name}
                    </Text>
                  )}
                </TVFocusable>
              );
            }}
          />
        </View>

        {/* Pane 2: Content (Series Grid) */}
        <View style={styles.tvPaneContent}>
          <View style={styles.tvTopBar}>
            <TVFocusable
              style={({ focused }: any) => [
                styles.tvSearchBar,
                { backgroundColor: focused ? colors.gold : colors.surface2, borderColor: focused ? colors.gold : colors.border }
              ]}
              onPress={() => router.push('/search')}
            >
              {({ focused }: any) => (
                <>
                  <Lineicons icon={Search1Bulk} size={18} color={focused ? '#000' : colors.mutedForeground} />
                  <Text style={[styles.tvSearchText, { color: focused ? '#000' : colors.mutedForeground }]}>
                    Search series, categories...
                  </Text>
                </>
              )}
            </TVFocusable>
            <View style={{ flex: 1 }} />
            <Text style={[styles.count, { color: colors.mutedForeground }]}>
              {localSeries.length.toLocaleString()} titles
            </Text>
          </View>

          {loading ? (
            <View style={styles.centerAll}>
              <ActivityIndicator size="large" color={colors.gold} />
            </View>
          ) : localSeries.length === 0 ? (
            <View style={styles.centerAll}>
              <Lineicons icon={MonitorBulk} size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.text, marginTop: 12 }]}>No series found</Text>
            </View>
          ) : (
            <FlatList
              key={`tv_series_grid_${numColumns}`}
              data={localSeries}
              keyExtractor={(item) => item.id}
              numColumns={numColumns}
              renderItem={({ item }) => (
                <View style={[styles.tvGridItem, { width: `${100 / numColumns}%`, maxWidth: `${100 / numColumns}%` }]}>
                  <MovieCard
                    movie={item}
                    width={'100%' as any}
                    onPress={() => {
                      router.push({
                        pathname: '/series-detail',
                        params: {
                          id: item.id,
                          title: item.title,
                          poster: item.poster,
                          backdrop: item.backdrop,
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
        {!isLandscape && (
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
              {selectedCategory.name}
            </Text>
            <Text style={[styles.count, { color: colors.mutedForeground }]}>
              {localSeries.length.toLocaleString()} channels
            </Text>
          </View>
        </View>
        )}

        <View style={[styles.horizontalTabsContainer, { marginBottom: 12 }, isLandscape && { marginBottom: 8 }]}>
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
                <TVFocusable
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
                </TVFocusable>
              );
            }}
          />
        </View>

        {!isLandscape && (
          <TVFocusable
            style={[styles.searchBar, { backgroundColor: colors.surface2, borderColor: colors.border }]}
            onPress={() => router.push('/search')}
          >
            <Lineicons icon={Search1Bulk} size={16} color={colors.mutedForeground} />
            <Text style={[styles.searchInput, { color: colors.mutedForeground }]}>
              Search series, categories...
            </Text>
          </TVFocusable>
        )}

        {loading ? (
          <View style={styles.centerAll}>
            <ActivityIndicator size="large" color={colors.gold} />
          </View>
        ) : localSeries.length === 0 ? (
          <View style={styles.centerAll}>
            <Lineicons icon={MonitorBulk} size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.text, marginTop: 12 }]}>No series found</Text>
          </View>
        ) : (
          <FlatList
            key={`series_grid_${mobileNumColumns}`}
            data={localSeries}
            keyExtractor={(item) => item.id}
            numColumns={mobileNumColumns}
            renderItem={({ item }) => (
              <View style={[styles.gridItem, { width: `${100 / mobileNumColumns}%`, maxWidth: `${100 / mobileNumColumns}%` }]}>
                <MovieCard
                  movie={item}
                  width={'100%' as any}
                  onPress={() => {
                    router.push({
                      pathname: '/series-detail',
                      params: {
                        id: item.id,
                        title: item.title,
                        poster: item.poster,
                        backdrop: item.backdrop,
                        genres: item.genres.join(','),
                        description: item.description,
                        streamUrl: item.streamUrl || '',
                      },
                    });
                  }}
                />
              </View>
            )}
            contentContainerStyle={[styles.gridContent, { paddingBottom: insets.bottom + 120 }]}
          />
        )}

        <TVFocusable
          onPress={() => setSelectedCategory(null)}
          style={[styles.floatingViewAllBtn, { backgroundColor: colors.surface, borderColor: colors.gold, bottom: insets.bottom + 90 }]}
        >
          <Lineicons icon={DashboardSquare1Bulk} size={18} color={colors.gold} />
          <Text style={[styles.floatingViewAllText, { color: colors.text }]}>View All Categories</Text>
        </TVFocusable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Series</Text>
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
          Search series, categories...
        </Text>
      </TVFocusable>

      {categories.length === 0 ? (
        <View style={styles.centerAll}>
          <Lineicons icon={Folder1Bulk} size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.text, marginTop: 12 }]}>No categories found</Text>
        </View>
      ) : (
        <FlatList
          key="categories_list"
          data={categories}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TVFocusable
              onPress={() => setSelectedCategory(item)}
              style={({ pressed }) => [
                styles.categoryItem,
                { backgroundColor: colors.surface2, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }
              ]}
            >
              <View style={styles.categoryLeft}>
                <View style={[styles.categoryIconBg, { backgroundColor: colors.gold + '15' }]}>
                  <Lineicons icon={MonitorBulk} size={18} color={colors.gold} />
                </View>
                <Text style={[styles.categoryName, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">{item.name}</Text>
              </View>
              <Lineicons icon={ArrowRightBulk} size={18} color={colors.mutedForeground} />
            </TVFocusable>
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 80 }]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  tvPaneCategories: { width: '25%', maxWidth: 280, borderRightWidth: 1 },
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, gap: 12 },
  title: { fontSize: 24, fontWeight: 'bold' },
  count: { fontSize: 13, marginTop: 2 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, marginBottom: 12, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 44 },
  searchInput: { flex: 1, fontSize: 14 },
  gridContent: { paddingHorizontal: 10 },
  gridItem: { flex: 1, padding: 6 },
  listContent: { paddingHorizontal: 20, paddingTop: 4 },
  categoryItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  categoryLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  categoryIconBg: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  categoryName: { fontSize: 16, fontWeight: '600', flex: 1 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold' },
});
