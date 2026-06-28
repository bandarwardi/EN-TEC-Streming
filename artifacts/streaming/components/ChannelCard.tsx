import React from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
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
      <Animated.View 
        style={[
          styles.container, 
          { 
            width, 
            transform: [{ scale: scaleAnim }] 
          }
        ]}
      >
        <View style={[
          styles.imageContainer,
          {
            borderColor: isFocused ? colors.gold : colors.border,
            borderWidth: isFocused ? 4 : 1,
            backgroundColor: isFocused ? 'rgba(255,255,255,0.05)' : colors.surface
          }
        ]}>
          <Image source={{ uri: channel.logo }} style={styles.logo} contentFit="contain" />
          <View style={styles.badgeContainer}>
            {channel.isLive ? <LiveBadge /> : <QualityBadge quality={channel.quality} />}
          </View>
        </View>
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