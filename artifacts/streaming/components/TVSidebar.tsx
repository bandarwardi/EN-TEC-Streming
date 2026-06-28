import React from 'react';
import { View, StyleSheet, Platform, useWindowDimensions, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { TVFocusable } from './TVFocusable';

const TABS = [
  { name: 'search', icon: 'search', iosIcon: 'magnifyingglass', path: '/search' },
  { name: 'home', icon: 'home', iosIcon: 'house', path: '/' },
  { name: 'live', icon: 'tv', iosIcon: 'tv', path: '/live' },
  { name: 'movies', icon: 'film', iosIcon: 'film', path: '/movies' },
  { name: 'series', icon: 'play-circle', iosIcon: 'play.tv', path: '/series' },
  { name: 'catchup', icon: 'clock', iosIcon: 'clock', path: '/catchup' },
  { name: 'settings', icon: 'settings', iosIcon: 'gearshape', path: '/settings' },
];

export function TVSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === 'ios';
  
  // The sidebar is only active on large screens or TV
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024 || Platform.isTV;

  if (!isLargeScreen) return null;

  return (
    <View style={[
      styles.sidebar, 
      { 
        backgroundColor: 'rgba(10,10,10,0.95)', 
        paddingTop: insets.top > 0 ? insets.top : 24, 
        paddingBottom: insets.bottom > 0 ? insets.bottom : 24 
      }
    ]}>
      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingVertical: 16 }} showsVerticalScrollIndicator={false}>
        {TABS.map((tab) => {
          const isActive = pathname === tab.path || (pathname.startsWith(tab.path) && tab.path !== '/');
          // Handle root matching correctly since all paths start with /
          const isReallyActive = tab.path === '/' ? pathname === '/' : isActive;

          return (
            <TVFocusable
              key={tab.name}
              onPress={() => router.push(tab.path as any)}
              style={({ focused }: any) => [
                styles.iconBtn,
                { marginBottom: 16 },
                isReallyActive && { backgroundColor: 'rgba(212,168,67,0.15)' }
              ]}
              focusable={true}
              scaleAmount={1.15}
            >
              {({ focused }: any) => {
                const tint = focused ? '#0A0A0A' : (isReallyActive ? colors.gold : colors.mutedForeground);
                return isIOS ? (
                  <SymbolView name={tab.iosIcon as any} tintColor={tint} size={24} />
                ) : (
                  <Feather 
                    name={tab.icon as any} 
                    size={24} 
                    color={tint} 
                  />
                );
              }}
            </TVFocusable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 80,
    height: '100%',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.05)',
    zIndex: 100,
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  }
});
