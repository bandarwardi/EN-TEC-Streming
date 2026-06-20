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

export const ChannelCard = React.memo(function ChannelCard({ channel, onPress, width = 128 }: ChannelCardProps) {
  const colors = useColors();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start()}
    >
      <Animated.View 
        style={[
          styles.container, 
          { width, backgroundColor: colors.surface, borderColor: colors.border, transform: [{ scale: scaleAnim }] }
        ]}
      >
        <View style={styles.topRow}>
          <Image source={{ uri: channel.logo }} style={styles.logo} contentFit="contain" />
          {channel.isLive ? <LiveBadge /> : <QualityBadge quality={channel.quality} />}
        </View>
        <View style={styles.bottomSection}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {channel.name}
          </Text>
          <Text style={[styles.current, { color: colors.mutedForeground }]} numberOfLines={1}>
            ▶ {channel.current}
          </Text>
          {channel.next ? (
            <Text style={[styles.next, { color: colors.mutedForeground }]} numberOfLines={1}>
              {channel.next}
            </Text>
          ) : null}
        </View>
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#0A0A0A',
  },
  bottomSection: {
    gap: 2,
  },
  name: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  current: {
    fontSize: 11,
  },
  next: {
    fontSize: 11,
    opacity: 0.7,
  }
});