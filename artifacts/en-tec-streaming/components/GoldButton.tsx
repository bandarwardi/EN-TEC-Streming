import React from 'react';
import { Pressable, Text, StyleSheet, PressableProps, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GoldButtonProps extends PressableProps {
  title: string;
  icon?: React.ReactNode;
  style?: any;
}

export function GoldButton({ title, icon, style, ...props }: GoldButtonProps) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <Pressable 
      onPressIn={handlePressIn} 
      onPressOut={handlePressOut}
      {...props}
    >
      <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
        <LinearGradient
          colors={['#D4A843', '#A67C2E']}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {icon}
          <Text style={styles.title}>{title}</Text>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gradient: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: {
    color: '#1A1A1A',
    fontWeight: 'bold',
    fontSize: 16,
  }
});