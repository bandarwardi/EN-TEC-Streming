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
    poster?: string;
    backdrop?: string;
    description?: string;
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
  const [errorToastVisible, setErrorToastVisible] = useState(false);
  const errorToastOpacity = useRef(new Animated.Value(0)).current;
  const errorToastY = useRef(new Animated.Value(-80)).current;
  const videoViewRef = useRef<any>(null);

  const favoriteItems = useAppStore((s) => s.favoriteItems) || [];
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const playbackQueue = useAppStore((s) => s.playbackQueue) || [];
  const playbackIndex = useAppStore((s) => s.playbackIndex);
  const setPlaybackIndex = useAppStore((s) => s.setPlaybackIndex);

  const continueWatching = useAppStore((s) => s.continueWatching) || [];
  const updateContinueWatching = useAppStore((s) => s.updateContinueWatching);
  const removeFromContinueWatching = useAppStore((s) => s.removeFromContinueWatching);

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
  const seekBarWidth = useRef(W - 40);
  const seekStartX = useRef(0);
  const controlsOpacity = useRef(new Animated.Value(1)).current;

  const matchedWatched = continueWatching.find(item => item.streamUrl === streamUrl || (params.id && item.id === params.id));

  const player = useVideoPlayer(streamUrl || null, (p) => {
    p.volume = 1;
    if (matchedWatched && matchedWatched.progress > 10 && matchedWatched.duration > 0 && matchedWatched.progress < matchedWatched.duration - 30) {
      p.currentTime = matchedWatched.progress;
    }
    p.play();
  });

  const progressRef = useRef({ time: 0, duration: 0 });

  useEffect(() => {
    if (!player) return;
    const interval = setInterval(() => {
      try {
        const time = player.currentTime ?? 0;
        const dur = player.duration ?? 0;
        setCurrentTime(time);
        setDuration(dur);
        progressRef.current = { time, duration: dur };
        setIsPlaying(player.playing ?? false);
        if (player.status === 'error') setHasError(true);
        if (player.status === 'readyToPlay') setIsBuffering(false);
        if (player.status === 'loading') setIsBuffering(true);
      } catch (_) {}
    }, 500);
    return () => clearInterval(interval);
  }, [player]);

  useEffect(() => {
    return () => {
      const p = progressRef.current;
      if (!isLive && p.duration > 0) {
        if (p.time > p.duration - 30) {
          removeFromContinueWatching(params.id || streamUrl);
        } else if (p.time > 10) {
          updateContinueWatching({
            id: params.id || streamUrl,
            type: 'vod',
            title,
            poster: params.poster || params.logo || '',
            backdrop: params.backdrop || '',
            streamUrl,
            progress: p.time,
            duration: p.duration,
            timestamp: Date.now(),
            quality: params.quality,
            description: params.description,
            category: params.category
          });
        }
      }
    };
  }, []);

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

  // Tap on empty area: toggle controls immediately
  const handleBackgroundTap = useCallback(() => {
    if (showControls) {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      Animated.timing(controlsOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(
        () => setShowControls(false)
      );
    } else {
      showControlsNow();
    }
  }, [showControls, controlsOpacity, showControlsNow]);

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
      // Show animated toast then auto-navigate back
      setErrorToastVisible(true);
      Animated.parallel([
        Animated.timing(errorToastOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(errorToastY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(errorToastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.timing(errorToastY, { toValue: -80, duration: 300, useNativeDriver: true }),
        ]).start(() => {
          router.back();
        });
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [hasError]);

  const seekTo = useCallback((ratio: number) => {
    if (!player || !duration) return;
    const target = Math.max(0, Math.min(duration, ratio * duration));
    player.currentTime = target;
    setCurrentTime(target);
  }, [player, duration]);

  // Seek bar PanResponder - uses absolute position within seekBar view
  const seekBarPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (evt) => {
        setSeeking(true);
        if (hideTimer.current) clearTimeout(hideTimer.current);
        // locationX is position within the seekBarContainer view
        seekStartX.current = evt.nativeEvent.locationX;
        const ratio = Math.max(0, Math.min(1, seekStartX.current / (seekBarWidth.current || 1)));
        setSeekPreview(ratio);
      },
      onPanResponderMove: (evt, gestureState) => {
        const currentX = seekStartX.current + gestureState.dx;
        const ratio = Math.max(0, Math.min(1, currentX / (seekBarWidth.current || 1)));
        setSeekPreview(ratio);
      },
      onPanResponderRelease: (evt, gestureState) => {
        const currentX = seekStartX.current + gestureState.dx;
        const ratio = Math.max(0, Math.min(1, currentX / (seekBarWidth.current || 1)));
        // seekTo is captured via closure - need to get current values
        const dur = player?.duration ?? 0;
        if (player && dur > 0) {
          const target = Math.max(0, Math.min(dur, ratio * dur));
          player.currentTime = target;
          setCurrentTime(target);
        }
        setSeeking(false);
        if (hideTimer.current) clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => {
          Animated.timing(controlsOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(
            () => setShowControls(false)
          );
        }, 4000);
      },
      onPanResponderTerminationRequest: () => false,
    })
  ).current;

  // Volume slider PanResponder
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

  const handlePrevChannel = () => {
    if (playbackQueue.length <= 1) return;
    const prevIdx = (playbackIndex - 1 + playbackQueue.length) % playbackQueue.length;
    setPlaybackIndex(prevIdx);
    const ch = playbackQueue[prevIdx];
    router.replace({
      pathname: '/player',
      params: {
        id: ch.id,
        streamUrl: ch.streamUrl,
        title: ch.name,
        isLive: 'true',
        current: ch.current || '',
        next: ch.next || '',
        quality: ch.quality || 'HD',
        logo: ch.logo || '',
        category: ch.category || ''
      }
    });
  };

  const handleNextChannel = () => {
    if (playbackQueue.length <= 1) return;
    const nextIdx = (playbackIndex + 1) % playbackQueue.length;
    setPlaybackIndex(nextIdx);
    const ch = playbackQueue[nextIdx];
    router.replace({
      pathname: '/player',
      params: {
        id: ch.id,
        streamUrl: ch.streamUrl,
        title: ch.name,
        isLive: 'true',
        current: ch.current || '',
        next: ch.next || '',
        quality: ch.quality || 'HD',
        logo: ch.logo || '',
        category: ch.category || ''
      }
    });
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

  const handlePiP = () => {
    if (videoViewRef.current) {
      try {
        videoViewRef.current.startPictureInPicture();
      } catch (e) {
        console.warn('PiP not supported or failed', e);
      }
    }
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

      {/* ── Layer 1: Video (pointerEvents none so it never eats touches) ── */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {player && (
          <VideoView
            ref={videoViewRef}
            player={player}
            style={StyleSheet.absoluteFill}
            nativeControls={false}
            contentFit="contain"
            allowsPictureInPicture={true}
            startsPictureInPictureAutomatically={true}
          />
        )}
      </View>

      {/* ── Layer 2: Buffering spinner ── */}
      {isBuffering && !hasError && (
        <View style={styles.bufferingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#D4A843" />
        </View>
      )}

      {/* ── Layer 3: Background tap area (toggle controls) ── */}
      <Pressable style={StyleSheet.absoluteFill} onPress={handleBackgroundTap} />

      {/* ── Layer 4: Controls overlay (box-none so tap layer still works in empty areas) ── */}
      {showControls && (
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: controlsOpacity }]}
          pointerEvents="box-none"
        >
          {/* Decorative gradients - no touch */}
          <LinearGradient
            colors={['rgba(0,0,0,0.85)', 'transparent']}
            style={styles.topGradient}
            pointerEvents="none"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.85)']}
            style={styles.bottomGradient}
            pointerEvents="none"
          />

          {/* Top bar */}
          <View
            style={[styles.topBar, { paddingTop: Platform.OS === 'ios' ? insets.top + 8 : 20 }]}
            pointerEvents="box-none"
          >
            <Pressable 
              onPress={() => router.back()} 
              style={({ focused }: any) => [
                styles.iconBtn,
                focused && { transform: [{ scale: 1.1 }], backgroundColor: colors.gold }
              ]}
            >
              {({ focused }: any) => (
                <Feather name="arrow-left" size={22} color={focused ? "#0A0A0A" : "#FFF"} />
              )}
            </Pressable>

            <View style={styles.titleBlock} pointerEvents="none">
              <Text style={styles.titleText} numberOfLines={1}>{title}</Text>
              {isLive && current ? (
                <Text style={styles.subtitleText} numberOfLines={1}>{current}</Text>
              ) : null}
            </View>

            <View style={styles.topActions} pointerEvents="box-none">
              <Pressable 
                style={({ focused }: any) => [
                  styles.iconBtn,
                  focused && { transform: [{ scale: 1.1 }], backgroundColor: colors.gold }
                ]} 
                onPress={handlePiP}
              >
                {({ focused }: any) => (
                  <Feather name="minimize" size={20} color={focused ? "#0A0A0A" : "#FFF"} />
                )}
              </Pressable>
              <Pressable 
                style={({ focused }: any) => [
                  styles.iconBtn,
                  focused && { transform: [{ scale: 1.1 }], backgroundColor: colors.gold }
                ]} 
                onPress={toggleMute}
              >
                {({ focused }: any) => (
                  <Feather name={isMuted ? 'volume-x' : 'volume-2'} size={20} color={focused ? "#0A0A0A" : "#FFF"} />
                )}
              </Pressable>
              <Pressable 
                style={({ focused }: any) => [
                  styles.iconBtn,
                  focused && { transform: [{ scale: 1.1 }], backgroundColor: colors.gold }
                ]} 
                onPress={handleToggleFavorite}
              >
                {({ focused }: any) => (
                  <Feather
                    name="heart"
                    size={20}
                    color={focused ? "#0A0A0A" : (isFavorite ? '#E53935' : '#FFF')}
                    fill={isFavorite ? '#E53935' : 'transparent'}
                  />
                )}
              </Pressable>
            </View>
          </View>

          {/* Center play controls */}
          <View style={styles.centerRow} pointerEvents="box-none">
            {isLive ? (
              <Pressable
                style={({ focused }: any) => [
                  styles.centerBtn, 
                  playbackQueue.length <= 1 && { opacity: 0.3 },
                  focused && { transform: [{ scale: 1.1 }] }
                ]}
                onPress={handlePrevChannel}
                disabled={playbackQueue.length <= 1}
              >
                {({ focused }: any) => (
                  <>
                    <Ionicons name="play-skip-back" size={32} color={focused ? colors.gold : "#FFF"} />
                    <Text style={[styles.seekLabel, focused && { color: colors.gold }]}>Prev Channel</Text>
                  </>
                )}
              </Pressable>
            ) : (
              <Pressable 
                style={({ focused }: any) => [
                  styles.centerBtn,
                  focused && { transform: [{ scale: 1.1 }] }
                ]} 
                onPress={() => handleSeekBy(-10)}
                focusable={true}
              >
                {({ focused }: any) => (
                  <>
                    <Ionicons name="play-back" size={32} color={focused ? colors.gold : "#FFF"} />
                    <Text style={[styles.seekLabel, focused && { color: colors.gold }]}>10</Text>
                  </>
                )}
              </Pressable>
            )}

            <Pressable 
              style={({ focused }: any) => [
                styles.playBtn,
                focused && { transform: [{ scale: 1.1 }], shadowColor: colors.gold, shadowOpacity: 0.8, shadowRadius: 10 }
              ]} 
              onPress={togglePlay}
              focusable={true}
              hasTVPreferredFocus={true}
            >
              {({ focused }: any) => (
                <Feather name={isPlaying ? 'pause' : 'play'} size={38} color={focused ? "#0A0A0A" : "#FFF"} />
              )}
            </Pressable>

            {isLive ? (
              <Pressable
                style={({ focused }: any) => [
                  styles.centerBtn, 
                  playbackQueue.length <= 1 && { opacity: 0.3 },
                  focused && { transform: [{ scale: 1.1 }] }
                ]}
                onPress={handleNextChannel}
                disabled={playbackQueue.length <= 1}
                focusable={true}
              >
                {({ focused }: any) => (
                  <>
                    <Ionicons name="play-skip-forward" size={32} color={focused ? colors.gold : "#FFF"} />
                    <Text style={[styles.seekLabel, focused && { color: colors.gold }]}>Next Channel</Text>
                  </>
                )}
              </Pressable>
            ) : (
              <Pressable 
                style={({ focused }: any) => [
                  styles.centerBtn,
                  focused && { transform: [{ scale: 1.1 }] }
                ]} 
                onPress={() => handleSeekBy(10)}
                focusable={true}
              >
                {({ focused }: any) => (
                  <>
                    <Ionicons name="play-forward" size={32} color={focused ? colors.gold : "#FFF"} />
                    <Text style={[styles.seekLabel, focused && { color: colors.gold }]}>10</Text>
                  </>
                )}
              </Pressable>
            )}
          </View>

          {/* Volume slider */}
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

          {/* Bottom bar */}
          <View style={styles.bottomBar} pointerEvents="box-none">
            {isLive ? (
              <View style={styles.liveRow} pointerEvents="none">
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
              <View style={styles.vodBar} pointerEvents="box-none">
                <View style={styles.timeRow} pointerEvents="none">
                  <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                  <Text style={styles.timeText}>{formatTime(duration)}</Text>
                </View>

                {/* Seek bar - has its own PanResponder, must NOT be box-none */}
                <View
                  style={styles.seekBarContainer}
                  onLayout={(e) => { seekBarWidth.current = e.nativeEvent.layout.width; }}
                  {...seekBarPan.panHandlers}
                >
                  <View style={styles.seekBarTrack} pointerEvents="none">
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
                    pointerEvents="none"
                  />
                </View>
              </View>
            )}
          </View>
        </Animated.View>
      )}

      {/* ── Layer 5: Error toast (slides in from top, auto-dismisses) ── */}
      {errorToastVisible && (
        <Animated.View
          style={[
            styles.errorToast,
            {
              opacity: errorToastOpacity,
              transform: [{ translateY: errorToastY }],
              top: Platform.OS === 'ios' ? insets.top + 16 : 32,
            },
          ]}
          pointerEvents="none"
        >
          <View style={styles.errorToastIconBg}>
            <Feather name="wifi-off" size={20} color="#FFF" />
          </View>
          <View style={styles.errorToastTextBlock}>
            <Text style={styles.errorToastTitle}>Content Unavailable</Text>
            <Text style={styles.errorToastSub}>Returning automatically...</Text>
          </View>
        </Animated.View>
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
    height: 36,
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
    width: 18, height: 18,
    borderRadius: 9,
    backgroundColor: '#D4A843',
    marginTop: -9,
    shadowColor: '#D4A843',
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  errorToast: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(20,20,20,0.95)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(229,57,53,0.5)',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 999,
  },
  errorToastIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorToastTextBlock: { flex: 1 },
  errorToastTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
    writingDirection: 'rtl',
  },
  errorToastSub: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    marginTop: 2,
    writingDirection: 'rtl',
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#D4A843',
  },
  retryText: { color: '#1A1A1A', fontWeight: 'bold' },
  errorTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
});

