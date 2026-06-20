import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, runOnJS } from 'react-native-reanimated';
import { FeaturedHero } from '@/types';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface HeroCarouselProps {
  items: FeaturedHero[];
  onPlay: (item: FeaturedHero) => void;
}

export function HeroCarousel({ items, onPlay }: HeroCarouselProps) {
  const colors = useColors();
  const [currentIndex, setCurrentIndex] = useState(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (items.length <= 1) return;
    
    const interval = setInterval(() => {
      opacity.value = withTiming(0, { duration: 300 }, () => {
        runOnJS(setCurrentIndex)((currentIndex + 1) % items.length);
        opacity.value = withTiming(1, { duration: 300 });
      });
    }, 6000);
    
    return () => clearInterval(interval);
  }, [currentIndex, items.length]);

  if (!items.length) return null;
  const item = items[currentIndex];

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
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
            
            <Pressable style={[styles.listButton, { borderColor: colors.border }]}>
              <Feather name="plus" size={20} color="#FFF" />
              <Text style={styles.listButtonText}>My List</Text>
            </Pressable>
            
            <Pressable style={[styles.infoButton, { borderColor: colors.border }]}>
              <Feather name="info" size={20} color="#FFF" />
            </Pressable>
          </View>
        </View>
      </Animated.View>
      
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
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  }
});