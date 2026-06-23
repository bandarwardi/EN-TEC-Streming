import React from 'react';
import { Pressable, Text, StyleSheet, Animated } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface CategoryPillProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
}

export function CategoryPill({ label, isActive, onPress }: CategoryPillProps) {
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
            backgroundColor: isActive ? colors.gold : colors.surface,
            borderColor: isFocused ? colors.gold : (isActive ? colors.gold : colors.border),
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <Text style={[
          styles.label, 
          { color: (isActive || isFocused) ? (isActive ? colors.primaryForeground : colors.gold) : colors.mutedForeground }
        ]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  }
});