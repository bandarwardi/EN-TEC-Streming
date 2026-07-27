import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const QUALITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  '4K': { bg: 'rgba(244,197,66,0.18)', text: '#F4C542', border: 'rgba(244,197,66,0.45)' },
  'FHD': { bg: 'rgba(96,180,255,0.15)', text: '#60B4FF', border: 'rgba(96,180,255,0.35)' },
  'HD': { bg: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.6)', border: 'rgba(255,255,255,0.15)' },
};

export function QualityBadge({ quality }: { quality: '4K' | 'FHD' | 'HD' }) {
  const c = QUALITY_COLORS[quality] ?? QUALITY_COLORS['HD'];

  return (
    <View style={[styles.container, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={[styles.text, { color: c.text }]}>{quality}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
