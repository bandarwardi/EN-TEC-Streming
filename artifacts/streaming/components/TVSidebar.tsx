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
import { Home2Bulk, CloudBolt1Bulk, CameraMovie1Bulk, MonitorBulk, StopwatchBulk, Search1Bulk, User4Bulk } from '@lineiconshq/free-icons';

const TABS = [
  { name: 'index', path: '/', icon: 'home-outline', bulkIcon: Home2Bulk, label: 'Home', iosIcon: 'house' },
  { name: 'live', path: '/live', icon: 'tv-outline', bulkIcon: CloudBolt1Bulk, label: 'Live', iosIcon: 'antenna.radiowaves.left.and.right' },
  { name: 'movies', path: '/movies', icon: 'film-outline', bulkIcon: CameraMovie1Bulk, label: 'Movies', iosIcon: 'film' },
  { name: 'series', path: '/series', icon: 'albums-outline', bulkIcon: MonitorBulk, label: 'Series', iosIcon: 'ticket' },
  { name: 'catchup', path: '/catchup', icon: 'time-outline', bulkIcon: StopwatchBulk, label: 'Replay', iosIcon: 'clock.arrow.circlepath' },
];

function OutlineButton({ icon, bulkIcon, iosIcon, isActive, onPress, isIOS, customContent, onFocus }: any) {
  const iconColor = isActive ? '#D4A843' : 'rgba(255,255,255,0.7)';
  
  return (
    <TVFocusable onPress={onPress} onFocus={onFocus} style={[styles.tabBtn]} disableBorder={true}>
      {({ focused }: any) => (
        <View style={StyleSheet.absoluteFill}>
          {/* Base rounded square for all icons */}
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14 }, Platform.OS === 'web' ? { backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' } as any : {}]} />

          {/* Active outline box */}
          {isActive && <View style={[StyleSheet.absoluteFillObject, { borderRadius: 14, borderWidth: 1.5, borderColor: '#D4A843', backgroundColor: 'rgba(212,168,67,0.1)' }]} />}

          {/* Focused overlay */}
          {focused && !isActive && <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14 }]} />}
          {focused && isActive && <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(212,168,67,0.2)', borderRadius: 14 }]} />}

          {/* Content */}
          <View style={[styles.iconContainer, { alignSelf: 'center', marginTop: 7 }]}>
            {customContent ? customContent : (
              isIOS ? (
                <SymbolView name={iosIcon as any} tintColor={iconColor} size={22} />
              ) : (
                <Ionicons name={icon as any} size={24} color={iconColor} />
              )
            )}
          </View>
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

  if (!isLargeScreen) return null;

  const isWeb = Platform.OS === 'web';

  const renderLogo = () => (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }}>
      <Text style={{ color: '#D4A843', fontWeight: 'bold', fontSize: 13, letterSpacing: 1 }}>EN</Text>
      <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 13, letterSpacing: 1 }}>TEC</Text>
    </View>
  );

  const glassStyle: any = isWeb
    ? {
        backgroundColor: 'transparent',
      }
    : {
        backgroundColor: 'transparent',
      };

  return (
    <View
      style={[
        styles.sidebar,
        {
          paddingTop: insets.top > 0 ? insets.top + 16 : 12,
          paddingBottom: insets.bottom > 0 ? insets.bottom + 16 : 32,
        },
        glassStyle
      ]}
    >
      <View style={styles.navGroup}>
        {/* Logo */}
        <OutlineButton 
          customContent={renderLogo()} 
          onPress={() => router.navigate('/')}
          isIOS={isIOS}
        />
        
        {/* Search */}
        <OutlineButton 
          icon="search-outline"
          bulkIcon={Search1Bulk}
          iosIcon="magnifyingglass"
          isActive={pathname === '/search'}
          onPress={() => router.navigate('/search')}
          isIOS={isIOS}
        />

        <View style={styles.divider} />

        {/* Main Tabs */}
        {TABS.map((tab) => {
          const isActive = tab.path === '/' 
            ? pathname === '/' 
            : (pathname === tab.path || pathname.startsWith(tab.path));

          return (
            <OutlineButton
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

      {/* Spacer to push account to bottom */}
      <View style={{ flex: 1 }} />

      {/* Account / Settings */}
      <View style={styles.navGroup}>
        <OutlineButton 
          icon="person-outline"
          bulkIcon={User4Bulk}
          iosIcon="person"
          isActive={pathname === '/settings'}
          onPress={() => router.navigate('/settings')}
          isIOS={isIOS}
        />
        {isWeb && (
          <OutlineButton 
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
    width: 80,
    zIndex: 100,
    alignItems: 'center',
  },
  navGroup: {
    alignItems: 'center',
    gap: 16,
  },
  logoBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(212,168,67,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(212,168,67,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D4A843',
    shadowColor: '#D4A843',
    shadowOpacity: 0.8,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  divider: {
    width: 32,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 4,
    borderRadius: 1,
  },
  tabBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconContainer: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
