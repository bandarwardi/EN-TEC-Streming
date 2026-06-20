import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Pressable, 
  ActivityIndicator, 
  Dimensions, 
  Alert 
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useAppStore } from '@/store/app-store';
import { Channel } from '@/types';
import { base64Decode } from '@/lib/base64';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface EpgProgram {
  id: string;
  title: string;
  description: string;
  start: Date;
  end: Date;
  startTimestamp: number;
  endTimestamp: number;
  isPast: boolean;
  isCurrent: boolean;
  isFuture: boolean;
}

export default function CatchUpScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const activePlaylistId = useAppStore((s) => s.activePlaylistId);
  const playlists = useAppStore((s) => s.playlists);
  const liveChannels = useAppStore((s) => s.getActiveChannels('live'));

  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [epgList, setEpgList] = useState<EpgProgram[]>([]);
  const [loadingEpg, setLoadingEpg] = useState(false);
  
  // Last 3 days tabs config
  const [days, setDays] = useState<{ dateString: string; label: string }[]>([]);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  // Filter channels supporting catchup. 
  // Fallback: if none, make first few mock channels catchup-capable so user can try the feature.
  let catchupChannels = liveChannels.filter(c => c.hasArchive);
  if (catchupChannels.length === 0 && liveChannels.length > 0) {
    catchupChannels = liveChannels.slice(0, 10).map(c => ({
      ...c,
      hasArchive: true,
      archiveDuration: 3
    }));
  }

  useEffect(() => {
    // Generate dates for past 3 days (Today, Yesterday, 2 days ago)
    const list = [];
    const now = new Date();
    for (let i = 0; i < 3; i++) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      const labelEn = i === 0 ? 'Today' : i === 1 ? 'Yesterday' : daysOfWeek[d.getDay()];

      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');

      list.push({
        dateString: `${y}-${m}-${day}`,
        label: `${labelEn} (${day}/${m})`
      });
    }
    setDays(list);
  }, []);

  useEffect(() => {
    if (!selectedChannel) return;
    
    let active = true;
    async function loadEpg() {
      setLoadingEpg(true);
      
      const p = playlists.find(x => x.id === activePlaylistId);
      const isXtream = p && (p.url.startsWith('xtream://') || p.url.includes('/get.php?'));

      if (isXtream && selectedChannel) {
        let config: any = null;
        if (p.url.startsWith('xtream://')) {
          config = JSON.parse(base64Decode(p.url.replace('xtream://', '')));
        } else {
          const match = p.url.match(/^(https?:\/\/[^/]+)\/get\.php\?username=([^&]+)&password=([^&]+)/);
          if (match) {
            config = { host: match[1], username: match[2], password: match[3] };
          }
        }

        if (config) {
          const channelId = selectedChannel.id.replace('xt_live_', '');
          const fetchUrl = `${config.host}/player_api.php?username=${config.username}&password=${config.password}&action=get_simple_data_table&stream_id=${channelId}`;
          
          console.log(`[Catchup EPG] Fetching from: ${fetchUrl}`);
          
          const targetUrls = [
            fetchUrl,
            `https://corsproxy.io/?url=${encodeURIComponent(fetchUrl)}`,
            `https://api.allorigins.win/raw?url=${encodeURIComponent(fetchUrl)}`
          ];

          let text = '';
          let fetched = false;
          for (let i = 0; i < targetUrls.length; i++) {
            const u = targetUrls[i];
            try {
              text = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', u, true);
                xhr.timeout = 20000;
                xhr.onload = () => {
                  if (xhr.status >= 200 && xhr.status < 300) {
                    if (xhr.responseText && xhr.responseText.trim().length > 0) resolve(xhr.responseText);
                    else reject(new Error('Empty'));
                  } else reject(new Error('HTTP status error'));
                };
                xhr.onerror = () => reject(new Error('Network error'));
                xhr.ontimeout = () => reject(new Error('Timeout'));
                xhr.send();
              });
              fetched = true;
              break;
            } catch (e) {
              console.warn(`[Catchup EPG] Failed fetching from: ${u}`);
            }
          }

          if (fetched && active) {
            try {
              const data = JSON.parse(text);
              const listings = data?.epg_listings || [];
              if (Array.isArray(listings) && listings.length > 0) {
                const nowTime = Date.now();
                const mapped: EpgProgram[] = listings.map((item: any, idx: number) => {
                  const startMs = item.start_timestamp 
                    ? parseInt(item.start_timestamp, 10) * 1000 
                    : new Date(item.start.replace(' ', 'T')).getTime();
                  const endMs = item.stop_timestamp 
                    ? parseInt(item.stop_timestamp, 10) * 1000 
                    : new Date(item.end.replace(' ', 'T')).getTime();
                  
                  const isPast = endMs <= nowTime;
                  const isFuture = startMs > nowTime;
                  const isCurrent = nowTime >= startMs && nowTime < endMs;

                  const rawTitle = item.title || 'Broadcast Program';
                  const rawDesc = item.description || '';
                  
                  // Safe base64 check
                  let parsedTitle = rawTitle;
                  let parsedDesc = rawDesc;
                  try {
                    if (/^[a-zA-Z0-9+/]+={0,2}$/.test(rawTitle) && rawTitle.length > 4) {
                      parsedTitle = base64Decode(rawTitle);
                    }
                    if (/^[a-zA-Z0-9+/]+={0,2}$/.test(rawDesc) && rawDesc.length > 4) {
                      parsedDesc = base64Decode(rawDesc);
                    }
                  } catch (_) {}

                  return {
                    id: item.id || `epg_l_${idx}`,
                    title: parsedTitle,
                    description: parsedDesc,
                    start: new Date(startMs),
                    end: new Date(endMs),
                    startTimestamp: startMs,
                    endTimestamp: endMs,
                    isPast,
                    isCurrent,
                    isFuture
                  };
                });
                
                setEpgList(mapped.sort((a, b) => a.startTimestamp - b.startTimestamp));
                setLoadingEpg(false);
                return;
              }
            } catch (err) {
              console.error('Failed parsing EPG response', err);
            }
          }
        }
      }

      // Fallback: Generate mock EPG for the last 3 days
      if (active) {
        const generated: EpgProgram[] = [];
        const now = new Date();
        for (let i = 0; i < 3; i++) {
          const targetDay = new Date();
          targetDay.setDate(now.getDate() - i);
          
          const slots = [
            { startHour: 0, endHour: 2, title: 'Late Night Movie', desc: 'An exciting thriller movie for late night entertainment.' },
            { startHour: 2, endHour: 6, title: 'Music Mix Live', desc: 'A collection of the greatest music hits of all times.' },
            { startHour: 6, endHour: 8, title: 'Morning EPG News', desc: 'Get the latest national and international news.' },
            { startHour: 8, endHour: 10, title: 'Good Morning', desc: 'Start your day with news, weather, and interviews.' },
            { startHour: 10, endHour: 12, title: 'Cooking Show', desc: 'Learn how to cook amazing international recipes.' },
            { startHour: 12, endHour: 14, title: 'Sports Special', desc: 'Weekly roundup of matches, results, and interviews.' },
            { startHour: 14, endHour: 16, title: 'Documentary Time', desc: 'Explore the wonders of nature and history.' },
            { startHour: 16, endHour: 18, title: 'Evening Series', desc: 'Episode of your favorite drama television series.' },
            { startHour: 18, endHour: 21, title: 'Prime Time Show', desc: 'Celebrity guest interviews and musical performances.' },
            { startHour: 21, endHour: 24, title: 'Blockbuster Cinema', desc: 'Premium award-winning action and drama films.' }
          ];

          slots.forEach((s, idx) => {
            const start = new Date(targetDay);
            start.setHours(s.startHour, 0, 0, 0);
            const end = new Date(targetDay);
            end.setHours(s.endHour, 0, 0, 0);
            
            const startTimestamp = start.getTime();
            const endTimestamp = end.getTime();
            const nowTime = now.getTime();
            
            const isPast = endTimestamp <= nowTime;
            const isFuture = startTimestamp > nowTime;
            const isCurrent = nowTime >= startTimestamp && nowTime < endTimestamp;

            generated.push({
              id: `epg_${i}_${idx}_${startTimestamp}`,
              title: s.title,
              description: s.desc,
              start,
              end,
              startTimestamp,
              endTimestamp,
              isPast,
              isCurrent,
              isFuture
            });
          });
        }
        setEpgList(generated.sort((a, b) => a.startTimestamp - b.startTimestamp));
      }
      setLoadingEpg(false);
    }

    loadEpg();

    return () => {
      active = false;
    };
  }, [selectedChannel, activePlaylistId, playlists]);

  const handlePlayProgram = (program: EpgProgram) => {
    if (!selectedChannel) return;

    if (program.isFuture) {
      Alert.alert('Warning', 'Cannot play a future broadcast.');
      return;
    }

    // Build Timeshift URL if Xtream codes
    const p = playlists.find(x => x.id === activePlaylistId);
    const isXtream = p && (p.url.startsWith('xtream://') || p.url.includes('/get.php?'));
    
    let playUrl = selectedChannel.streamUrl;

    if (isXtream) {
      let config: any = null;
      if (p.url.startsWith('xtream://')) {
        config = JSON.parse(base64Decode(p.url.replace('xtream://', '')));
      } else {
        const match = p.url.match(/^(https?:\/\/[^/]+)\/get\.php\?username=([^&]+)&password=([^&]+)/);
        if (match) {
          config = { host: match[1], username: match[2], password: match[3] };
        }
      }

      if (config) {
        const channelId = selectedChannel.id.replace('xt_live_', '');
        // format start date for timeshift.php: YYYY-MM-DD:HH-mm
        const date = new Date(program.startTimestamp);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const h = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        const startFormatted = `${y}-${m}-${d}:${h}-${min}`;
        
        playUrl = `${config.host}/timeshift.php?username=${config.username}&password=${config.password}&stream=${channelId}&start=${startFormatted}`;
      }
    }

    router.push({
      pathname: '/player',
      params: {
        streamUrl: playUrl,
        title: `${selectedChannel.name} - ${program.title}`,
        isLive: 'false', // play as seekable VOD
        quality: selectedChannel.quality || 'HD',
        current: program.title,
        next: ''
      }
    });
  };

  const formatTimeRange = (start: Date, end: Date) => {
    const formatTime = (d: Date) => {
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      return `${h}:${m}`;
    };
    return `${formatTime(start)} - ${formatTime(end)}`;
  };

  const getFilteredEpg = () => {
    if (days.length === 0) return [];
    const targetDateStr = days[selectedDayIndex].dateString;
    
    return epgList.filter(item => {
      const d = new Date(item.startTimestamp);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const itemDateStr = `${y}-${m}-${day}`;
      return itemDateStr === targetDateStr;
    });
  };

  const filteredEpg = getFilteredEpg();

  const renderChannelCard = ({ item }: { item: Channel }) => {
    const isSelected = selectedChannel?.id === item.id;
    return (
      <Pressable 
        style={[
          styles.channelCard, 
          { backgroundColor: colors.surface, borderColor: isSelected ? colors.gold : colors.border }
        ]}
        onPress={() => {
          setSelectedChannel(item);
          setEpgList([]);
        }}
      >
        <View style={styles.channelLogoWrapper}>
          <Image 
            source={{ uri: item.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=1A1A1A&color=D4A843&bold=true&size=100&format=svg` }} 
            style={styles.channelLogo}
            contentFit="contain"
          />
        </View>
        <Text style={[styles.channelName, { color: colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable 
          style={styles.backBtn} 
          onPress={() => {
            if (selectedChannel) {
              setSelectedChannel(null);
            } else {
              router.back();
            }
          }}
        >
          <Feather name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {selectedChannel ? `${selectedChannel.name} - Catch Up` : 'Catch Up'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {!selectedChannel ? (
        <FlatList
          data={catchupChannels}
          keyExtractor={(item) => item.id}
          renderItem={renderChannelCard}
          numColumns={2}
          contentContainerStyle={[styles.channelsGrid, { paddingBottom: insets.bottom + 20 }]}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="clock" size={48} color={colors.mutedForeground} style={{ marginBottom: 16 }} />
              <Text style={[styles.emptyText, { color: colors.text }]}>
                No catch-up channels available
              </Text>
            </View>
          }
        />
      ) : (
        <View style={{ flex: 1 }}>
          <View style={[styles.daysBar, { borderBottomColor: colors.border }]}>
            {days.map((day, idx) => {
              const isSelected = selectedDayIndex === idx;
              return (
                <Pressable
                  key={day.dateString}
                  style={[
                    styles.dayTabItem,
                    isSelected && { borderBottomColor: colors.gold }
                  ]}
                  onPress={() => setSelectedDayIndex(idx)}
                >
                  <Text style={[
                    styles.dayTabLabel, 
                    { color: isSelected ? colors.gold : colors.text }
                  ]}>
                    {idx === 0 ? 'Today' : idx === 1 ? 'Yesterday' : day.label.split(' (')[0]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {loadingEpg ? (
            <View style={styles.loadingWrapper}>
              <ActivityIndicator size="large" color={colors.gold} />
              <Text style={{ color: colors.mutedForeground, marginTop: 12 }}>Syncing EPG Archive...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredEpg}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
              renderItem={({ item }) => (
                <View 
                  style={[
                    styles.epgCard, 
                    { 
                      backgroundColor: colors.surface, 
                      borderColor: item.isCurrent ? colors.gold : colors.border,
                      opacity: item.isFuture ? 0.55 : 1 
                    }
                  ]}
                >
                  <View style={styles.epgTimeContainer}>
                    <Text style={[styles.epgTime, { color: item.isCurrent ? colors.gold : colors.text }]}>
                      {formatTimeRange(item.start, item.end)}
                    </Text>
                    {item.isCurrent && (
                      <View style={styles.nowPlayingBadge}>
                        <Text style={styles.nowPlayingText}>LIVE</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.epgInfo}>
                    <Text style={[styles.epgTitle, { color: colors.text }]} numberOfLines={2}>
                      {item.title}
                    </Text>
                    {item.description ? (
                      <Text style={[styles.epgDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                        {item.description}
                      </Text>
                    ) : null}
                  </View>

                  {!item.isFuture && (
                    <Pressable 
                      style={[styles.playBtn, { backgroundColor: item.isCurrent ? colors.gold : 'rgba(255,255,255,0.08)' }]}
                      onPress={() => handlePlayProgram(item)}
                    >
                      <Feather 
                        name={item.isCurrent ? 'tv' : 'play-circle'} 
                        size={18} 
                        color={item.isCurrent ? '#1A1A1A' : colors.text} 
                      />
                      <Text style={[styles.playBtnText, { color: item.isCurrent ? '#1A1A1A' : colors.text }]}>
                        {item.isCurrent ? 'Live' : 'Catch Up'}
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Feather name="calendar" size={48} color={colors.mutedForeground} style={{ marginBottom: 16 }} />
                  <Text style={[styles.emptyText, { color: colors.text }]}>
                    No schedule for this date
                  </Text>
                </View>
              }
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  channelsGrid: {
    padding: 8,
  },
  channelCard: {
    flex: 1,
    margin: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelLogoWrapper: {
    width: 80,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  channelLogo: {
    width: '100%',
    height: '100%',
  },
  channelName: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  daysBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  dayTabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  dayTabLabel: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  loadingWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  epgCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  epgTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  epgTime: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  nowPlayingBadge: {
    backgroundColor: '#E53935',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  nowPlayingText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  epgInfo: {
    gap: 4,
  },
  epgTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  epgDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
  },
  playBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 6,
  },
});
