import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Dimensions,
  PanResponder,
  Linking,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, router } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { StatusBar } from 'expo-status-bar';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '@/store/app-store';

const { width: W, height: H } = Dimensions.get('window');

function formatTime(sec: number): string {
  if (!isFinite(sec) || isNaN(sec) || sec < 0) return '0:00';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function PlayerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    id?: string;
    streamUrl: string;
    title: string;
    isLive: string;
    current: string;
    next: string;
    quality: string;
    logo?: string;
    category?: string;
  }>();

  const streamUrl = params.streamUrl ?? '';
  const title = params.title ?? 'Streaming';
  const isLive = params.isLive === 'true';
  const current = params.current ?? '';
  const next = params.next ?? '';

  const [showControls, setShowControls] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [hasError, setHasError] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [seeking, setSeeking] = useState(false);
  const [seekPreview, setSeekPreview] = useState(0);

  const favoriteItems = useAppStore((s) => s.favoriteItems) || [];
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);

  const matchedFavoriteItem = favoriteItems.find(
    (item) => item.streamUrl === streamUrl || (params.id && item.id === params.id)
  );
  const isFavorite = !!matchedFavoriteItem;

  const handleToggleFavorite = () => {
    if (matchedFavoriteItem) {
      toggleFavorite(matchedFavoriteItem);
    } else {
      const newItem: any = {
        id: params.id || `stream_${encodeURIComponent(streamUrl).substring(0, 30)}`,
        name: title,
        logo: params.logo || '',
        category: params.category || 'Uncategorized',
        streamUrl: streamUrl,
        current: current,
        next: next,
        quality: params.quality || 'HD',
        isLive: isLive,
        type: isLive ? 'live' : 'vod'
      };
      toggleFavorite(newItem);
    }
  };

  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekBarRef = useRef<View>(null);
  const seekBarXRef = useRef(20);
  const seekBarWidth = useRef(W - 40);
  const controlsOpacity = useRef(new Animated.Value(1)).current;

  const player = useVideoPlayer(streamUrl || null, (p) => {
    p.volume = 1;
    p.play();
  });

  useEffect(() => {
    if (!player) return;
    const interval = setInterval(() => {
      try {
        setCurrentTime(player.currentTime ?? 0);
        setDuration(player.duration ?? 0);
        setIsPlaying(player.playing ?? false);
        if (player.status === 'error') setHasError(true);
        if (player.status === 'readyToPlay') setIsBuffering(false);
        if (player.status === 'loading') setIsBuffering(true);
      } catch (_) {}
    }, 500);
    return () => clearInterval(interval);
  }, [player]);

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      Animated.timing(controlsOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(
        () => setShowControls(false)
      );
    }, 4000);
  }, [controlsOpacity]);

  const showControlsNow = useCallback(() => {
    if (!showControls) {
      setShowControls(true);
      Animated.timing(controlsOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
    scheduleHide();
  }, [showControls, controlsOpacity, scheduleHide]);

  useEffect(() => {
    scheduleHide();
    
    async function lockLandscape() {
      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      } catch (e) {
        console.warn('Failed to lock screen orientation to landscape:', e);
      }
    }
    
    lockLandscape();
    
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      async function unlockOrientation() {
        try {
          await ScreenOrientation.unlockAsync();
        } catch (e) {
          console.warn('Failed to unlock screen orientation:', e);
        }
      }
      unlockOrientation();
    };
  }, []);

  useEffect(() => {
    if (hasError) {
      Alert.alert(
        'Playback Error',
        'Failed to play this content from the server.',
        [{ text: 'OK', onPress: () => router.back() }],
        { cancelable: false }
      );
    }
  }, [hasError]);

  const seekTo = useCallback((ratio: number) => {
    if (!player || !duration) return;
    const target = Math.max(0, Math.min(duration, ratio * duration));
    player.currentTime = target;
    setCurrentTime(target);
  }, [player, duration]);

  const seekBarPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        setSeeking(true);
        if (hideTimer.current) clearTimeout(hideTimer.current);
        const ratio = Math.max(0, Math.min(1, (evt.nativeEvent.pageX - seekBarXRef.current) / seekBarWidth.current));
        setSeekPreview(ratio);
      },
      onPanResponderMove: (evt) => {
        const ratio = Math.max(0, Math.min(1, (evt.nativeEvent.pageX - seekBarXRef.current) / seekBarWidth.current));
        setSeekPreview(ratio);
      },
      onPanResponderRelease: (evt) => {
        const ratio = Math.max(0, Math.min(1, (evt.nativeEvent.pageX - seekBarXRef.current) / seekBarWidth.current));
        seekTo(ratio);
        setSeeking(false);
        scheduleHide();
      },
    })
  ).current;

  const volumePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt) => {
        const sliderH = 120;
        const ratio = 1 - Math.max(0, Math.min(1, evt.nativeEvent.locationY / sliderH));
        setVolume(ratio);
        if (player) player.volume = ratio;
      },
    })
  ).current;

  const onSeekBarLayout = () => {
    seekBarRef.current?.measure((x, y, width, height, pageX, pageY) => {
      if (pageX !== undefined && pageX !== null) {
        seekBarXRef.current = pageX;
      }
      if (width) {
        seekBarWidth.current = width;
      }
    });
  };

  const togglePlay = () => {
    if (!player) return;
    if (player.playing) { player.pause(); setIsPlaying(false); }
    else { player.play(); setIsPlaying(true); }
    showControlsNow();
  };

  const handleSeekBy = (secs: number) => {
    if (!player) return;
    const target = Math.max(0, Math.min(duration, (player.currentTime ?? 0) + secs));
    player.currentTime = target;
    setCurrentTime(target);
    showControlsNow();
  };

  const toggleMute = () => {
    if (!player) return;
    const next = !isMuted;
    player.muted = next;
    setIsMuted(next);
    showControlsNow();
  };

  const handleCopyUrl = () => {
    Clipboard.setStringAsync(streamUrl).catch(() => {});
  };

  const handleOpenExternal = () => {
    Linking.openURL(streamUrl).catch(() => {});
  };

  const progress = duration > 0 ? (seeking ? seekPreview : currentTime / duration) : 0;

  if (!streamUrl) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar hidden />
        <Feather name="alert-circle" size={48} color="#E53935" />
        <Text style={styles.errorTitle}>No stream URL provided</Text>
        <Pressable style={styles.retryBtn} onPress={() => router.back()}>
          <Text style={styles.retryText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {player && (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          nativeControls={false}
          contentFit="contain"
        />
      )}

      {isBuffering && !hasError && (
        <View style={styles.bufferingOverlay}>
          <ActivityIndicator size="large" color="#D4A843" />
        </View>
      )}

      <Pressable style={StyleSheet.absoluteFill} onPress={showControlsNow}>
        {showControls && (
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: controlsOpacity }]}>
            <LinearGradient
              colors={['rgba(0,0,0,0.85)', 'transparent']}
              style={styles.topGradient}
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.85)']}
              style={styles.bottomGradient}
            />

            <View
              style={[styles.topBar, { paddingTop: Platform.OS === 'ios' ? insets.top + 8 : 20 }]}
            >
              <Pressable onPress={() => router.back()} style={styles.iconBtn}>
                <Feather name="arrow-left" size={22} color="#FFF" />
              </Pressable>

              <View style={styles.titleBlock}>
                <Text style={styles.titleText} numberOfLines={1}>{title}</Text>
                {isLive && current ? (
                  <Text style={styles.subtitleText} numberOfLines={1}>{current}</Text>
                ) : null}
              </View>

              <View style={styles.topActions}>
                <Pressable style={styles.iconBtn} onPress={toggleMute}>
                  <Feather name={isMuted ? 'volume-x' : 'volume-2'} size={20} color="#FFF" />
                </Pressable>
                <Pressable style={styles.iconBtn} onPress={handleToggleFavorite}>
                  <Feather
                    name="heart"
                    size={20}
                    color={isFavorite ? '#E53935' : '#FFF'}
                    fill={isFavorite ? '#E53935' : 'transparent'}
                  />
                </Pressable>
              </View>
            </View>

            <View style={styles.centerRow}>
              <Pressable style={styles.centerBtn} onPress={() => handleSeekBy(-10)}>
                <Ionicons name="play-back" size={32} color="#FFF" />
                <Text style={styles.seekLabel}>10</Text>
              </Pressable>

              <Pressable style={styles.playBtn} onPress={togglePlay}>
                <Feather name={isPlaying ? 'pause' : 'play'} size={38} color="#FFF" />
              </Pressable>

              <Pressable style={styles.centerBtn} onPress={() => handleSeekBy(10)}>
                <Ionicons name="play-forward" size={32} color="#FFF" />
                <Text style={styles.seekLabel}>10</Text>
              </Pressable>
            </View>

            <View
              style={[
                styles.volumeSliderWrapper,
                { top: H * 0.5 - 60, left: Platform.OS === 'ios' ? insets.left + 20 : 20 },
              ]}
              {...volumePan.panHandlers}
            >
              <View style={styles.volumeTrack}>
                <View style={[styles.volumeFill, { height: `${volume * 100}%` }]} />
              </View>
              <Feather
                name={volume === 0 ? 'volume-x' : volume < 0.5 ? 'volume-1' : 'volume-2'}
                size={14}
                color="rgba(255,255,255,0.6)"
                style={{ marginTop: 6 }}
              />
            </View>

            <View style={styles.bottomBar}>
              {isLive ? (
                <View style={styles.liveRow}>
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveBadgeText}>LIVE</Text>
                  </View>
                  <View style={styles.liveInfo}>
                    <Text style={styles.liveChannel} numberOfLines={1}>{title}</Text>
                    {current ? (
                      <Text style={styles.liveProgram} numberOfLines={1}>
                        Now: {current}
                        {next ? `  ·  Next: ${next}` : ''}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : (
                <View style={styles.vodBar}>
                  <View style={styles.timeRow}>
                    <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                    <Text style={styles.timeText}>{formatTime(duration)}</Text>
                  </View>

                  <View
                    ref={seekBarRef}
                    style={styles.seekBarContainer}
                    onLayout={onSeekBarLayout}
                    {...seekBarPan.panHandlers}
                  >
                    <View style={styles.seekBarTrack}>
                      <View style={[styles.seekBarFill, { width: `${progress * 100}%` }]} />
                    </View>
                    <View
                      style={[
                        styles.seekThumb,
                        {
                          left: `${progress * 100}%`,
                          transform: [{ translateX: -8 }],
                        },
                      ]}
                    />
                  </View>
                </View>
              )}
            </View>
          </Animated.View>
        )}
      </Pressable>

      {hasError && (
        <View style={styles.errorOverlay}>
          <Feather name="shield" size={52} color="#E53935" />
          <Text style={styles.errorTitle}>Stream unavailable</Text>
          <Text style={styles.errorUrl} numberOfLines={3}>{streamUrl}</Text>
          <View style={styles.errorActions}>
            <Pressable
              style={[styles.errorBtn, { borderColor: '#E53935' }]}
              onPress={() => {
                setHasError(false);
                setIsBuffering(true);
                player?.play();
              }}
            >
              <Feather name="refresh-cw" size={16} color="#FFF" />
              <Text style={styles.errorBtnText}>Retry</Text>
            </Pressable>
            <Pressable style={[styles.errorBtn, { borderColor: '#555' }]} onPress={handleCopyUrl}>
              <Feather name="copy" size={16} color="#FFF" />
              <Text style={styles.errorBtnText}>Copy URL</Text>
            </Pressable>
            <Pressable
              style={[styles.errorBtn, { borderColor: '#555' }]}
              onPress={handleOpenExternal}
            >
              <Feather name="external-link" size={16} color="#FFF" />
              <Text style={styles.errorBtnText}>Open Externally</Text>
            </Pressable>
          </View>
          <Pressable style={styles.backFromError} onPress={() => router.back()}>
            <Text style={styles.backFromErrorText}>Go Back</Text>
          </Pressable>
        </View>
      )}


    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  bufferingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  topGradient: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 160,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 200,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  iconBtn: {
    width: 40, height: 40,
    borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  titleBlock: { flex: 1 },
  titleText: { color: '#FFF', fontSize: 17, fontWeight: 'bold' },
  subtitleText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },
  topActions: { flexDirection: 'row', gap: 8 },
  centerRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
  },
  centerBtn: { alignItems: 'center', gap: 2 },
  seekLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 'bold' },
  playBtn: {
    width: 76, height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  volumeSliderWrapper: {
    position: 'absolute',
    alignItems: 'center',
    gap: 4,
    height: 140,
    justifyContent: 'flex-end',
  },
  volumeTrack: {
    width: 4, height: 120,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  volumeFill: {
    width: '100%',
    backgroundColor: '#D4A843',
    borderRadius: 2,
  },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E53935',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  liveDot: {
    width: 6, height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF',
  },
  liveBadgeText: { color: '#FFF', fontWeight: 'bold', fontSize: 11, letterSpacing: 1 },
  liveInfo: { flex: 1 },
  liveChannel: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  liveProgram: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },
  vodBar: { gap: 10 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  timeText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },
  seekBarContainer: {
    height: 28,
    justifyContent: 'center',
    position: 'relative',
  },
  seekBarTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  seekBarFill: {
    height: '100%',
    backgroundColor: '#D4A843',
    borderRadius: 2,
  },
  seekThumb: {
    position: 'absolute',
    top: '50%',
    width: 16, height: 16,
    borderRadius: 8,
    backgroundColor: '#D4A843',
    marginTop: -8,
    shadowColor: '#D4A843',
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  errorTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  errorUrl: {
    color: '#777',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    textAlign: 'center',
  },
  errorActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  errorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#D4A843',
  },
  retryText: { color: '#1A1A1A', fontWeight: 'bold' },
  backFromError: { marginTop: 8 },
  backFromErrorText: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  qualityOverlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  qualityBottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    padding: 24,
    gap: 8,
    zIndex: 100,
  },
  qualityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  qualityTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  qualityOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  qualityOptionText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
