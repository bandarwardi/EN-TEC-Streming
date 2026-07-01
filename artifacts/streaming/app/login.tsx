import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { LinearGradient } from 'expo-linear-gradient';
import { Lineicons } from '@lineiconshq/react-native-lineicons';
import { Link2AngularRightBulk, FileMultipleBulk } from '@lineiconshq/free-icons';
import { GoldButton } from '@/components/GoldButton';
import { useAppStore } from '@/store/app-store';
import { router } from 'expo-router';

export default function LoginScreen() {
  const colors = useColors();
  const [m3uUrl, setM3uUrl] = useState('');
  const [m3uName, setM3uName] = useState('');
  
  const login = useAppStore(s => s.login);
  const addPlaylist = useAppStore(s => s.addPlaylist);
  const loadPlaylistFromUrl = useAppStore(s => s.loadPlaylistFromUrl);

  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');

  const handleLoadPlaylist = async () => {
    const url = m3uUrl.trim();
    if (!url) {
      Alert.alert('Error', 'Please enter a valid M3U URL');
      return;
    }
    const name = m3uName.trim() || 'My Playlist';
    const id = `pl_${Date.now()}`;

    setLoading(true);
    setLoadingMsg('Connecting to server...');
    try {
      const { channels } = await loadPlaylistFromUrl(id, url, (msg) => setLoadingMsg(msg));
      await addPlaylist({
        id,
        name,
        url,
        channels,
        updated: 'Just now',
        lastUpdatedTimestamp: Date.now(),
        isDemo: false,
      });
      login('Guest User', 'guest@entec.com');
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Failed to load playlist', err.message ?? 'Unknown error');
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  };

  return (
    <ScrollView 
      contentContainerStyle={[styles.container, { backgroundColor: colors.background }]} 
      keyboardShouldPersistTaps="handled"
    >
      <LinearGradient
        colors={['rgba(212,168,67,0.15)', 'transparent']}
        style={[StyleSheet.absoluteFill, { top: -200, left: -200, right: 200, bottom: 200 }]}
      />
      <LinearGradient
        colors={['rgba(91,127,255,0.1)', 'transparent']}
        style={[StyleSheet.absoluteFill, { top: 200, left: 200, right: -200, bottom: -200 }]}
      />
      
      <View style={styles.logoContainer}>
        <Text style={[styles.logoText, { color: colors.gold }]}>EN TEC</Text>
        <Text style={styles.logoSubtext}>STREAMING</Text>
      </View>
      
      <View style={[styles.card, { backgroundColor: 'rgba(26,26,26,0.8)', borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Welcome to EN TEC</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Please add your IPTV playlist to continue.</Text>
        
        <View style={styles.form}>
            <View style={[styles.inputContainer, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
              <Lineicons icon={Link2AngularRightBulk} size={20} color={colors.mutedForeground} />
              <TextInput 
                style={[styles.input, { color: colors.text }]}
                placeholder="M3U URL"
                placeholderTextColor={colors.mutedForeground}
                value={m3uUrl}
                onChangeText={setM3uUrl}
                editable={!loading}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>
            <View style={[styles.inputContainer, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
              <Lineicons icon={FileMultipleBulk} size={20} color={colors.mutedForeground} />
              <TextInput 
                style={[styles.input, { color: colors.text }]}
                placeholder="Playlist Name (Optional)"
                placeholderTextColor={colors.mutedForeground}
                value={m3uName}
                onChangeText={setM3uName}
                editable={!loading}
              />
            </View>
            
            {loading && (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.gold} />
                <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>{loadingMsg}</Text>
              </View>
            )}

            <GoldButton 
              title={loading ? "Loading..." : "Load Playlist"} 
              onPress={handleLoadPlaylist} 
              style={{ marginTop: 8 }} 
              disabled={loading}
            />
          </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 40,
    fontWeight: '900',
  },
  logoSubtext: {
    color: '#FFF',
    fontSize: 12,
    letterSpacing: 4,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  tabs: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    height: 50,
    gap: 12,
  },
  input: {
    flex: 1,
    height: '100%',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  line: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 12,
    fontWeight: 'bold',
  },
  outlineButton: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outlineButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  guestLink: {
    marginTop: 32,
    alignItems: 'center',
  },
  guestText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  loadingText: {
    fontSize: 13,
  }
});