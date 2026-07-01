import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, View, StyleSheet, TextProps } from 'react-native';

interface MarqueeTextProps extends TextProps {
  text: string;
  isFocused: boolean;
  speed?: number; // pixels per second
}

export function MarqueeText({ text, isFocused, style, speed = 40, ...props }: MarqueeTextProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [textWidth, setTextWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (isFocused && textWidth > containerWidth && containerWidth > 0) {
      const distance = textWidth - containerWidth + 20; // +20 for a little extra padding at the end
      const duration = (distance / speed) * 1000; 

      Animated.loop(
        Animated.sequence([
          Animated.delay(1000), // Pause before scrolling
          Animated.timing(animatedValue, {
            toValue: -distance,
            duration: duration,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.delay(1000), // Pause at the end
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: duration / 2, // Rewind faster
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          })
        ])
      ).start();
    } else {
      animatedValue.stopAnimation();
      animatedValue.setValue(0);
    }
    
    return () => {
      animatedValue.stopAnimation();
    };
  }, [isFocused, textWidth, containerWidth, animatedValue, speed]);

  return (
    <View 
      style={{ overflow: 'hidden', flex: 1, justifyContent: 'center' }} 
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <Animated.View style={{ flexDirection: 'row', transform: [{ translateX: animatedValue }] }}>
        <Text 
          {...props}
          numberOfLines={1}
          onLayout={(e) => setTextWidth(e.nativeEvent.layout.width)}
          style={[style, { flexShrink: 0 }]}
        >
          {text}
        </Text>
      </Animated.View>
    </View>
  );
}
