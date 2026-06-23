import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  interpolateColor 
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';

interface SkeletonCardProps {
  width?: number;
  height?: number;
  borderRadius?: number;
}

export function SkeletonCard({ width = 128, height = 128, borderRadius = 16 }: SkeletonCardProps) {
  const colors = useColors();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1000 }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      progress.value,
      [0, 1],
      [colors.surface, colors.surface2]
    );
    return { backgroundColor };
  });

  return (
    <Animated.View 
      style={[
        styles.skeleton, 
        animatedStyle,
        { width, height, borderRadius, borderColor: colors.border }
      ]} 
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {
    borderWidth: 1,
  }
});