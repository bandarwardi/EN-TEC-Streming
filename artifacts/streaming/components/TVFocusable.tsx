import React, { useState, useRef, useCallback } from 'react';
import { Pressable, Animated, ViewStyle, PressableProps, Platform } from 'react-native';
import { useColors } from '@/hooks/useColors';

export interface TVFocusableProps extends Omit<PressableProps, 'style' | 'children'> {
  children: React.ReactNode | ((props: { focused: boolean }) => React.ReactNode);
  style?: ViewStyle | ((props: { focused: boolean }) => ViewStyle) | any[];
  scaleAmount?: number;
  borderThickness?: number;
  focusedBorderColor?: string;
  disableBorder?: boolean;
}

export function TVFocusable({ 
  children, 
  style, 
  scaleAmount = 1.05,
  borderThickness = 4,
  focusedBorderColor,
  disableBorder = false,
  onFocus,
  onBlur,
  onPressIn,
  onPressOut,
  ...props 
}: TVFocusableProps) {
  const colors = useColors();
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const isTV = Platform.isTV;

  const handleFocus = useCallback((e: any) => {
    setIsFocused(true);
    Animated.spring(scaleAnim, { toValue: scaleAmount, useNativeDriver: true }).start();
    if (onFocus) onFocus(e);
  }, [scaleAnim, scaleAmount, onFocus]);

  const handleBlur = useCallback((e: any) => {
    setIsFocused(false);
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
    if (onBlur) onBlur(e);
  }, [scaleAnim, onBlur]);

  const handlePressIn = useCallback((e: any) => {
    Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start();
    if (onPressIn) onPressIn(e);
  }, [scaleAnim, onPressIn]);

  const handlePressOut = useCallback((e: any) => {
    Animated.spring(scaleAnim, { toValue: isFocused ? scaleAmount : 1, useNativeDriver: true }).start();
    if (onPressOut) onPressOut(e);
  }, [scaleAnim, isFocused, scaleAmount, onPressOut]);

  // Merge styles
  const resolvedStyle = typeof style === 'function' ? style({ focused: isFocused }) : style;
  
  const animatedStyle = {
    transform: [{ scale: scaleAnim }],
    ...( !disableBorder && isTV ? {
      borderWidth: borderThickness,
      borderColor: isFocused ? (focusedBorderColor || colors.gold) : 'transparent',
    } : {})
  };

  return (
    <Pressable
      {...props}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[resolvedStyle, animatedStyle]}>
        {typeof children === 'function' ? children({ focused: isFocused }) : children}
      </Animated.View>
    </Pressable>
  );
}
