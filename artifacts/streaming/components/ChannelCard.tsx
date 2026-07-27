import React from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Image } from 'expo-image';
import { Channel } from '@/types';
import { LiveBadge } from './LiveBadge';
import { useColors } from '@/hooks/useColors';

interface ChannelCardProps {
  channel: Channel;
  onPress: () => void;
  width?: number;
  autoFocus?: boolean;
}

export const ChannelCard = React.memo(function ChannelCard({
  channel,
  onPress,
  width = 160,
}: ChannelCardProps) {
  const colors = useColors();
  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.name || 'CH')}&background=1A1F2B&color=F4C542&bold=true&size=300&format=svg`;
  const [imgSource, setImgSource] = React.useState(channel.logo || fallbackUrl);
  const scale = React.useRef(new Animated.Value(1)).current;
  const glow = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    setImgSource(channel.logo || fallbackUrl);
  }, [channel.logo]);

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 30 }),
      Animated.timing(glow, { toValue: 1, duration: 150, useNativeDriver: false }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }),
      Animated.timing(glow, { toValue: 0, duration: 200, useNativeDriver: false }),
    ]).start();
  };

  const borderColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.gold],
  });

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[styles.container, { width, transform: [{ scale }] }]}>
        <Animated.View
          style={[
            styles.imageContainer,
            {
              backgroundColor: colors.surface,
              borderColor,
              borderWidth: 1.5,
            },
          ]}
        >
          <Image
            source={{ uri: imgSource }}
            style={styles.logo}
            contentFit="contain"
            onError={() => {
              if (imgSource !== fallbackUrl) setImgSource(fallbackUrl);
            }}
          />
          {channel.isLive && (
            <View style={styles.badgeContainer}>
              <LiveBadge />
            </View>
          )}
        </Animated.View>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {channel.name}
        </Text>
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  imageContainer: {
    aspectRatio: 16 / 9,
    width: '100%',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: '55%',
    height: '55%',
  },
  badgeContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 2,
  },
});
