import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TVFocusable } from '@/components/TVFocusable';
import { Image } from 'expo-image';
import { Channel } from '@/types';
import { LiveBadge } from './LiveBadge';
import { QualityBadge } from './QualityBadge';
import { useColors } from '@/hooks/useColors';

interface ChannelCardProps {
  channel: Channel;
  onPress: () => void;
  width?: number;
}

export const ChannelCard = React.memo(function ChannelCard({ channel, onPress, width = 160 }: ChannelCardProps) {
  const colors = useColors();
  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.name || 'Channel')}&background=1A1A1A&color=D4A843&bold=true&size=300&format=svg`;
  const [imgSource, setImgSource] = React.useState(channel.logo || fallbackUrl);

  React.useEffect(() => {
    setImgSource(channel.logo || fallbackUrl);
  }, [channel.logo, fallbackUrl]);

  return (
    <TVFocusable onPress={onPress} style={[styles.container, { width }]} disableBorder={true}>
      {({ focused }: any) => (
        <View style={[
          styles.imageContainer,
          {
            borderColor: focused ? colors.gold : colors.border,
            borderWidth: 4,
            backgroundColor: focused ? 'rgba(255,255,255,0.05)' : colors.surface
          }
        ]}>
          <Image 
            source={{ uri: imgSource }} 
            style={styles.logo} 
            contentFit="contain" 
            onError={() => {
              if (imgSource !== fallbackUrl) setImgSource(fallbackUrl);
            }}
          />
          <View style={styles.badgeContainer}>
            {channel.isLive && <LiveBadge />}
          </View>
        </View>
      )}
    </TVFocusable>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  imageContainer: {
    aspectRatio: 16 / 9,
    width: '100%',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: '60%',
    height: '60%',
  },
  badgeContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  bottomSection: {
    paddingHorizontal: 4,
    gap: 2,
  },
  name: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  current: {
    fontSize: 11,
  }
});