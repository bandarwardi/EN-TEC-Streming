import React from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Image } from 'expo-image';
import { WatchedItem } from '@/store/app-store';
import { useColors } from '@/hooks/useColors';
import { LinearGradient } from 'expo-linear-gradient';

function formatDuration(sec: number) {
  if (sec < 0) return '0:00';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

interface ContinueWatchingCardProps {
  item: WatchedItem;
  onPress: () => void;
  width?: number;
}

export const ContinueWatchingCard = React.memo(function ContinueWatchingCard({ item, onPress, width = 240 }: ContinueWatchingCardProps) {
  const colors = useColors();
  const [isFocused, setIsFocused] = React.useState(false);
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handleFocus = React.useCallback(() => {
    setIsFocused(true);
    Animated.spring(scaleAnim, { toValue: 1.05, useNativeDriver: true }).start();
  }, [scaleAnim]);

  const handleBlur = React.useCallback(() => {
    setIsFocused(false);
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  }, [scaleAnim]);

  const percent = item.duration > 0 ? Math.min(100, Math.max(0, (item.progress / item.duration) * 100)) : 0;

  // Use backdrop if available, fallback to poster
  let imageSource = item.backdrop || item.poster;
  if (!imageSource) imageSource = 'https://via.placeholder.com/400x225/1a1a1a/ffffff?text=No+Image';

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scaleAnim, { toValue: isFocused ? 1.05 : 1, useNativeDriver: true }).start()}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      <Animated.View style={[{ width, transform: [{ scale: scaleAnim }] }]}>
        <View style={[
          styles.posterContainer,
          { borderColor: isFocused ? colors.gold : 'transparent', borderWidth: 2 }
        ]}>
          <Image source={{ uri: imageSource }} style={styles.poster} contentFit="cover" />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.9)']} style={styles.gradient}>
            <View style={styles.infoRow}>
              <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.time}>{formatDuration(item.duration)}</Text>
            </View>
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${percent}%`, backgroundColor: colors.gold }]} />
            </View>
          </LinearGradient>
        </View>
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  posterContainer: {
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
    marginBottom: 8,
    position: 'relative',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    paddingTop: 32,
    justifyContent: 'flex-end',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  title: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  time: {
    color: '#DDD',
    fontSize: 12,
  },
  progressContainer: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
  }
});
