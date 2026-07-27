import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  View,
  StyleSheet,
  Platform,
  useWindowDimensions,
  Text,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { TVFocusable } from '@/components/TVFocusable';
import { Lineicons } from '@lineiconshq/react-native-lineicons';
import {
  Home2Bulk,
  CloudBolt1Bulk,
  CameraMovie1Bulk,
  MonitorBulk,
  StopwatchBulk,
  Search1Bulk,
  User4Bulk,
} from '@lineiconshq/free-icons';

const TABS = [
  { name: 'index', path: '/', icon: 'home-outline', bulkIcon: Home2Bulk, label: 'Home', iosIcon: 'house' },
  { name: 'live', path: '/live', icon: 'tv-outline', bulkIcon: CloudBolt1Bulk, label: 'Live', iosIcon: 'antenna.radiowaves.left.and.right' },
  { name: 'movies', path: '/movies', icon: 'film-outline', bulkIcon: CameraMovie1Bulk, label: 'Movies', iosIcon: 'film' },
  { name: 'series', path: '/series', icon: 'albums-outline', bulkIcon: MonitorBulk, label: 'Series', iosIcon: 'ticket' },
  { name: 'catchup', path: '/catchup', icon: 'time-outline', bulkIcon: StopwatchBulk, label: 'Replay', iosIcon: 'clock.arrow.circlepath' },
];

const GOLD = '#F4C542';

function SidebarItem({ icon, bulkIcon, iosIcon, isActive, onPress, isIOS, customContent, onFocus }: any) {
  return (
    <TVFocusable onPress={onPress} onFocus={onFocus} style={[styles.tabBtn]} disableBorder={true}>
      {({ focused }: any) => (
        <View style={StyleSheet.absoluteFill}>
          <View style={[
            StyleSheet.absoluteFillObject,
            styles.itemBase,
            isActive && styles.itemActive,
            focused && !isActive && styles.itemFocused,
            focused && isActive && styles.itemFocusedActive,
          ]} />
          <View style={styles.iconContainer}>
            {customContent ? customContent : (
              isIOS ? (
                <SymbolView
                  name={iosIcon}
                  tintColor={isActive ? GOLD : focused ? GOLD : 'rgba(255,255,255,0.55)'}
                  size={22}
                />
              ) : (
                <Lineicons
                  icon={bulkIcon}
                  size={22}
                  color={isActive ? GOLD : focused ? GOLD : 'rgba(255,255,255,0.55)'}
                />
              )
            )}
          </View>
          {isActive && (
            <View style={styles.activeIndicator} />
          )}
        </View>
      )}
    </TVFocusable>
  );
}

export function TVSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === 'ios';
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 1024 || Platform.isTV;
  const isWeb = Platform.OS === 'web';

  if (!isLargeScreen) return null;

  const renderLogo = () => (
    <View style={styles.logoContainer}>
      <Text style={styles.logoEN}>EN</Text>
      <View style={styles.logoDivider} />
      <Text style={styles.logoTEC}>TEC</Text>
    </View>
  );

  const sidebarBg: any = isWeb
    ? {
        backgroundColor: 'rgba(14,16,21,0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRightWidth: 1,
        borderRightColor: 'rgba(255,255,255,0.04)',
      }
    : {
        backgroundColor: 'rgba(14,16,21,0.95)',
        borderRightWidth: 1,
        borderRightColor: colors.border,
      };

  return (
    <View
      style={[
        styles.sidebar,
        {
          paddingTop: insets.top > 0 ? insets.top + 12 : 16,
          paddingBottom: insets.bottom > 0 ? insets.bottom + 12 : 24,
        },
        sidebarBg,
      ]}
    >
      <View style={styles.navGroup}>
        <SidebarItem
          customContent={renderLogo()}
          onPress={() => router.navigate('/')}
          isIOS={isIOS}
        />

        <SidebarItem
          icon="search-outline"
          bulkIcon={Search1Bulk}
          iosIcon="magnifyingglass"
          isActive={pathname === '/search'}
          onPress={() => router.navigate({ pathname: '/search', params: { tab: 'all' } })}
          isIOS={isIOS}
        />

        <View style={styles.divider} />

        {TABS.map((tab) => {
          const isActive =
            tab.path === '/'
              ? pathname === '/'
              : pathname === tab.path || pathname.startsWith(tab.path);

          return (
            <SidebarItem
              key={tab.name}
              icon={tab.icon}
              bulkIcon={tab.bulkIcon}
              iosIcon={tab.iosIcon}
              isActive={isActive}
              onPress={() => router.navigate(tab.path as any)}
              isIOS={isIOS}
            />
          );
        })}
      </View>

      <View style={{ flex: 1 }} />

      <View style={styles.navGroup}>
        <SidebarItem
          icon="person-outline"
          bulkIcon={User4Bulk}
          iosIcon="person"
          isActive={pathname === '/settings'}
          onPress={() => router.navigate('/settings')}
          isIOS={isIOS}
        />
        {isWeb && (
          <SidebarItem
            icon="power-outline"
            iosIcon="power"
            isActive={false}
            onPress={() => {
              fetch('/exit_app').catch(() => {});
            }}
            isIOS={isIOS}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 76,
    zIndex: 100,
    alignItems: 'center',
  },
  navGroup: {
    alignItems: 'center',
    gap: 6,
  },
  divider: {
    width: 30,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 6,
    borderRadius: 1,
  },
  tabBtn: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  itemBase: {
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  itemActive: {
    backgroundColor: 'rgba(244,197,66,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(244,197,66,0.25)',
  },
  itemFocused: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  itemFocusedActive: {
    backgroundColor: 'rgba(244,197,66,0.18)',
  },
  iconContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: '25%',
    bottom: '25%',
    width: 3,
    borderRadius: 2,
    backgroundColor: '#F4C542',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  logoEN: {
    color: '#F4C542',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 1.5,
  },
  logoDivider: {
    width: 18,
    height: 1,
    backgroundColor: 'rgba(244,197,66,0.3)',
    borderRadius: 1,
  },
  logoTEC: {
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 1,
  },
});
