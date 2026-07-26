import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TVFocusable } from '@/components/TVFocusable';
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

export const MovieCard = React.memo(function MovieCard({ movie, onPress, width = 128, autoFocus = false }: MovieCardProps) {
  const colors = useColors();
  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(movie.title || 'Movie')}&background=1A1A1A&color=D4A843&bold=true&size=300&format=svg`;
  const [imgSource, setImgSource] = React.useState(movie.poster || fallbackUrl);

  // Update source if movie changes
  React.useEffect(() => {
    setImgSource(movie.poster || fallbackUrl);
  }, [movie.poster, fallbackUrl]);

  return (
    <TVFocusable onPress={onPress} style={{ width }} disableBorder={true} hasTVPreferredFocus={autoFocus}>
      {({ focused }: any) => {
        const isHighlighted = focused || autoFocus;
        return (
          <View style={[
            styles.posterContainer,
            { 
              borderColor: isHighlighted ? colors.gold : 'transparent', 
              borderWidth: 4,
              transform: isHighlighted ? [{ scale: 1.05 }] : [{ scale: 1 }]
            }
          ]}>
            <Image 
              source={{ 
                uri: imgSource,
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
              }} 
              style={styles.poster} 
              contentFit="cover" 
              onError={() => {
                if (imgSource !== fallbackUrl) setImgSource(fallbackUrl);
              }}
            />
          </View>
        );
      }}
    </TVFocusable>
  );
});

const styles = StyleSheet.create({
  posterContainer: {
    width: '100%',
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