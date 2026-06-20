import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAppStore } from '@/store/app-store';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, playlists, settings, logout } = useAppStore();

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 80 }}>
        
        <View style={styles.accountSection}>
          <LinearGradient
            colors={['#D4A843', '#A67C2E']}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'U'}</Text>
          </LinearGradient>
          <View style={styles.accountInfo}>
            <Text style={[styles.name, { color: colors.text }]}>{user?.name || 'Guest User'}</Text>
            <Text style={[styles.email, { color: colors.mutedForeground }]}>{user?.email}</Text>
          </View>
          <LinearGradient
            colors={['#D4A843', '#A67C2E']}
            style={styles.planBadge}
          >
            <Feather name="star" size={12} color="#1A1A1A" />
            <Text style={styles.planText}>Premium 4K</Text>
          </LinearGradient>
        </View>
        
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Player</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.row}>
            <Text style={[styles.rowText, { color: colors.text }]}>Default Quality</Text>
            <Text style={[styles.rowValue, { color: colors.mutedForeground }]}>{settings.quality}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={[styles.rowText, { color: colors.text }]}>Force HTTP</Text>
            <Feather name={settings.forceHttp ? 'toggle-right' : 'toggle-left'} size={24} color={settings.forceHttp ? colors.gold : colors.mutedForeground} />
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>App</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable style={styles.row} onPress={() => router.push('/playlists')}>
            <Text style={[styles.rowText, { color: colors.text }]}>Playlists</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[styles.rowValue, { color: colors.mutedForeground }]}>{playlists.length}</Text>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </View>
          </Pressable>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={[styles.rowText, { color: colors.text }]}>Notifications</Text>
            <Feather name={settings.notifications ? 'toggle-right' : 'toggle-left'} size={24} color={settings.notifications ? colors.gold : colors.mutedForeground} />
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>About</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.row}>
            <Text style={[styles.rowText, { color: colors.text }]}>App Version</Text>
            <Text style={[styles.rowValue, { color: colors.mutedForeground }]}>1.0.0</Text>
          </View>
        </View>

        <Pressable 
          style={[styles.signOutButton, { borderColor: colors.destructive }]}
          onPress={handleLogout}
        >
          <Text style={[styles.signOutText, { color: colors.destructive }]}>Sign Out</Text>
        </Pressable>
        
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  accountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    gap: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  accountInfo: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  email: {
    fontSize: 14,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  planText: {
    color: '#1A1A1A',
    fontWeight: 'bold',
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  rowText: {
    fontSize: 16,
  },
  rowValue: {
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#2E2E2E',
    marginLeft: 16,
  },
  signOutButton: {
    marginTop: 32,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: 'bold',
  }
});