import React from 'react';
import { Text, StyleSheet, Pressable, Animated, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GoldButtonProps {
  title: string;
  icon?: React.ReactNode;
  onPress?: () => void;
  variant?: 'primary' | 'outline';
  style?: any;
}

export function GoldButton({ title, icon, onPress, variant = 'primary', style }: GoldButtonProps) {
  const scale = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 30 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20 }).start();
  };

  if (variant === 'outline') {
    return (
      <Animated.View style={[{ transform: [{ scale }] }, style]}>
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.outlineButton}
        >
          {icon && <View style={styles.iconWrap}>{icon}</View>}
          <Text style={styles.outlineTitle}>{title}</Text>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <LinearGradient
          colors={['#F8D054', '#F4C542', '#D4A030']}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {icon && <View style={styles.iconWrap}>{icon}</View>}
          <Text style={styles.primaryTitle}>{title}</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  gradient: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryTitle: {
    color: '#1A1200',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  outlineButton: {
    paddingVertical: 13,
    paddingHorizontal: 28,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(244,197,66,0.5)',
    backgroundColor: 'rgba(244,197,66,0.08)',
  },
  outlineTitle: {
    color: '#F4C542',
    fontWeight: '600',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
