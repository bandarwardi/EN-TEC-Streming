import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import { MinusBulk } from '@lineiconshq/free-icons';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

export function DesktopTitleBar() {
  const colors = useColors();
  const [hovered, setHovered] = useState<string | null>(null);

  if (Platform.OS !== 'web') return null;

  const handleAction = async (action: string) => {
    try {
      const endpoint = action === 'close' ? 'exit' : action;
      await fetch(`/${endpoint}_app`);
    } catch (e) {}
  };

  return (
    <View style={styles.container}>
      {/* @ts-ignore */}
      <View style={[StyleSheet.absoluteFill, { WebkitAppRegion: 'drag' }]} />
      <View style={styles.left}>
        <Text style={[styles.title, { color: '#FFF' }]}>
          EN<Text style={{ color: colors.gold }}>TEC</Text>
        </Text>
      </View>
      <View style={[styles.right, { WebkitAppRegion: 'no-drag' } as any]}>
        <Pressable 
          style={({hovered}: any) => [styles.btn, hovered && styles.hoverBtn]}
          onPress={() => handleAction('minimize')}
        >
          <Ionicons name="remove" size={18} color="#FFF" />
        </Pressable>
        <Pressable 
          style={({hovered}: any) => [styles.btn, hovered && styles.hoverBtn]}
          onPress={() => handleAction('maximize')}
        >
          <Ionicons name="square-outline" size={14} color="#FFF" />
        </Pressable>
        <Pressable 
          style={({hovered}: any) => [styles.btn, hovered && styles.closeHoverBtn]}
          onPress={() => handleAction('close')}
        >
          <Ionicons name="close" size={18} color="#FFF" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 32,
    backgroundColor: '#000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 9999,
  },
  left: {
    paddingLeft: 12,
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  title: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  right: {
    flexDirection: 'row',
    height: '100%',
  },
  btn: {
    width: 46,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hoverBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  closeHoverBtn: {
    backgroundColor: '#E53935',
  }
});
