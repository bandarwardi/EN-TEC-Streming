import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, useWindowDimensions, Platform } from 'react-native';
import { Image } from 'expo-image';
import { TVFocusable } from '@/components/TVFocusable';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Lineicons } from '@lineiconshq/react-native-lineicons';
import { MonitorBulk, ExpandSquare4Bulk, DashboardSquare1Bulk, Folder1Bulk, ArrowRightBulk } from '@lineiconshq/free-icons';
import { ChannelCard } from '@/components/ChannelCard';
import { router, useNavigation, useLocalSearchParams } from 'expo-router';
import { useAppStore } from '@/store/app-store';
import { Channel } from '@/types';
import { useVideoPlayer, VideoView } from 'expo-video';

export default function LiveScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const mobileNumColumns = Math.max(2, Math.floor((width - 40) / 160));
  const isLargeScreen = width >= 1024 || Platform.isTV;

  const activePlaylistId = useAppStore((s) => s.activePlaylistId);
  const activeCategories = useAppStore((s) => s.activeCategories);
  const getChannelsForCategory = useAppStore((s) => s.getChannelsForCategory);
  const setPlaybackQueue = useAppStore((s) => s.setPlaybackQueue);

  const [selectedCategory, setSelectedCategory] = useState<{ id: string; name: string } | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [localChannels, setLocalChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);
  const hasDefaulted = useRef(false);

  const categories = useMemo(() => activeCategories?.live || [], [activeCategories]);

  // Load channels when category changes
  const loadCategory = useCallback(async (cat: { id: string; name: string }) => {
    if (!activePlaylistId) return;
    setLoading(true);
    setLocalChannels([]);
    try {
      const result = await getChannelsForCategory(activePlaylistId, 'live', cat.id, cat.name);
      setLocalChannels(result);
      if (isLargeScreen && result.length > 0) {
        setSelectedChannel(result[0]);
      }
    } catch (e) {
      setLocalChannels([]);
    } finally {
      setLoading(false);
    }
  }, [activePlaylistId, getChannelsForCategory, isLargeScreen]);

  useEffect(() => {
    if (selectedCategory) {
      loadCategory(selectedCategory);
    }
  }, [selectedCategory, loadCategory]);

  const { categoryId } = useLocalSearchParams<{ categoryId?: string }>();

  // Auto-select category
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (categoryId && categories.length > 0) {
        const targetCat = categories.find(c => c.id === categoryId);
        if (targetCat) {
          setSelectedCategory(targetCat);
          hasDefaulted.current = true;
          // Clear it from router so it doesn't stick forever if we want to navigate elsewhere
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
    setLocalChannels([]);
    setSelectedChannel(null);
  }, [activePlaylistId]);

  // Video Player for Large Screens
  const player = useVideoPlayer(isLargeScreen && selectedChannel ? selectedChannel.streamUrl : null, (p) => {
    p.volume = 1;
    p.play();
  });


  if (isLargeScreen) {
    return (
      <View style={[styles.tvContainer, { backgroundColor: colors.background }]}>
        {/* Pane 1: Categories */}
        <View style={[styles.tvPaneCategories, { borderColor: colors.border }]}>
          <View style={styles.tvHeader}>
            <Text style={[styles.tvTitle, { color: colors.text }]}>Categories</Text>
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

        {/* Pane 2: Channels */}
        <View style={[styles.tvPaneChannels, { borderColor: colors.border }]}>
          <View style={styles.tvHeader}>
            <Text style={[styles.tvTitle, { color: colors.text }]}>Channels</Text>
          </View>
          {loading ? (
            <View style={styles.centerAll}>
              <ActivityIndicator size="large" color={colors.gold} />
            </View>
          ) : (
            <FlatList
              data={localChannels}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = selectedChannel?.id === item.id;
                return (
                  <TVFocusable
                    onPress={() => setSelectedChannel(item)}
                    style={({ focused }: any) => [
                      styles.tvChannelItem,
                      isSelected && { backgroundColor: 'rgba(212,168,67,0.15)', borderLeftWidth: 3, borderLeftColor: colors.gold },
                      focused && { backgroundColor: colors.gold, transform: [{ scale: 1.02 }] }
                    ]}
                  >
                    {({ focused }: any) => (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        {item.logo ? (
                           <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                             {/* FastImage equivalent or normal image could go here, omitting for brevity */}
                             <Lineicons icon={MonitorBulk} size={20} color={focused ? '#000' : colors.text} style={{ padding: 10 }} />
                           </View>
                        ) : (
                          <View style={[styles.tvChannelIconPlaceholder, { backgroundColor: focused ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.05)' }]}>
                            <Lineicons icon={MonitorBulk} size={20} color={focused ? '#000' : colors.text} />
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.tvChannelText, { color: focused ? '#000' : colors.text, fontWeight: isSelected ? 'bold' : '500' }]} numberOfLines={1}>
                            {item.name}
                          </Text>
                        </View>
                      </View>
                    )}
                  </TVFocusable>
                );
              }}
            />
          )}
        </View>

        {/* Pane 3: Player */}
        <View style={styles.tvPanePlayer}>
          {selectedChannel ? (
            <>
              <View style={styles.tvPlayerWrapper}>
                <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" />
              </View>
              <View style={[styles.tvPlayerInfo, { backgroundColor: 'rgba(20,20,20,0.95)', borderTopColor: colors.border }]}>
                <Text style={[styles.tvPlayerTitle, { color: colors.text }]} numberOfLines={2} adjustsFontSizeToFit>{selectedChannel.name}</Text>
                <Text style={{ color: colors.mutedForeground, marginTop: 4 }}>Now Playing • {selectedChannel.category}</Text>
                <TVFocusable
                  style={({ focused }: any) => [
                    styles.tvFullscreenBtn,
                    { backgroundColor: focused ? colors.gold : colors.surface2, borderColor: focused ? colors.gold : colors.border }
                  ]}
                  onPress={() => {
                    const idx = localChannels.findIndex(c => c.id === selectedChannel.id);
                    setPlaybackQueue(localChannels, idx >= 0 ? idx : 0);
                    router.push({
                      pathname: '/player',
                      params: {
                        id: selectedChannel.id,
                        streamUrl: selectedChannel.streamUrl,
                        title: selectedChannel.name,
                        isLive: 'true',
                        current: selectedChannel.current,
                        quality: selectedChannel.quality,
                      },
                    });
                  }}
                >
                  {({ focused }: any) => (
                    <>
                      <Lineicons icon={ExpandSquare4Bulk} size={16} color={focused ? '#000' : colors.text} />
                      <Text style={{ color: focused ? '#000' : colors.text, fontWeight: 'bold' }}>Full Screen</Text>
                    </>
                  )}
                </TVFocusable>
              </View>
            </>
          ) : (
            <View style={styles.centerAll}>
              <Lineicons icon={MonitorBulk} size={48} color={colors.mutedForeground} />
              <Text style={{ color: colors.mutedForeground, marginTop: 16 }}>Select a channel to play</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  // Mobile layout below (classic multi-step drill down)
  if (selectedCategory) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
              {selectedCategory.name}
            </Text>
            <Text style={[styles.count, { color: colors.mutedForeground }]}>
              {localChannels.length.toLocaleString()} channels
            </Text>
          </View>
          <TVFocusable
            onPress={() => setSelectedCategory(null)}
            style={({ focused }: any) => [
              { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: focused ? colors.gold : colors.surface2, borderRadius: 8, borderWidth: 1, borderColor: focused ? '#000' : colors.border, flexDirection: 'row', alignItems: 'center', gap: 6 }
            ]}
          >
            {({ focused }: any) => (
               <>
                 <Lineicons icon={DashboardSquare1Bulk} size={20} color={focused ? '#000' : colors.gold} />
                 {!isLandscape && <Text style={{ color: focused ? '#000' : colors.text, fontSize: 13, fontWeight: 'bold' }}>Categories</Text>}
               </>
            )}
          </TVFocusable>
        </View>

        {!isLandscape && (<View style={[styles.horizontalTabsContainer, { marginBottom: 12 }]}>
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
                      {
                        color: isSelected ? '#1A1A1A' : colors.text,
                        fontWeight: isSelected ? '700' : '500',
                      }
                    ]}
                  >
                    {item.name}
                  </Text>
                </TVFocusable>
              );
            }}
          />
        </View>
        )}

        {loading ? (
          <View style={styles.centerAll}>
            <ActivityIndicator size="large" color={colors.gold} />
          </View>
        ) : localChannels.length === 0 ? (
          <View style={styles.centerAll}>
            <Lineicons icon={MonitorBulk} size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.text, marginTop: 12 }]}>No channels found</Text>
          </View>
        ) : (
          <FlatList
            key="mobile_channels"
            data={localChannels}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <TVFocusable
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
                style={({ focused }: any) => [
                  styles.mobileChannelListContent,
                  { backgroundColor: focused ? colors.surface : colors.surface2, borderColor: focused ? colors.gold : colors.border }
                ]}
              >
                {({ focused }: any) => (
                  <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', padding: 12, gap: 12 }}>
                    {item.logo ? (
                       <View style={styles.mobileChannelListLogoContainer}>
                         <Image source={{ uri: item.logo }} style={styles.mobileChannelListLogo} contentFit="contain" />
                       </View>
                    ) : (
                      <View style={styles.mobileChannelListLogoPlaceholder}>
                        <Lineicons icon={MonitorBulk} size={24} color={focused ? '#000' : colors.text} />
                      </View>
                    )}
                    <View style={styles.mobileChannelListTextContainer}>
                      <Text style={[styles.mobileChannelListName, { color: focused ? '#000' : colors.text }]} numberOfLines={2}>
                        {item.name}
                      </Text>
                      {item.current && (
                        <Text style={[styles.mobileChannelListCurrent, { color: focused ? '#333' : colors.mutedForeground }]} numberOfLines={2}>
                          {item.current}
                        </Text>
                      )}
                    </View>
                    <View style={styles.mobileChannelListBadgeContainer}>
                       {true ? (
                          <View style={{ backgroundColor: '#E53935', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>LIVE</Text>
                          </View>
                       ) : (
                          <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>{item.quality || 'HD'}</Text>
                          </View>
                       )}
                    </View>
                  </View>
                )}
              </TVFocusable>
            )}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 120, paddingHorizontal: 20, paddingTop: 10 }]}
          />
        )}

        <TVFocusable
          onPress={() => setSelectedCategory(null)}
          style={[styles.floatingViewAllBtn, { backgroundColor: colors.surface, borderColor: colors.border, bottom: insets.bottom + 90 }]}
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
        <Text style={[styles.title, { color: colors.text }]}>Live TV</Text>
        <Text style={[styles.count, { color: colors.mutedForeground }]}>
          {categories.length.toLocaleString()} categories
        </Text>
      </View>
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
                <Text style={[styles.categoryName, { color: colors.text }]}>{item.name}</Text>
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
  tvPaneChannels: { width: '30%', maxWidth: 350, borderRightWidth: 1 },
  tvPanePlayer: { flex: 1, backgroundColor: '#000', flexDirection: 'column' },
  tvHeader: { padding: 24, paddingBottom: 16 },
  tvTitle: { fontSize: 24, fontWeight: 'bold' },
  tvCategoryItem: { paddingHorizontal: 24, paddingVertical: 16, borderLeftWidth: 3, borderLeftColor: 'transparent' },
  tvCategoryText: { fontSize: 16 },
  tvChannelItem: { paddingHorizontal: 24, paddingVertical: 12, borderLeftWidth: 3, borderLeftColor: 'transparent' },
  tvChannelText: { fontSize: 15 },
  tvChannelIconPlaceholder: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  tvPlayerWrapper: { flex: 1, backgroundColor: '#000' },
  tvPlayerInfo: { padding: 32, borderTopWidth: 1 },
  tvPlayerTitle: { fontSize: 32, fontWeight: 'bold' },
  tvFullscreenBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1, marginTop: 24 },

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
  gridContent: { paddingHorizontal: 12 },
  gridItem: { flex: 1, padding: 6 },
  listContent: { paddingHorizontal: 20, paddingTop: 4 },
  categoryItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  categoryLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  categoryIconBg: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  categoryName: { fontSize: 16, fontWeight: '600' },
  emptyTitle: { fontSize: 18, fontWeight: 'bold' },
});
