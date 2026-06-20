import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { GoldButton } from '@/components/GoldButton';
import { useAppStore } from '@/store/app-store';
import { router } from 'expo-router';

export default function LoginScreen() {
  const colors = useColors();
  const [tab, setTab] = useState<'signin' | 'm3u'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [m3uUrl, setM3uUrl] = useState('');
  const [m3uName, setM3uName] = useState('');
  
  const login = useAppStore(s => s.login);
  const addPlaylist = useAppStore(s => s.addPlaylist);
  const loadPlaylistFromUrl = useAppStore(s => s.loadPlaylistFromUrl);

  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  
  const handleGuest = () => {
    login('Guest User', 'guest@entec.com');
    router.replace('/(tabs)');
  };

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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
        <Text style={[styles.title, { color: colors.text }]}>Welcome back</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Sign in to start streaming in 4K.</Text>
        
        <View style={[styles.tabs, { backgroundColor: colors.surface2 }]}>
          <Pressable 
            style={[styles.tab, tab === 'signin' && { backgroundColor: colors.gold }]}
            onPress={() => setTab('signin')}
          >
            <Text style={[styles.tabText, { color: tab === 'signin' ? colors.primaryForeground : colors.mutedForeground }]}>Sign In</Text>
          </Pressable>
          <Pressable 
            style={[styles.tab, tab === 'm3u' && { backgroundColor: colors.gold }]}
            onPress={() => setTab('m3u')}
          >
            <Text style={[styles.tabText, { color: tab === 'm3u' ? colors.primaryForeground : colors.mutedForeground }]}>M3U Playlist</Text>
          </Pressable>
        </View>
        
        {tab === 'signin' ? (
          <View style={styles.form}>
            <View style={[styles.inputContainer, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
              <Feather name="mail" size={20} color={colors.mutedForeground} />
              <TextInput 
                style={[styles.input, { color: colors.text }]}
                placeholder="Email"
                placeholderTextColor={colors.mutedForeground}
                value={email}
                onChangeText={setEmail}
              />
            </View>
            <View style={[styles.inputContainer, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
              <Feather name="lock" size={20} color={colors.mutedForeground} />
              <TextInput 
                style={[styles.input, { color: colors.text }]}
                placeholder="Password"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>
            <GoldButton title="Sign In" onPress={handleGuest} style={{ marginTop: 8 }} />
            
            <View style={styles.divider}>
              <View style={[styles.line, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>OR</Text>
              <View style={[styles.line, { backgroundColor: colors.border }]} />
            </View>
            
            <Pressable style={[styles.outlineButton, { borderColor: colors.border }]}>
              <Text style={[styles.outlineButtonText, { color: colors.text }]}>Continue with Google</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.form}>
            <View style={[styles.inputContainer, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
              <Feather name="link" size={20} color={colors.mutedForeground} />
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
              <Feather name="file-text" size={20} color={colors.mutedForeground} />
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
        )}
      </View>
      
      <Pressable onPress={handleGuest} style={styles.guestLink}>
        <Text style={[styles.guestText, { color: colors.mutedForeground }]}>Continue as Guest →</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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