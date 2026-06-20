import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { MovieCard } from '@/components/MovieCard';
import { router } from 'expo-router';
import { useAppStore } from '@/store/app-store';

export default function SeriesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState<{ id: string; name: string } | null>(null);
  const [search, setSearch] = useState('');

  const activePlaylistId = useAppStore((s) => s.activePlaylistId);
  const activeCategories = useAppStore((s) => s.activeCategories);
  const channels = useAppStore((s) => s.channels);
  const loading = useAppStore((s) => s.loadingChannels);
  const loadChannelsForCategory = useAppStore((s) => s.loadChannelsForCategory);

  const categories = useMemo(() => {
    return activeCategories?.series || [];
  }, [activeCategories]);

  // Load channels when category changes
  useEffect(() => {
    if (activePlaylistId && selectedCategory) {
      loadChannelsForCategory(activePlaylistId, 'series', selectedCategory.id, selectedCategory.name);
    }
  }, [activePlaylistId, selectedCategory]);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase();
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, search]);

  const filteredSeries = useMemo(() => {
    let list = channels;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    return list.map((c) => ({
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
  }, [channels, search]);

  // If a category is selected, render the series grid
  if (selectedCategory) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable 
            onPress={() => {
              setSelectedCategory(null);
              setSearch('');
            }}
            style={[styles.backButton, { backgroundColor: colors.surface2, borderColor: colors.border }]}
          >
            <Feather name="arrow-left" size={16} color={colors.text} />
            <Text style={[styles.backButtonText, { color: colors.text }]}>Categories</Text>
          </Pressable>
          
          <View style={styles.titleWrapper}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {selectedCategory.name}
            </Text>
            <Text style={[styles.count, { color: colors.mutedForeground }]}>
              {filteredSeries.length.toLocaleString()} titles
            </Text>
          </View>
        </View>

        <View style={[styles.searchBar, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={`Search in ${selectedCategory.name}...`}
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={colors.gold} />
          </View>
        ) : filteredSeries.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="play-circle" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No series found</Text>
          </View>
        ) : (
          <FlatList
            key="series_grid"
            data={filteredSeries}
            keyExtractor={(item) => item.id}
            numColumns={3}
            renderItem={({ item }) => {
              const itemAny = item as any;
              return (
                <View style={styles.gridItem}>
                  <MovieCard
                    movie={itemAny}
                    width={'100%' as any}
                    onPress={() => {
                      router.push({
                        pathname: '/series-detail',
                        params: {
                          id: itemAny.id,
                          title: itemAny.title,
                          poster: itemAny.poster,
                          backdrop: itemAny.backdrop,
                          genres: itemAny.genres.join(','),
                          description: itemAny.description,
                          streamUrl: itemAny.streamUrl || '',
                        },
                      });
                    }}
                  />
                </View>
              );
            }}
            contentContainerStyle={[styles.gridContent, { paddingBottom: insets.bottom + 80 }]}
            initialNumToRender={18}
            maxToRenderPerBatch={18}
            windowSize={5}
          />
        )}
      </View>
    );
  }

  // Render Full Screen Categories list
  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Series</Text>
        <Text style={[styles.count, { color: colors.mutedForeground }]}>
          {categories.length.toLocaleString()} categories
        </Text>
      </View>

      <View style={[styles.searchBar, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search categories..."
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      {filteredCategories.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="folder" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No categories found</Text>
          {categories.length === 0 && (
            <>
              <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
                Add an M3U or Xtream playlist in Settings to get started
              </Text>
              <Pressable
                style={[styles.emptyBtn, { borderColor: colors.gold }]}
                onPress={() => router.push('/playlists')}
              >
                <Feather name="plus" size={16} color={colors.gold} />
                <Text style={[styles.emptyBtnText, { color: colors.gold }]}>Add Playlist</Text>
              </Pressable>
            </>
          )}
        </View>
      ) : (
        <FlatList
          key="categories_list"
          data={filteredCategories}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                setSelectedCategory(item);
                setSearch('');
              }}
              style={({ pressed }) => [
                styles.categoryItem,
                {
                  backgroundColor: colors.surface2,
                  borderColor: colors.border,
                  opacity: pressed ? 0.85 : 1,
                }
              ]}
            >
              <View style={styles.categoryLeft}>
                <View style={[styles.categoryIconBg, { backgroundColor: colors.gold + '15' }]}>
                  <Feather name="play-circle" size={18} color={colors.gold} />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
  },
  titleWrapper: {
    alignItems: 'flex-end',
    flex: 1,
  },
  title: { fontSize: 24, fontWeight: 'bold' },
  count: { fontSize: 13, marginTop: 2 },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 14 },
  gridContent: { paddingHorizontal: 10 },
  gridItem: { flex: 1, padding: 6 },
  listContent: { paddingHorizontal: 20, paddingTop: 4 },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryIconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: 'bold' },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 8,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '600' },
});
