import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAppStore } from '@/store/app-store';
import { GoldButton } from '@/components/GoldButton';
import { LinearGradient } from 'expo-linear-gradient';
import { base64Encode } from '@/lib/base64';

type AddTab = 'm3u' | 'xtream';

export default function PlaylistsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { playlists, activePlaylistId, setActivePlaylist, deletePlaylist, addPlaylist, loadPlaylistFromUrl, refreshPlaylist } =
    useAppStore();

  const [showAdd, setShowAdd] = useState(false);
  const [addTab, setAddTab] = useState<AddTab>('m3u');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const [m3uUrl, setM3uUrl] = useState('');
  const [m3uName, setM3uName] = useState('');
  const [xtreamHost, setXtreamHost] = useState('');
  const [xtreamUser, setXtreamUser] = useState('');
  const [xtreamPass, setXtreamPass] = useState('');
  const [xtreamName, setXtreamName] = useState('');

  const resetForm = () => {
    setM3uUrl('');
    setM3uName('');
    setXtreamHost('');
    setXtreamUser('');
    setXtreamPass('');
    setXtreamName('');
    setLoadingMsg('');
  };

  const handleAddM3U = async () => {
    const url = m3uUrl.trim();
    if (!url) {
      Alert.alert('Error', 'Please enter a valid M3U URL');
      return;
    }
    const name = m3uName.trim() || 'My Playlist';
    const id = `pl_${Date.now()}`;

    setLoading(true);
    try {
      const { channels } = await loadPlaylistFromUrl(id, url, setLoadingMsg);
      await addPlaylist(
        {
          id,
          name,
          url,
          channels,
          updated: 'Just now',
          lastUpdatedTimestamp: Date.now(),
          isDemo: false,
        }
      );
      setShowAdd(false);
      resetForm();
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Failed to load playlist', err.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddXtream = async () => {
    const host = xtreamHost.trim().replace(/\/$/, '');
    const user = xtreamUser.trim();
    const pass = xtreamPass.trim();
    const name = xtreamName.trim() || 'Xtream Playlist';

    if (!host || !user || !pass) {
      Alert.alert('Error', 'Please fill in Host, Username, and Password');
      return;
    }

    const m3uUrl = `${host}/get.php?username=${user}&password=${pass}&type=m3u_plus&output=ts`;
    const id = `xt_${Date.now()}`;
    const encodedCreds = base64Encode(JSON.stringify({ host, username: user, password: pass }));
    const storedUrl = `xtream://${encodedCreds}`;

    setLoading(true);
    try {
      const { channels } = await loadPlaylistFromUrl(id, m3uUrl, setLoadingMsg);
      await addPlaylist({
        id,
        name,
        url: storedUrl,
        channels,
        updated: 'Just now',
        lastUpdatedTimestamp: Date.now(),
        isDemo: false,
      });
      setShowAdd(false);
      resetForm();
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Failed to connect', err.message ?? 'Check your Xtream credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async (id: string) => {
    setRefreshingId(id);
    try {
      await refreshPlaylist(id);
    } catch (err: any) {
      Alert.alert('Refresh failed', err.message ?? 'Could not refresh playlist');
    } finally {
      setRefreshingId(null);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete Playlist', `Remove "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deletePlaylist(id),
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        {playlists.length > 0 ? (
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color={colors.foreground} />
          </Pressable>
        ) : (
          <View style={{ width: 8 }} />
        )}
        <Text style={[styles.title, { color: colors.text }]}>Playlists</Text>
        <Pressable
          style={[styles.addBtn, { backgroundColor: colors.gold }]}
          onPress={() => setShowAdd(true)}
        >
          <Feather name="plus" size={20} color="#1A1A1A" />
        </Pressable>
      </View>

      <FlatList
        data={playlists}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 20 }]}
        renderItem={({ item }) => {
          const isActive = item.id === activePlaylistId;
          const isRefreshing = refreshingId === item.id;
          return (
            <Pressable
              style={[
                styles.card,
                {
                  backgroundColor: isActive ? 'rgba(212,168,67,0.08)' : colors.surface,
                  borderColor: isActive ? colors.gold : colors.border,
                },
              ]}
              onPress={async () => {
                await setActivePlaylist(item.id);
                router.replace('/(tabs)');
              }}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  {isActive && (
                    <View style={[styles.activeDot, { backgroundColor: colors.gold }]} />
                  )}
                  <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                </View>
                {isActive && (
                  <Feather name="check-circle" size={18} color={colors.gold} />
                )}
              </View>

              <Text
                style={[styles.url, { color: colors.mutedForeground }]}
                numberOfLines={1}
              >
                {item.url.startsWith('xtream://')
                  ? `Xtream Codes · ${item.name}`
                  : item.url.startsWith('demo://')
                  ? 'Demo playlist'
                  : item.url}
              </Text>

              <View style={styles.cardFooter}>
                <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                  {item.channels.toLocaleString()} channels · {item.updated}
                </Text>
                {!item.isDemo && (
                  <View style={styles.actions}>
                    <Pressable
                      style={styles.actionBtn}
                      onPress={() => handleRefresh(item.id)}
                      disabled={isRefreshing}
                    >
                      {isRefreshing ? (
                        <ActivityIndicator size="small" color={colors.mutedForeground} />
                      ) : (
                        <Feather name="refresh-cw" size={16} color={colors.mutedForeground} />
                      )}
                    </Pressable>
                    <Pressable
                      style={styles.actionBtn}
                      onPress={() => handleDelete(item.id, item.name)}
                    >
                      <Feather name="trash-2" size={16} color={colors.destructive} />
                    </Pressable>
                  </View>
                )}
              </View>
            </Pressable>
          );
        }}
      />

      {showAdd && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[StyleSheet.absoluteFill, styles.modalOverlay]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => !loading && setShowAdd(false)} />
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.surface, paddingBottom: insets.bottom + 24 },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add Playlist</Text>
              <Pressable onPress={() => !loading && setShowAdd(false)}>
                <Feather name="x" size={24} color={colors.foreground} />
              </Pressable>
            </View>

            <View style={[styles.tabRow, { backgroundColor: colors.surface2 }]}>
              {(['m3u', 'xtream'] as AddTab[]).map((t) => (
                <Pressable
                  key={t}
                  style={[styles.tabBtn, addTab === t && { backgroundColor: colors.gold }]}
                  onPress={() => setAddTab(t)}
                >
                  <Text
                    style={[
                      styles.tabBtnText,
                      { color: addTab === t ? '#1A1A1A' : colors.mutedForeground },
                    ]}
                  >
                    {t === 'm3u' ? 'M3U URL' : 'Xtream Codes'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {addTab === 'm3u' ? (
              <View style={styles.form}>
                <StyledInput
                  placeholder="Playlist Name (optional)"
                  value={m3uName}
                  onChangeText={setM3uName}
                  icon="tag"
                  colors={colors}
                />
                <StyledInput
                  placeholder="M3U URL  e.g. http://..."
                  value={m3uUrl}
                  onChangeText={setM3uUrl}
                  icon="link"
                  colors={colors}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>
            ) : (
              <View style={styles.form}>
                <View
                  style={[
                    styles.xtreamWarning,
                    { backgroundColor: 'rgba(212,168,67,0.08)', borderColor: colors.gold },
                  ]}
                >
                  <Feather name="alert-triangle" size={14} color={colors.gold} />
                  <Text style={[styles.xtreamWarningText, { color: colors.gold }]}>
                    Frequent queries may flag your account. Data is cached for 12h.
                  </Text>
                </View>
                <StyledInput
                  placeholder="Playlist Name"
                  value={xtreamName}
                  onChangeText={setXtreamName}
                  icon="tag"
                  colors={colors}
                />
                <StyledInput
                  placeholder="Server URL  e.g. http://server.com:8080"
                  value={xtreamHost}
                  onChangeText={setXtreamHost}
                  icon="server"
                  colors={colors}
                  autoCapitalize="none"
                  keyboardType="url"
                />
                <StyledInput
                  placeholder="Username"
                  value={xtreamUser}
                  onChangeText={setXtreamUser}
                  icon="user"
                  colors={colors}
                  autoCapitalize="none"
                />
                <StyledInput
                  placeholder="Password"
                  value={xtreamPass}
                  onChangeText={setXtreamPass}
                  icon="lock"
                  colors={colors}
                  secureTextEntry
                />
              </View>
            )}

            {loading && (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.gold} />
                <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
                  {loadingMsg || 'Loading...'}
                </Text>
              </View>
            )}

            <LinearGradient
              colors={['#D4A843', '#A67C2E']}
              style={[styles.submitBtn, loading && { opacity: 0.6 }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Pressable
                style={styles.submitBtnInner}
                onPress={addTab === 'm3u' ? handleAddM3U : handleAddXtream}
                disabled={loading}
              >
                <Text style={styles.submitBtnText}>
                  {loading ? 'Loading...' : addTab === 'm3u' ? 'Load Playlist' : 'Connect'}
                </Text>
              </Pressable>
            </LinearGradient>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

function StyledInput({
  placeholder,
  value,
  onChangeText,
  icon,
  colors,
  secureTextEntry,
  autoCapitalize,
  keyboardType,
}: any) {
  return (
    <View
      style={[
        styledInputStyles.container,
        { backgroundColor: colors.background, borderColor: colors.border },
      ]}
    >
      <Feather name={icon} size={18} color={colors.mutedForeground} style={styledInputStyles.icon} />
      <TextInput
        style={[styledInputStyles.input, { color: colors.text }]}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize ?? 'sentences'}
        keyboardType={keyboardType ?? 'default'}
        autoCorrect={false}
      />
    </View>
  );
}

const styledInputStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, fontSize: 24, fontWeight: 'bold' },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { padding: 20, gap: 14 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  activeDot: { width: 6, height: 6, borderRadius: 3 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', flex: 1 },
  url: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  meta: { fontSize: 12 },
  actions: { flexDirection: 'row', gap: 16 },
  actionBtn: { padding: 4 },
  modalOverlay: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  tabRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabBtnText: { fontSize: 14, fontWeight: '600' },
  form: { gap: 12 },
  xtreamWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  xtreamWarningText: { flex: 1, fontSize: 12, lineHeight: 18 },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  loadingText: { fontSize: 13 },
  submitBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 4,
  },
  submitBtnInner: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
