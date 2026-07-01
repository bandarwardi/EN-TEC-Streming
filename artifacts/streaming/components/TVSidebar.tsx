import { Lineicons } from '@lineiconshq/react-native-lineicons';
import { Home2Bulk, CloudBolt1Bulk, CameraMovie1Bulk, MonitorBulk, StopwatchBulk, Gear1Bulk } from '@lineiconshq/free-icons';
import React from 'react';
import { View, StyleSheet, Platform, useWindowDimensions, ScrollView } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { TVFocusable } from './TVFocusable';

const TABS = [
  { name: 'index', path: '/', icon: Home2Bulk, label: 'Home', iosIcon: 'house' },
  { name: 'live', path: '/live', icon: CloudBolt1Bulk, label: 'Live TV', iosIcon: 'tv' },
  { name: 'movies', path: '/movies', icon: CameraMovie1Bulk, label: 'Movies', iosIcon: 'film' },
  { name: 'series', path: '/series', icon: MonitorBulk, label: 'Series', iosIcon: 'play.tv' },
  { name: 'catchup', path: '/catchup', icon: StopwatchBulk, label: 'Catch Up', iosIcon: 'clock.arrow.circlepath' },
  { name: 'settings', path: '/settings', icon: Gear1Bulk, label: 'Settings', iosIcon: 'gearshape' }
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
                const tint = (focused || isReallyActive) ? colors.gold : colors.mutedForeground;
                return isIOS ? (
                  <SymbolView name={tab.iosIcon as any} tintColor={tint} size={24} />
                ) : (
                  <Lineicons icon={tab.icon as any} size={24} color={tint} />
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
