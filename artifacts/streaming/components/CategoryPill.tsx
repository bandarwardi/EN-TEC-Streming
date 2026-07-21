import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TVFocusable } from '@/components/TVFocusable';
import { useColors } from '@/hooks/useColors';
import { MarqueeText } from '@/components/MarqueeText';

interface CategoryPillProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
}

export function CategoryPill({ label, isActive, onPress }: CategoryPillProps) {
  const colors = useColors();

  return (
    <TVFocusable onPress={onPress} style={{ marginRight: 8 }} disableBorder={true}>
      {({ focused }: any) => (
        <View 
          style={[
            styles.container, 
            { 
              backgroundColor: isActive ? colors.gold : colors.surface,
              borderColor: focused ? colors.gold : (isActive ? colors.gold : colors.border),
              marginRight: 0,
            }
          ]}
        >
          <MarqueeText 
            text={label}
            isFocused={focused || isActive}
            style={[
              styles.label, 
              { color: (isActive || focused) ? (isActive ? colors.primaryForeground : colors.gold) : colors.mutedForeground }
            ]}
          />
        </View>
      )}
    </TVFocusable>
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