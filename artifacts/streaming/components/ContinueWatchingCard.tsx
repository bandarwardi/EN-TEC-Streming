import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TVFocusable } from '@/components/TVFocusable';
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

  const percent = item.duration > 0 ? Math.min(100, Math.max(0, (item.progress / item.duration) * 100)) : 0;

  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.title || 'Movie')}&background=1A1A1A&color=D4A843&bold=true&size=300&format=svg`;
  const initialImage = item.backdrop || item.poster || fallbackUrl;
  const [imgSource, setImgSource] = React.useState(initialImage);

  React.useEffect(() => {
    setImgSource(item.backdrop || item.poster || fallbackUrl);
  }, [item.backdrop, item.poster, fallbackUrl]);

  return (
    <TVFocusable onPress={onPress} style={{ width }} disableBorder={true}>
      {({ focused }: any) => (
        <View style={[
          styles.posterContainer,
          { borderColor: focused ? colors.gold : 'transparent', borderWidth: 2 }
        ]}>
          <Image 
            source={{ uri: imgSource }} 
            style={styles.poster} 
            contentFit="cover" 
            onError={() => {
              if (imgSource !== fallbackUrl) setImgSource(fallbackUrl);
            }}
          />
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
      )}
    </TVFocusable>
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
