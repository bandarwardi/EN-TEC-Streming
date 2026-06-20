import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Pressable, 
  Dimensions 
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useAppStore } from '@/store/app-store';
import { Channel } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TabType = 'live' | 'vod' | 'series';

export default function FavoritesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const favoriteItems = useAppStore((s) => s.favoriteItems) || [];
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);

  const [activeTab, setActiveTab] = useState<TabType>('live');

  const filteredItems = favoriteItems.filter(item => item.type === activeTab);

  const handleItemPress = (item: Channel) => {
    if (item.type === 'live') {
      router.push({
        pathname: '/player',
        params: {
          streamUrl: item.streamUrl,
          title: item.name,
          isLive: 'true',
          current: item.current || '',
          next: item.next || '',
          quality: item.quality || 'HD'
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
          description: '',
          streamUrl: item.streamUrl
        }
      });
    }
  };

  const renderCard = ({ item }: { item: Channel }) => {
    const isLive = item.type === 'live';
    
    return (
      <View style={[styles.cardContainer, isLive ? styles.liveWidth : styles.vodWidth]}>
        <Pressable 
          style={[
            styles.card, 
            { backgroundColor: colors.surface, borderColor: colors.border }
          ]}
          onPress={() => handleItemPress(item)}
        >
          <View style={isLive ? styles.liveLogoWrapper : styles.posterWrapper}>
            <Image 
              source={{ uri: item.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=1A1A1A&color=D4A843&bold=true&size=150&format=svg` }} 
              style={styles.cardImage} 
              contentFit={isLive ? "contain" : "cover"} 
            />
            
            <Pressable 
              style={[styles.removeFavBtn, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
              onPress={() => toggleFavorite(item)}
            >
              <Feather name="heart" size={16} color="#E53935" fill="#E53935" />
            </Pressable>

            {isLive && (
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            )}
          </View>
          
          <View style={styles.cardInfo}>
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.cardCategory, { color: colors.mutedForeground }]} numberOfLines={1}>
              {item.category}
            </Text>
          </View>
        </Pressable>
      </View>
    );
  };

  const tabs: { type: TabType; label: string; labelAr: string }[] = [
    { type: 'live', label: 'Live TV', labelAr: 'قنوات مباشرة' },
    { type: 'vod', label: 'Movies', labelAr: 'أفلام' },
    { type: 'series', label: 'TV Series', labelAr: 'مسلسلات' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Favorites / المفضلة</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.type;
          return (
            <Pressable
              key={tab.type}
              style={[
                styles.tabItem,
                isSelected && { borderBottomColor: colors.gold }
              ]}
              onPress={() => setActiveTab(tab.type)}
            >
              <Text style={[
                styles.tabLabel, 
                { color: isSelected ? colors.gold : colors.mutedForeground }
              ]}>
                {tab.label}
              </Text>
              <Text style={[
                styles.tabLabelAr, 
                { color: isSelected ? colors.gold : colors.mutedForeground }
              ]}>
                {tab.labelAr}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        numColumns={activeTab === 'live' ? 2 : 3}
        key={activeTab} // rebuild layout when changing tabs (columns count changes)
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 20 }
        ]}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="heart" size={48} color={colors.mutedForeground} style={{ marginBottom: 16 }} />
            <Text style={[styles.emptyText, { color: colors.text }]}>
              No favorites added yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
              لا توجد عناصر مضافة للمفضلة حالياً
            </Text>
          </View>
        }
      />
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  tabLabelAr: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 8,
    flexGrow: 1,
  },
  cardContainer: {
    padding: 6,
  },
  liveWidth: {
    width: '50%',
  },
  vodWidth: {
    width: '33.33%',
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  liveLogoWrapper: {
    aspectRatio: 16/10,
    width: '100%',
    backgroundColor: '#151515',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    padding: 12,
  },
  posterWrapper: {
    aspectRatio: 2/3,
    width: '100%',
    position: 'relative',
    backgroundColor: '#151515',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  removeFavBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  liveIndicator: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: '#E53935',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFF',
  },
  liveText: {
    color: '#FFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
  cardInfo: {
    padding: 10,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  cardCategory: {
    fontSize: 11,
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 6,
  },
});
