import React from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Image } from 'expo-image';
import { Movie } from '@/types';
import { QualityBadge } from './QualityBadge';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';

interface MovieCardProps {
  movie: Movie;
  onPress: () => void;
  width?: number;
}

export const MovieCard = React.memo(function MovieCard({ movie, onPress, width = 128 }: MovieCardProps) {
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
          <Image source={{ uri: movie.poster }} style={styles.poster} contentFit="cover" />
          <View style={styles.badges}>
            <View style={[styles.ratingBadge, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
              <Feather name="star" size={10} color={colors.gold} />
              <Text style={styles.ratingText}>{movie.rating.toFixed(1)}</Text>
            </View>
            <QualityBadge quality={movie.quality} />
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  posterContainer: {
    aspectRatio: 2 / 3,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
    marginBottom: 8,
    position: 'relative',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  badges: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  ratingText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  meta: {
    fontSize: 11,
    marginTop: 2,
  }
});