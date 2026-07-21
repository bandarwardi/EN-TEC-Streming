import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, useWindowDimensions, Platform, BackHandler, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { TVFocusable } from '@/components/TVFocusable';
import { MarqueeText } from '@/components/MarqueeText';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { Lineicons } from '@lineiconshq/react-native-lineicons';
import { MonitorBulk, ExpandSquare4Bulk, DashboardSquare1Bulk, Folder1Bulk, ArrowRightBulk } from '@lineiconshq/free-icons';
import { ChannelCard } from '@/components/ChannelCard';
import { router, useNavigation, useLocalSearchParams } from 'expo-router';
import { useAppStore } from '@/store/app-store';
import { Channel } from '@/types';
import { useVideoPlayer, VideoView } from 'expo-video';
import { WebVideoPlayer } from '@/components/WebVideoPlayer';

export default function LiveScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
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
  const [isVideoBuffering, setIsVideoBuffering] = useState(false);
  const isFullscreen = useAppStore((s) => s.isFullscreen);
  const setIsFullscreen = useAppStore((s) => s.setIsFullscreen);
  const hasDefaulted = useRef(false);
  const [showFullscreenHint, setShowFullscreenHint] = useState(false);

  const categories = useMemo(() => activeCategories?.live || [], [activeCategories]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isFullscreen) {
        setIsFullscreen(false);
        return true;
      }
      return false;
    });
    
    const handleKeyDown = (e: any) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    if (Platform.OS === 'web') {
      window.addEventListener('keydown', handleKeyDown);
    }

    if (isFullscreen) {
      setShowFullscreenHint(true);
      const timer = setTimeout(() => setShowFullscreenHint(false), 4000);
      return () => {
        backHandler.remove();
        if (Platform.OS === 'web') window.removeEventListener('keydown', handleKeyDown);
        clearTimeout(timer);
      };
    }

    return () => {
      backHandler.remove();
      if (Platform.OS === 'web') {
        window.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [isFullscreen]);

  // Load channels when category changes
  const loadCategory = useCallback(async (cat: { id: string; name: string }) => {
    if (!activePlaylistId) return;
    setLoading(true);
    setSelectedChannel(null);

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

      setSelectedCategory(null);
      hasDefaulted.current = false;
      // Do not auto-select the first category
    });

    return unsubscribe;
  }, [navigation, categories, categoryId, selectedCategory]);

  useEffect(() => {
    if (categories.length > 0 && !hasDefaulted.current) {
      // Do not auto-select the first category
      hasDefaulted.current = true;
    }
  }, [categories]);

  useEffect(() => {
    hasDefaulted.current = false;
    setSelectedCategory(null);
    setLocalChannels([]);
    setSelectedChannel(null);
  }, [activePlaylistId]);

  const player = useVideoPlayer(isLargeScreen && selectedChannel && isFocused ? selectedChannel.streamUrl : null, (p) => {
    p.volume = 1;
    p.play();
  });

  // Track buffering for native video player
  useEffect(() => {
    if (!isLargeScreen || Platform.OS === 'web' || !player) return;
    const subscription = player.addListener('statusChange', (payload) => {
      setIsVideoBuffering(payload.status !== 'readyToPlay');
    });
    return () => subscription.remove();
  }, [player, isLargeScreen]);

  useEffect(() => {
    if (selectedChannel) {
      setIsVideoBuffering(true);
    }
  }, [selectedChannel?.id]);

  if (!isFocused) return <View style={{ flex: 1, backgroundColor: '#05070a' }} />;

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
      <View style={[styles.tvContainer, { backgroundColor: isLargeScreen ? 'transparent' : colors.background, paddingLeft: 24, display: isFocused ? 'flex' : 'none' }]}>
        <View style={[{ flexDirection: 'row', width: 630 }, glassPaneStyle]}>
          {/* Pane 1: Categories */}
          <View style={[styles.tvPaneCategories, { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.08)' }]}>
            <View style={styles.tvHeader}>
              <Text style={[styles.tvTitle, { color: colors.text }]}>Categories</Text>
            </View>
          <ScrollView style={{ flex: 1 }}>
            {categories.map((item) => {
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

          {/* Pane 2: Channels */}
          <View style={[styles.tvPaneChannels]}>
            <View style={styles.tvHeader}>
              <Text style={[styles.tvTitle, { color: colors.text }]}>Channels</Text>
            </View>
          {localChannels.length === 0 && !loading ? (
            <View style={styles.centerAll}>
              <Lineicons icon={MonitorBulk} size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.text, marginTop: 12 }]}>No channels found</Text>
            </View>
          ) : (
            <View style={{ flex: 1, opacity: loading ? 0.5 : 1 }}>
              <FlatList
                data={localChannels}
                keyExtractor={(_, index) => index.toString()}
                style={{ flex: 1 }}
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
                             <Image source={{ uri: item.logo }} style={{ width: '100%', height: '100%' }} contentFit="contain" />
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
            </View>
          )}
        </View>
        </View>

        {/* Pane 3: Video Player */}
        <View style={isFullscreen ? [StyleSheet.absoluteFill, { zIndex: 9999, backgroundColor: '#000' }] : [styles.tvPanePlayer, glassPaneStyle, { marginRight: 32 }]}>
          {selectedChannel ? (
            <>
              <View style={styles.tvPlayerWrapper}>
                {Platform.OS === 'web' ? (
                  <WebVideoPlayer
                    source={`/proxy?url=${encodeURIComponent(selectedChannel.streamUrl)}`}
                    style={StyleSheet.absoluteFill}
                    paused={false}
                    controls={isFullscreen}
                    onReady={() => setIsVideoBuffering(false)}
                  />
                ) : (
                  <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" />
                )}
                {isVideoBuffering && (
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="large" color={colors.gold} />
                  </View>
                )}
              </View>
              {!isFullscreen && (
                <View style={[styles.tvPlayerInfo, { backgroundColor: 'rgba(20,20,20,0.95)', borderTopColor: colors.border }]}>
                  <Text style={[styles.tvPlayerTitle, { color: colors.text }]} numberOfLines={2} adjustsFontSizeToFit>{selectedChannel.name}</Text>
                  <Text style={{ color: colors.mutedForeground, marginTop: 4 }}>Now Playing • {selectedChannel.category}</Text>
                  <TVFocusable
                    style={({ focused }: any) => [
                      styles.tvFullscreenBtn,
                      { backgroundColor: focused ? colors.gold : colors.surface2, borderColor: focused ? colors.gold : colors.border }
                    ]}
                    onPress={() => setIsFullscreen(true)}
                  >
                    {({ focused }: any) => (
                      <>
                        <Lineicons icon={ExpandSquare4Bulk} size={16} color={focused ? '#000' : colors.text} />
                        <Text style={{ color: focused ? '#000' : colors.text, fontWeight: 'bold' }}>Full Screen</Text>
                      </>
                    )}
                  </TVFocusable>
                </View>
              )}
              {showFullscreenHint && (
                <View style={{ position: 'absolute', top: 40, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, zIndex: 99999 }}>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Press ESC to exit Full Screen</Text>
                </View>
              )}
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
        <View style={[styles.header, isLandscape && { paddingTop: 4, paddingBottom: 4 }]}>
          <TVFocusable 
            onPress={() => setSelectedCategory(null)} 
            style={{ marginRight: 8, padding: 8 }}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            disableBorder
          >
             <View pointerEvents="none">
               <Lineicons icon={ArrowRightBulk} size={24} color={colors.text} style={{ transform: [{ rotate: '180deg' }] }} />
             </View>
          </TVFocusable>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={[styles.title, { color: colors.text, fontSize: isLandscape ? 18 : 20 }]} numberOfLines={1}>
              {selectedCategory.name}
            </Text>
            <Text style={[styles.count, { color: colors.mutedForeground, fontSize: isLandscape ? 11 : 13 }]}>
              {localChannels.length.toLocaleString()} channels
            </Text>
          </View>
        </View>

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
            key="channels_list"
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
                  { borderColor: focused ? colors.gold : colors.border, backgroundColor: focused ? colors.surface : colors.surface2 },
                  { flexDirection: 'row', padding: 12, alignItems: 'center', gap: 12 }
                ]}
              >
                <View style={styles.mobileChannelListLogoContainer}>
                  {item.logo ? (
                    <Image source={{ uri: item.logo }} style={styles.mobileChannelListLogo} contentFit="contain" />
                  ) : (
                    <View style={styles.mobileChannelListLogoPlaceholder}>
                      <Lineicons icon={MonitorBulk} size={24} color={colors.text} />
                    </View>
                  )}
                </View>
                <View style={styles.mobileChannelListTextContainer}>
                  <Text style={[styles.mobileChannelListName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                  {item.current ? (
                    <Text style={[styles.mobileChannelListCurrent, { color: colors.mutedForeground }]} numberOfLines={1}>{item.current}</Text>
                  ) : null}
                </View>
                <View style={styles.mobileChannelListBadgeContainer}>
                   <View style={{ backgroundColor: '#EF4444', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                     <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>LIVE</Text>
                   </View>
                </View>
              </TVFocusable>
            )}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 120 }]}
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
              style={({ focused }: any) => [
                styles.categoryItem,
                { backgroundColor: focused ? colors.surface : colors.surface2, borderColor: focused ? colors.gold : colors.border },
                isLandscape && { padding: 8, marginBottom: 6 }
              ]}
            >
              <View style={[styles.categoryLeft, isLandscape && { gap: 8 }]}>
                <View style={[styles.categoryIconBg, { backgroundColor: colors.gold + '15' }, isLandscape && { width: 30, height: 30, borderRadius: 8 }]}>
                  <Lineicons icon={MonitorBulk} size={isLandscape ? 14 : 18} color={colors.gold} />
                </View>
                <Text style={[styles.categoryName, { color: colors.text, flex: 1 }, isLandscape && { fontSize: 14 }]} numberOfLines={isLandscape ? 1 : 2}>{item.name}</Text>
              </View>
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
    marginBottom: 8
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
  tvPaneCategories: { width: 280, borderRightWidth: 1 },
  tvPaneChannels: { width: 350, borderRightWidth: 1 },
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 4, gap: 12 },
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
