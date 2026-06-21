import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { ChannelCard } from '@/components/ChannelCard';
import { router, useNavigation } from 'expo-router';
import { useAppStore } from '@/store/app-store';
import { Channel } from '@/types';

export default function LiveScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const activePlaylistId = useAppStore((s) => s.activePlaylistId);
  const activeCategories = useAppStore((s) => s.activeCategories);
  const getChannelsForCategory = useAppStore((s) => s.getChannelsForCategory);
  const setPlaybackQueue = useAppStore((s) => s.setPlaybackQueue);

  const [selectedCategory, setSelectedCategory] = useState<{ id: string; name: string } | null>(null);
  const [localChannels, setLocalChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
  const hasDefaulted = React.useRef(false);

  const categories = useMemo(() => activeCategories?.live || [], [activeCategories]);

  // Load channels when category changes - use LOCAL state, not the shared store
  const loadCategory = useCallback(async (cat: { id: string; name: string }) => {
    if (!activePlaylistId) return;
    setLoading(true);
    setLocalChannels([]);
    try {
      const result = await getChannelsForCategory(activePlaylistId, 'live', cat.id, cat.name);
      setLocalChannels(result);
    } catch (e) {
      setLocalChannels([]);
    } finally {
      setLoading(false);
    }
  }, [activePlaylistId, getChannelsForCategory]);

  useEffect(() => {
    if (selectedCategory) {
      loadCategory(selectedCategory);
    }
  }, [selectedCategory, loadCategory]);

  // Auto-select first category when screen gains focus
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

  // Auto-select first category on initial load
  useEffect(() => {
    if (categories.length > 0 && !hasDefaulted.current) {
      setSelectedCategory(categories[0]);
      hasDefaulted.current = true;
    }
  }, [categories]);

  // Reset when playlist changes
  useEffect(() => {
    hasDefaulted.current = false;
    setSelectedCategory(null);
    setLocalChannels([]);
  }, [activePlaylistId]);

  // If a category is selected, render the channel list
  if (selectedCategory) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {selectedCategory.name}
          </Text>
          <Text style={[styles.count, { color: colors.mutedForeground }]}>
            {localChannels.length.toLocaleString()} channels
          </Text>
        </View>

        {/* Horizontal scrollable categories tabs bar */}
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
                      {
                        color: isSelected ? '#1A1A1A' : colors.text,
                        fontWeight: isSelected ? '700' : '500',
                      }
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
            Search channels, categories...
          </Text>
        </Pressable>

        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={colors.gold} />
          </View>
        ) : localChannels.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="tv" size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No channels found</Text>
          </View>
        ) : (
          <FlatList
            key="channels_grid"
            data={localChannels}
            keyExtractor={(item) => item.id}
            numColumns={2}
            renderItem={({ item, index }) => (
              <View style={styles.gridItem}>
                <ChannelCard
                  channel={item}
                  width={'100%' as any}
                  onPress={() => {
                    setPlaybackQueue(localChannels, index);
                    router.push({
                      pathname: '/player',
                      params: {
                        id: item.id,
                        streamUrl: item.streamUrl,
                        title: item.name,
                        isLive: 'true',
                        current: item.current,
                        next: item.next,
                        quality: item.quality,
                        logo: item.logo || '',
                        category: item.category || '',
                      },
                    });
                  }}
                />
              </View>
            )}
            contentContainerStyle={[styles.gridContent, { paddingBottom: insets.bottom + 80 }]}
            initialNumToRender={20}
            maxToRenderPerBatch={20}
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
        <Text style={[styles.title, { color: colors.text }]}>Live TV</Text>
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
          Search channels, categories...
        </Text>
      </Pressable>

      {categories.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="folder" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No categories found</Text>
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
                {
                  backgroundColor: colors.surface2,
                  borderColor: colors.border,
                  opacity: pressed ? 0.85 : 1,
                }
              ]}
            >
              <View style={styles.categoryLeft}>
                <View style={[styles.categoryIconBg, { backgroundColor: colors.gold + '15' }]}>
                  <Feather name="tv" size={18} color={colors.gold} />
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
  horizontalTabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
    gap: 8,
  },
  viewAllTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 36,
  },
  viewAllTabBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tabsScrollContent: {
    gap: 8,
    paddingRight: 10,
  },
  tabPill: {
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabPillText: {
    fontSize: 13,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
  },
  title: { fontSize: 24, fontWeight: 'bold' },
  count: { fontSize: 13, marginTop: 2 },
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
  gridContent: { paddingHorizontal: 12 },
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
