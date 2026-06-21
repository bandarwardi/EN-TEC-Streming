import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { FeaturedHero } from '@/types';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { useAppStore } from '@/store/app-store';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface HeroCarouselProps {
  items: FeaturedHero[];
  onPlay: (item: FeaturedHero) => void;
  onInfo: (item: FeaturedHero) => void;
}

export function HeroCarousel({ items, onPlay, onInfo }: HeroCarouselProps) {
  const colors = useColors();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const favorites = useAppStore((s) => s.favorites);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);

  // Auto-scroll effect
  useEffect(() => {
    if (items.length <= 1 || isUserInteracting) return;

    const interval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % items.length;
      scrollViewRef.current?.scrollTo({
        x: nextIndex * SCREEN_WIDTH,
        animated: true,
      });
      setCurrentIndex(nextIndex);
    }, 6000);

    return () => clearInterval(interval);
  }, [currentIndex, items.length, isUserInteracting]);

  if (!items.length) return null;

  const handleToggleFavorite = (item: FeaturedHero) => {
    if (!item) return;
    if (item.originalItem) {
      toggleFavorite(item.originalItem);
    } else {
      toggleFavorite({
        id: item.id,
        name: item.title,
        logo: typeof item.backdrop === 'object' && 'uri' in item.backdrop ? item.backdrop.uri : '',
        category: item.genres[0] || 'Uncategorized',
        current: item.description || '',
        next: '',
        quality: item.duration === 'LIVE' ? 'HD' : 'FHD',
        isLive: item.duration === 'LIVE',
        streamUrl: item.streamUrl || '',
        type: item.duration === 'LIVE' ? 'live' : 'vod',
      } as any);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setCurrentIndex(index);
        }}
        onScrollBeginDrag={() => {
          setIsUserInteracting(true);
        }}
        onScrollEndDrag={() => {
          setIsUserInteracting(false);
        }}
        style={StyleSheet.absoluteFill}
      >
        {items.map((item) => {
          const isFav = favorites.includes(item.id);
          return (
            <View key={item.id} style={styles.slide}>
              <Image source={item.backdrop} style={StyleSheet.absoluteFill} contentFit="cover" />
              <LinearGradient
                colors={['transparent', 'rgba(10,10,10,0.5)', '#0A0A0A']}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.content}>
                <Text style={[styles.subtitle, { color: colors.gold }]}>{item.subtitle}</Text>
                <Text style={styles.title}>{item.title}</Text>

                <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                  ⭐ {item.rating} · {item.year} · {item.duration} · {item.genres.join(' · ')}
                </Text>

                <Text style={[styles.description, { color: colors.mutedForeground }]} numberOfLines={2}>
                  {item.description}
                </Text>

                <View style={styles.actions}>
                  <Pressable style={styles.playButton} onPress={() => onPlay(item)}>
                    <Feather name="play" size={20} color="#0A0A0A" />
                    <Text style={styles.playButtonText}>Play</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.listButton, { borderColor: isFav ? colors.gold : colors.border }]}
                    onPress={() => handleToggleFavorite(item)}
                  >
                    <Feather name={isFav ? 'check' : 'plus'} size={20} color={isFav ? colors.gold : '#FFF'} />
                    <Text style={[styles.listButtonText, { color: isFav ? colors.gold : '#FFF' }]}>Favorites</Text>
                  </Pressable>

                  <Pressable style={[styles.infoButton, { borderColor: colors.border }]} onPress={() => onInfo(item)}>
                    <Feather name="info" size={20} color="#FFF" />
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.indicators}>
        {items.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i === currentIndex ? colors.gold : colors.muted }
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: SCREEN_HEIGHT * 0.7,
    width: '100%',
    position: 'relative',
  },
  slide: {
    width: SCREEN_WIDTH,
    height: '100%',
    position: 'relative',
  },
  content: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 12,
  },
  meta: {
    fontSize: 12,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  playButton: {
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  playButtonText: {
    color: '#0A0A0A',
    fontWeight: 'bold',
    fontSize: 16,
  },
  listButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  listButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  infoButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicators: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    zIndex: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  }
});