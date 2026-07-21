import { Lineicons } from '@lineiconshq/react-native-lineicons';
import { VolumeMuteBulk, VolumeLowBulk, VolumeHighBulk } from '@lineiconshq/free-icons';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Dimensions,
  PanResponder,
  Linking,
  Animated,
  ActivityIndicator,
  Alert,
  InteractionManager,
  useWindowDimensions,
} from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, router } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { TVFocusable } from '@/components/TVFocusable';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent } from 'expo';
import { WebVideoPlayer, WebVideoPlayerRef } from '@/components/WebVideoPlayer';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { StatusBar as RNStatusBar } from 'react-native';
import { QuestionMarkCircleBulk, ArrowLeftBulk, Message2Bulk, HeartBulk, PreviousStep2Bulk, ShiftLeftBulk, NextStep2Bulk, ShiftRightBulk, Ban2Bulk, PauseBulk, PlayBulk, MonitorBulk } from '@lineiconshq/free-icons';
import { useColors } from '@/hooks/useColors';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '@/store/app-store';

// Removed static W, H

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
    title?: string;
    isLive?: string;
    current?: string;
    next?: string;
    quality?: string;
    logo?: string;
    category?: string;
    poster?: string;
    backdrop?: string;
    description?: string;
    autoResume?: string;
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

  const durationRef = useRef(0);
  const currentTimeRef = useRef(0);
  useEffect(() => { durationRef.current = duration; }, [duration]);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  const [volume, setVolume] = useState(1);
  const [hasError, setHasError] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isLiveSync, setIsLiveSync] = useState(true);
  const [seeking, setSeeking] = useState(false);
  const [seekPreview, setSeekPreview] = useState(0);
  const [errorToastVisible, setErrorToastVisible] = useState(false);
  const [aspectMode, setAspectMode] = useState(0); // 0: Fit, 1: Fill, 2: Stretch, 3: 4:3
  const [retryKey, setRetryKey] = useState(0);
  const retryCount = useRef(0);
  const errorToastOpacity = useRef(new Animated.Value(0)).current;
  const errorToastY = useRef(new Animated.Value(-80)).current;
  const videoViewRef = useRef<any>(null);
  const webPlayerRef = useRef<WebVideoPlayerRef>(null);

  const favoriteItems = useAppStore((s) => s.favoriteItems) || [];
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const playbackQueue = useAppStore((s) => s.playbackQueue) || [];
  const playbackIndex = useAppStore((s) => s.playbackIndex);
  const setPlaybackIndex = useAppStore((s) => s.setPlaybackIndex);

  const continueWatching = useAppStore((s) => s.continueWatching) || [];
  const updateContinueWatching = useAppStore((s) => s.updateContinueWatching);
  const removeFromContinueWatching = useAppStore((s) => s.removeFromContinueWatching);
  const showGlobalAlert = useAppStore((s) => s.showGlobalAlert);
  const hideGlobalAlert = useAppStore((s) => s.hideGlobalAlert);



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

  const { width: W } = useWindowDimensions();
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekBarWidth = useRef(W - 40);
  const seekStartX = useRef(0);
  const controlsOpacity = useRef(new Animated.Value(1)).current;

  const matchedWatchedRef = useRef(continueWatching.find(item => item.streamUrl === streamUrl || (params.id && item.id === params.id)));
  const matchedWatched = matchedWatchedRef.current;
  const shouldPrompt = !isLive && params.autoResume !== 'true' && matchedWatched && matchedWatched.progress > 10 && matchedWatched.duration > 0 && matchedWatched.progress < matchedWatched.duration - 30;

  const [promptVisible, setPromptVisible] = useState(!!shouldPrompt);
  const isFocused = useIsFocused();

  let finalStreamUrl = streamUrl;
  if (Platform.OS === 'web' && isLive && finalStreamUrl && finalStreamUrl.includes('.ts')) {
    finalStreamUrl = finalStreamUrl.replace(/\.ts(\?|$)/i, '.m3u8$1');
  }
  
  let proxiedUrl = finalStreamUrl;
  if (Platform.OS === 'web' && finalStreamUrl) {
    if (!finalStreamUrl.startsWith('http')) {
      // Local file
      proxiedUrl = `/api/local-video?path=${encodeURIComponent(finalStreamUrl.replace('file://', ''))}`;
    } else {
      proxiedUrl = `/proxy?url=${encodeURIComponent(finalStreamUrl)}`;
    }
  }

  useEffect(() => {
    if (shouldPrompt) {
      setIsPlaying(false);
    }
  }, []);

  const setIsPlayerOpen = useAppStore((s) => s.setIsPlayerOpen);

  useEffect(() => {
    setIsPlayerOpen(true);
    return () => setIsPlayerOpen(false);
  }, []);

  const videoSource = React.useMemo(() => {
    if (!proxiedUrl) return null;
    const isHls = proxiedUrl.includes('.m3u8');
    return { 
      uri: proxiedUrl, 
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    } as any;
  }, [proxiedUrl]);

  const player = useVideoPlayer(Platform.OS === 'web' ? null : videoSource, (p) => {
    p.volume = 1;
    if (params.autoResume === 'true' && matchedWatched) {
      p.currentTime = matchedWatched.progress;
    }
    if (!shouldPrompt) {
      p.play();
    }
  });

  const status = useEvent(player, 'statusChange', { status: player ? player.status : 'readyToPlay', error: undefined });
  const isPlayingStatus = useEvent(player, 'playingChange', { isPlaying: player ? player.playing : true });
  
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    retryCount.current = 0;
    if (player && videoSource && Platform.OS !== 'web') {
      try {
        if (player.replaceAsync) {
          player.replaceAsync(videoSource);
        } else {
          player.replace(videoSource);
        }
        setIsBuffering(true);
        if (!shouldPrompt) player.play();
      } catch (e) {}
    }
  }, [videoSource]);

  useEffect(() => {
    let isMounted = true;
    if (Platform.OS === 'web') return; // Handled by WebVideoPlayer events
    
    if (status?.status === 'readyToPlay') {
      setIsBuffering(false);
      setHasError(false);
      if (shouldPrompt) {
        setIsPlaying(false);
      } else {
        setIsPlaying(true);
        if (player) {
          player.play();
        }
      }
    } else if (status?.status === 'error') {
      setHasError(true);
      setIsBuffering(false);
      showErrorToast();
      
      if (retryCount.current < 5) {
        retryCount.current += 1;
        retryTimeoutRef.current = setTimeout(() => {
          if (isMounted && player && videoSource) {
            try {
              setIsBuffering(true);
              setHasError(false);
              if (player.replaceAsync) {
                player.replaceAsync(videoSource);
              } else {
                player.replace(videoSource);
              }
              player.play();
            } catch(e) {
              console.error('Retry play failed', e);
            }
          }
        }, 3000);
      }
    }
    return () => {
      isMounted = false;
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, [status?.status, proxiedUrl, shouldPrompt]);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      setIsPlaying(isPlayingStatus.isPlaying);
    }
  }, [isPlayingStatus.isPlaying]);

  const resetTimer = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setShowControls(true);
    Animated.timing(controlsOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();

    hideTimer.current = setTimeout(() => {
      Animated.timing(controlsOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setShowControls(false);
      });
    }, 5000);
  };

  const showControlsNow = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setShowControls(true);
    controlsOpacity.setValue(1);
    hideTimer.current = setTimeout(() => {
      Animated.timing(controlsOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setShowControls(false);
      });
    }, 5000);
  };

  const handleBackgroundTap = () => {
    if (showControls) {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      Animated.timing(controlsOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setShowControls(false);
      });
    } else {
      showControlsNow();
    }
  };

  useEffect(() => {
    resetTimer();
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [isFocused]);

  useEffect(() => {
    if (Platform.OS === 'web' || !player) return;
    const interval = setInterval(() => {
      try {
        if (player.status === 'readyToPlay') {
          setCurrentTime(player.currentTime);
          if (player.duration) setDuration(player.duration);
        }
      } catch (_) {}
    }, 500);
    return () => clearInterval(interval);
  }, [player]);

  useEffect(() => {
    return () => {
      // Stop the player to prevent audio leaking after navigation
      try {
        if (player) {
          player.pause();
          if (player.replaceAsync) {
            player.replaceAsync(null);
          } else {
            player.replace(null);
          }
        }
      } catch (_) {}
      
      // Update continue watching
      if (streamUrl && !isLive && durationRef.current > 0 && currentTimeRef.current > 10) {
        updateContinueWatching({
          id: params.id || streamUrl,
          type: 'vod',
          title: title,
          poster: params.poster || params.logo || '',
          backdrop: params.backdrop || '',
          streamUrl,
          progress: currentTimeRef.current,
          duration: durationRef.current,
          timestamp: Date.now(),
          quality: params.quality,
          description: params.description,
          category: params.category
        });
      }
    };
  }, []); // Run cleanup ONLY on unmount, not every second!

  const lockLandscape = async () => {
    if (Platform.OS !== 'web') {
      try {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      } catch (e) {
        console.warn('Orientation lock failed', e);
      }
    }
  };

  const unlockOrientation = async () => {
    if (Platform.OS !== 'web') {
      try {
        await ScreenOrientation.unlockAsync();
      } catch (e) {
        console.warn('Orientation unlock failed', e);
      }
    }
  };

  useEffect(() => {
    let interactionTask: any;
    
    const enableImmersive = async () => {
      if (Platform.OS === 'android') {
        try {
          await NavigationBar.setVisibilityAsync("hidden");
        } catch (e) {}
      }
      if (Platform.OS !== 'web') {
        RNStatusBar.setHidden(true, 'none');
      }
    };

    interactionTask = InteractionManager.runAfterInteractions(() => {
      enableImmersive();
      lockLandscape();
    });

    return () => {
      if (interactionTask) interactionTask.cancel();
      if (hideTimer.current) clearTimeout(hideTimer.current);
      
      // Delay unlock to not block JS thread during unmount
      setTimeout(async () => {
        await unlockOrientation();
        if (Platform.OS === 'android') {
          try {
            await NavigationBar.setVisibilityAsync("visible");
          } catch(e) {}
        }
        if (Platform.OS !== 'web') {
          RNStatusBar.setHidden(false, 'none');
        }
      }, 50);
      
      setIsPlayerOpen(false);
    };
  }, []);

  const showErrorToast = () => {
    setErrorToastVisible(true);
    Animated.spring(errorToastY, {
      toValue: 40,
      useNativeDriver: true,
    }).start();
    Animated.timing(errorToastOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      Animated.timing(errorToastOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setErrorToastVisible(false);
      });
    }, 3000);
  };

  const seekPreviewVal = useRef(0);

  const seekTo = useCallback((ratio: number) => {
    const currentDuration = durationRef.current;
    const target = Math.max(0, Math.min(currentDuration, ratio * currentDuration));
    if (Platform.OS === 'web') {
      webPlayerRef.current?.seek(target);
      setCurrentTime(target);
      return;
    }
    if (!player || !currentDuration) return;
    player.currentTime = target;
  }, [player]);

  const handlePanResponderMove = useCallback((evt: any, gestureState: any) => {
    resetTimer();
    setSeeking(true);
    const newX = Math.max(0, Math.min(seekBarWidth.current, seekStartX.current + gestureState.dx));
    const ratio = newX / seekBarWidth.current;
    const val = ratio * durationRef.current;
    seekPreviewVal.current = val;
    setSeekPreview(val);
  }, []);

  const handlePanResponderRelease = useCallback((evt: any, gestureState: any) => {
    const ratio = seekPreviewVal.current / durationRef.current;
    seekTo(ratio || 0);
    setSeeking(false);
    resetTimer();
  }, [seekTo]);

  const seekBarPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt, gestureState) => {
        const tapX = evt.nativeEvent.locationX;
        seekStartX.current = tapX;
        const currentDuration = durationRef.current;
        const ratio = Math.max(0, Math.min(1, tapX / seekBarWidth.current));
        const val = ratio * currentDuration;
        seekPreviewVal.current = val;
        setSeeking(true);
        setSeekPreview(val);
        resetTimer();
      },
      onPanResponderMove: handlePanResponderMove,
      onPanResponderRelease: handlePanResponderRelease,
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
    if (Platform.OS === 'web') {
       setIsPlaying(!isPlaying);
       return;
    }
    if (!player) return;
    if (isPlaying) { 
      try { player.pause(); } catch(e){}
    } else {
      try { player.play(); } catch(e){}
    }
  };

  const handleSeekBy = (secs: number) => {
    if (Platform.OS === 'web') {
       const target = Math.max(0, Math.min(duration, currentTime + secs));
       webPlayerRef.current?.seek(target);
       setCurrentTime(target);
       return;
    }
    if (!player) return;
    const target = Math.max(0, Math.min(duration, (player.currentTime ?? 0) + secs));
    player.currentTime = target;
  };

  const handlePrevChannel = () => {
    if (playbackQueue.length <= 1) return;
    const prevIdx = (playbackIndex - 1 + playbackQueue.length) % playbackQueue.length;
    setPlaybackIndex(prevIdx);
    const ch = playbackQueue[prevIdx];
    router.setParams({
      id: ch.id,
      streamUrl: ch.streamUrl,
      title: ch.name,
      isLive: 'true',
      current: ch.current || '',
      next: ch.next || '',
      quality: ch.quality || 'HD',
      logo: ch.logo || '',
      category: ch.category || ''
    });
  };

  const handleNextChannel = () => {
    if (playbackQueue.length <= 1) return;
    const nextIdx = (playbackIndex + 1) % playbackQueue.length;
    setPlaybackIndex(nextIdx);
    const ch = playbackQueue[nextIdx];
    router.setParams({
      id: ch.id,
      streamUrl: ch.streamUrl,
      title: ch.name,
      isLive: 'true',
      current: ch.current || '',
      next: ch.next || '',
      quality: ch.quality || 'HD',
      logo: ch.logo || '',
      category: ch.category || ''
    });
  };

  const toggleLiveSync = () => {
    setIsLiveSync(prev => {
       const next = !prev;
       if (next) {
          Alert.alert("Live Sync", "Stream will skip to the absolute latest edge.");
       } else {
          Alert.alert("Resume Mode", "If network buffers, the stream will continue from where it stopped.");
       }
       return next;
    });
    showControlsNow();
  };

  const toggleMute = () => {
    if (Platform.OS === 'web') {
      setIsMuted(!isMuted);
      return;
    }
    if (!player) return;
    const next = !isMuted;
    player.muted = next;
    setIsMuted(next);
  };

  const toggleAspectMode = () => {
    setAspectMode(prev => (prev + 1) % 4);
    showControlsNow();
  };

  const toggleSubtitles = () => {
    if (Platform.OS === 'web') {
      if (webPlayerRef.current && webPlayerRef.current.toggleSubtitle) {
         const res = webPlayerRef.current.toggleSubtitle();
         if (res === false) {
           showGlobalAlert("Subtitles (CC)", "No embedded subtitles found for this stream.", "OK", () => hideGlobalAlert());
         } else if (res === null) {
           showGlobalAlert("Subtitles (CC)", "Off", "OK", () => hideGlobalAlert());
         } else {
           showGlobalAlert("Subtitles (CC)", res, "OK", () => hideGlobalAlert());
         }
      }
      showControlsNow();
      return;
    }
    if (!player) return;
    const tracks = player.availableSubtitleTracks || [];
    if (tracks.length === 0) {
      showGlobalAlert("Subtitles (CC)", "No embedded subtitles found for this stream.", "OK", () => hideGlobalAlert());
      return;
    }
    
    const currentIndex = tracks.findIndex(t => t === player.subtitleTrack);
    const nextIndex = currentIndex + 1;
    
    if (nextIndex >= tracks.length) {
      player.subtitleTrack = null;
      showGlobalAlert("Subtitles (CC)", "Off", "OK", () => hideGlobalAlert());
    } else {
      player.subtitleTrack = tracks[nextIndex];
      showGlobalAlert("Subtitles (CC)", tracks[nextIndex].language || `Track ${nextIndex + 1}`, "OK", () => hideGlobalAlert());
    }
    showControlsNow();
  };

  const handleResume = () => {
    if (player && matchedWatched) {
      player.currentTime = matchedWatched.progress;
      if (Platform.OS !== 'web') {
         player.play();
      } else {
         webPlayerRef.current?.seek(matchedWatched.progress);
         setIsPlaying(true);
      }
    }
    setPromptVisible(false);
    showControlsNow();
  };

  const handleStartOver = () => {
    if (player) {
      player.currentTime = 0;
      if (Platform.OS !== 'web') {
         player.play();
      } else {
         webPlayerRef.current?.seek(0);
         setIsPlaying(true);
      }
    }
    setPromptVisible(false);
    showControlsNow();
  };

  const handlePiP = () => {
    if (videoViewRef.current) {
      try {
        videoViewRef.current.startPictureInPicture();
      } catch (e) {
        console.warn('PiP not supported', e);
      }
    }
  };

  const progress = duration > 0 ? (currentTime / duration) : 0;

  if (!streamUrl) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar hidden />
        <Lineicons icon={QuestionMarkCircleBulk} size={48} color="#E53935" />
        <Text style={styles.errorTitle}>No stream URL provided</Text>
        <TVFocusable style={styles.retryBtn} onPress={() => router.back()}>
          <Text style={styles.retryText}>Go Back</Text>
        </TVFocusable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* ── Layer 1: Video (pointerEvents none so it never eats touches) ── */}
      <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]} pointerEvents="none">
        {Platform.OS === 'web' ? (
          <View style={
            aspectMode === 3 
              ? { height: '100%', aspectRatio: 4/3, backgroundColor: '#000' }
              : [StyleSheet.absoluteFill, { width: '100%', height: '100%' }]
          }>
            <WebVideoPlayer
              key={retryKey}
              ref={webPlayerRef}
              source={proxiedUrl || ''}
              paused={!isPlaying}
              muted={isMuted}
              aspectMode={aspectMode}
              style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
              onProgress={(t: number, d: number) => {
                setCurrentTime(t);
                setDuration(d);
              }}
              onReady={() => {
                setIsBuffering(false);
                setHasError(false);
                retryCount.current = 0; // Reset retry count on success
              }}
              onError={(e: any) => {
                console.error("WebVideoPlayer Error:", e);
                setHasError(true);
                setIsBuffering(false);
                showErrorToast();
                
                if (retryCount.current < 3) {
                  retryCount.current += 1;
                  setTimeout(() => {
                    setHasError(false);
                    setIsBuffering(true);
                    setRetryKey(k => k + 1);
                  }, 2000);
                }
              }}
              onEnd={() => {
                if (playbackQueue.length > 1) {
                  handleNextChannel();
                } else {
                  router.back();
                }
              }}
            />
          </View>
        ) : (
          player && (
            <View style={
              aspectMode === 3 
                ? { height: '100%', aspectRatio: 4/3, backgroundColor: '#000' }
                : [StyleSheet.absoluteFill, { width: '100%', height: '100%' }]
            }>
                <VideoView
                  ref={videoViewRef}
                  player={player}
                  style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
                  nativeControls={false}
                  contentFit={
                    aspectMode === 0 ? "contain" :
                    aspectMode === 1 ? "cover" :
                    "fill"
                  }
                  allowsPictureInPicture={true}
                  startsPictureInPictureAutomatically={true}
                />
            </View>
          )
        )}
      </View>

      {/* ── Layer 2: Buffering spinner ── */}
      {isBuffering && !hasError && (
        <View style={styles.bufferingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#D4A843" />
        </View>
      )}

      {/* ── Layer 3: Background tap area (toggle controls) ── */}
      <TVFocusable disableBorder focusable={false} style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]} onPress={handleBackgroundTap} />

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
            <TVFocusable 
              onPress={() => router.back()} 
              style={({ focused }: any) => [
                styles.iconBtn,
                focused && { transform: [{ scale: 1.1 }], backgroundColor: colors.gold, borderWidth: 3, borderColor: '#FFF' }
              ]}
            >
              {({ focused }: any) => (
                <Lineicons icon={ArrowLeftBulk} size={22} color={focused ? "#0A0A0A" : "#FFF"} />
              )}
            </TVFocusable>

            <View style={styles.titleBlock} pointerEvents="none">
              <Text style={styles.titleText} numberOfLines={1}>{title}</Text>
              
            </View>

            <View style={styles.topActions} pointerEvents="box-none">
              <TVFocusable 
                style={({ focused }: any) => [
                  styles.aspectBtn,
                  focused && { transform: [{ scale: 1.1 }], backgroundColor: colors.gold, borderColor: '#FFF' }
                ]} 
                onPress={toggleAspectMode}
              >
                {({ focused }: any) => (
                  <Text style={[styles.aspectBtnText, focused && { color: '#0A0A0A' }]}>
                    {aspectMode === 0 ? 'FIT' : aspectMode === 1 ? 'FILL' : aspectMode === 2 ? 'STRETCH' : '4:3'}
                  </Text>
                )}
              </TVFocusable>
              <TVFocusable 
                style={({ focused }: any) => [
                  styles.iconBtn,
                  focused && { transform: [{ scale: 1.1 }], backgroundColor: colors.gold, borderWidth: 3, borderColor: '#FFF' }
                ]} 
                onPress={toggleSubtitles}
                focusable={true}
              >
                {({ focused }: any) => (
                  <Lineicons icon={Message2Bulk} size={20} color={focused ? "#0A0A0A" : "#FFF"} />
                )}
              </TVFocusable>

              <TVFocusable 
                style={({ focused }: any) => [
                  styles.iconBtn,
                  focused && { transform: [{ scale: 1.1 }], backgroundColor: colors.gold, borderWidth: 3, borderColor: '#FFF' }
                ]} 
                onPress={handleToggleFavorite}
              >
                {({ focused }: any) => (
                  <Lineicons
                    icon={HeartBulk}
                    size={20}
                    color={focused ? "#0A0A0A" : (isFavorite ? '#E53935' : '#FFF')}
                    fill={isFavorite ? '#E53935' : 'transparent'}
                  />
                )}
              </TVFocusable>
            </View>
          </View>
          {/* Center play controls */}
          <View style={styles.centerRow} pointerEvents="box-none">
            {isLive ? (
              <TVFocusable
                style={({ focused }: any) => [
                  styles.centerBtn, 
                  playbackQueue.length <= 1 && { opacity: 0.3 },
                  focused && { transform: [{ scale: 1.1 }], backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, borderWidth: 3, borderColor: '#FFF' }
                ]}
                onPress={handlePrevChannel}
                disabled={playbackQueue.length <= 1}
              >
                {({ focused }: any) => (
                  <>
                    <Lineicons icon={PreviousStep2Bulk} size={32} color={focused ? colors.gold : "#FFF"} />
                    <Text style={[styles.seekLabel, focused && { color: colors.gold }]}>Prev Channel</Text>
                  </>
                )}
              </TVFocusable>
            ) : (
              <TVFocusable 
                style={({ focused }: any) => [
                  styles.centerBtn,
                  focused && { transform: [{ scale: 1.1 }], backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, borderWidth: 3, borderColor: '#FFF' }
                ]} 
                onPress={() => handleSeekBy(-10)}
                focusable={true}
              >
                {({ focused }: any) => (
                  <>
                    <Lineicons icon={ShiftLeftBulk} size={32} color={focused ? colors.gold : "#FFF"} />
                    <Text style={[styles.seekLabel, focused && { color: colors.gold }]}>10</Text>
                  </>
                )}
              </TVFocusable>
            )}

            <TVFocusable 
              style={({ focused }: any) => [
                styles.playBtn,
                focused && { transform: [{ scale: 1.1 }], backgroundColor: colors.gold, borderWidth: 3, borderColor: '#FFF', shadowColor: colors.gold, shadowOpacity: 0.8, shadowRadius: 10 }
              ]} 
              onPress={togglePlay}
              focusable={true}
              hasTVPreferredFocus={true}
            >
              {({ focused }: any) => (
                <Lineicons icon={isPlaying  ? PauseBulk : PlayBulk} size={38} color={focused ? "#0A0A0A" : "#FFF"} />
              )}
            </TVFocusable>

            {isLive ? (
              <TVFocusable
                style={({ focused }: any) => [
                  styles.centerBtn, 
                  playbackQueue.length <= 1 && { opacity: 0.3 },
                  focused && { transform: [{ scale: 1.1 }], backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, borderWidth: 3, borderColor: '#FFF' }
                ]}
                onPress={handleNextChannel}
                disabled={playbackQueue.length <= 1}
                focusable={true}
              >
                {({ focused }: any) => (
                  <>
                    <Lineicons icon={NextStep2Bulk} size={32} color={focused ? colors.gold : "#FFF"} />
                    <Text style={[styles.seekLabel, focused && { color: colors.gold }]}>Next Channel</Text>
                  </>
                )}
              </TVFocusable>
            ) : (
              <TVFocusable 
                style={({ focused }: any) => [
                  styles.centerBtn,
                  focused && { transform: [{ scale: 1.1 }], backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, borderWidth: 3, borderColor: '#FFF' }
                ]} 
                onPress={() => handleSeekBy(10)}
                focusable={true}
              >
                {({ focused }: any) => (
                  <>
                    <Lineicons icon={ShiftRightBulk} size={32} color={focused ? colors.gold : "#FFF"} />
                    <Text style={[styles.seekLabel, focused && { color: colors.gold }]}>10</Text>
                  </>
                )}
              </TVFocusable>
            )}
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
            <Lineicons icon={Ban2Bulk} size={20} color="#FFF" />
          </View>
          <View style={styles.errorToastTextBlock}>
            <Text style={styles.errorToastTitle}>Connection Issue</Text>
            <Text style={styles.errorToastSub}>Reconnecting...</Text>
          </View>
        </Animated.View>
      )}

      {/* ── Layer 6: Resume Prompt Overlay ── */}
      {promptVisible && (
        <View style={styles.promptOverlay} pointerEvents="auto">
           <Text style={styles.promptTitle}>Resume playback?</Text>
           <Text style={styles.promptSub}>You previously stopped at {formatTime(matchedWatched?.progress || 0)}</Text>
           <View style={styles.promptButtons}>
             <TVFocusable 
               style={({ focused }: any) => [styles.promptBtn, focused && styles.promptBtnFocused]}
               onPress={handleResume}
               hasTVPreferredFocus={true}
               focusable={true}
             >
                {({ focused }: any) => (
                  <Text style={[styles.promptBtnText, focused && styles.promptBtnTextFocused]}>
                    Resume ({formatTime(matchedWatched?.progress || 0)})
                  </Text>
                )}
             </TVFocusable>

             <TVFocusable 
               style={({ focused }: any) => [styles.promptBtn, focused && styles.promptBtnFocused]}
               onPress={handleStartOver}
               focusable={true}
             >
                {({ focused }: any) => (
                  <Text style={[styles.promptBtnText, focused && styles.promptBtnTextFocused]}>
                    Start from beginning
                  </Text>
                )}
             </TVFocusable>
           </View>
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
  promptOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  promptTitle: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  promptSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    marginBottom: 32,
  },
  promptButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  promptBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  promptBtnFocused: {
    backgroundColor: '#D4A843',
    borderColor: '#FFF',
    transform: [{ scale: 1.05 }],
  },
  promptBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  promptBtnTextFocused: {
    color: '#0A0A0A',
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
  aspectBtn: {
    paddingHorizontal: 12, height: 40,
    borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 2, borderColor: 'transparent'
  },
  aspectBtnText: {
    color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 'bold'
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

