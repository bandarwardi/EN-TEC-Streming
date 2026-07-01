import React from 'react';
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { Lineicons } from '@lineiconshq/react-native-lineicons';
import { Search1Bulk, User4Bulk } from '@lineiconshq/free-icons';
import { router } from 'expo-router';
import { TVFocusable } from './TVFocusable';

export function GlobalHeader() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  
  return (
    <View style={[styles.headerContainer, { 
      paddingTop: Platform.OS === 'ios' ? insets.top : insets.top + 10,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border
    }]}>
      <View style={styles.left}>
        <Text style={[styles.logoText, { color: colors.gold }]}>
          EN<Text style={{ color: colors.text }}>-TEC</Text>
        </Text>
      </View>
      
      <View style={[styles.right, { gap: 12 }]}>
        <TVFocusable 
          onPress={() => router.push('/search')}
          style={({ focused }: any) => [
            styles.iconBtn,
            focused && { backgroundColor: colors.gold, transform: [{ scale: 1.1 }] }
          ]}
        >
          {({ focused }: any) => (
            <Lineicons icon={Search1Bulk} size={22} color={focused ? "#000" : colors.text} />
          )}
        </TVFocusable>
        <TVFocusable 
          onPress={() => router.push('/settings')}
          style={({ focused }: any) => [
            styles.iconBtn,
            focused && { backgroundColor: colors.gold, transform: [{ scale: 1.1 }] }
          ]}
        >
          {({ focused }: any) => (
            <Lineicons icon={User4Bulk} size={22} color={focused ? "#000" : colors.text} />
          )}
        </TVFocusable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
    zIndex: 100,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  }
});
