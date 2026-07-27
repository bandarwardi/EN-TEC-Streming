import React from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Image } from 'expo-image';
import { Movie } from '@/types';
import { QualityBadge } from './QualityBadge';
import { useColors } from '@/hooks/useColors';

interface MovieCardProps {
  movie: Movie;
  onPress: () => void;
  width?: number;
  autoFocus?: boolean;
}

export const MovieCard = React.memo(function MovieCard({
  movie,
  onPress,
  width = 128,
}: MovieCardProps) {
  const colors = useColors();
  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(movie.title || 'Movie')}&background=1A1F2B&color=F4C542&bold=true&size=300&format=svg`;
  const [imgSource, setImgSource] = React.useState(movie.poster || fallbackUrl);
  const scale = React.useRef(new Animated.Value(1)).current;
  const overlayOpacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    setImgSource(movie.poster || fallbackUrl);
  }, [movie.poster]);

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 30 }),
      Animated.timing(overlayOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[{ width }, { transform: [{ scale }] }]}>
        <View style={[styles.posterContainer, { backgroundColor: colors.surface }]}>
          <Image
            source={{
              uri: imgSource,
              headers: {
                'User-Agent': 'Mozilla/5.0',
              },
            }}
            style={styles.poster}
            contentFit="cover"
            onError={() => {
              if (imgSource !== fallbackUrl) setImgSource(fallbackUrl);
            }}
          />
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: 'rgba(244,197,66,0.08)', opacity: overlayOpacity },
            ]}
          />
          {(movie as any).quality && (
            <View style={styles.badges}>
              <QualityBadge quality={(movie as any).quality} />
            </View>
          )}
        </View>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {movie.title}
        </Text>
        {(movie as any).year && (
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            {(movie as any).year}
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  posterContainer: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 8,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  badges: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  meta: {
    fontSize: 11,
    marginTop: 2,
  },
});
