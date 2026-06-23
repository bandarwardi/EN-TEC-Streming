import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';

export function QualityBadge({ quality }: { quality: '4K' | 'FHD' | 'HD' }) {
  const colors = useColors();
  
  return (
    <View style={[styles.container, { backgroundColor: 'rgba(0,0,0,0.6)', borderColor: colors.gold }]}>
      <Text style={[styles.text, { color: colors.gold }]}>{quality}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  text: {
    fontSize: 10,
    fontWeight: 'bold',
  }
});