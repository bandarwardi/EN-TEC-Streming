import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Hls from 'hls.js';

export interface WebVideoPlayerRef {
  seek: (time: number) => void;
  toggleSubtitle: () => string | null | false;
}

interface WebVideoPlayerProps {
  source: string;
  aspectMode?: number;
  style?: any;
  onProgress?: (time: number, duration: number) => void;
  onEnd?: () => void;
  paused?: boolean;
  muted?: boolean;
  onReady?: () => void;
  onError?: (e: any) => void;
  controls?: boolean;
}

export const WebVideoPlayer = forwardRef<WebVideoPlayerRef, WebVideoPlayerProps>(
  ({ source, style, onProgress, onEnd, aspectMode = 0, paused = false, muted = false, controls = false, onReady, onError }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);

    useImperativeHandle(ref, () => ({
      seek: (time: number) => {
        if (videoRef.current) {
          videoRef.current.currentTime = time;
        }
      },
      toggleSubtitle: () => {
        const hls = hlsRef.current;
        if (hls && hls.subtitleTracks.length > 0) {
          const tracks = hls.subtitleTracks;
          const current = hls.subtitleTrack;
          const next = current + 1;
          if (next >= tracks.length) {
            hls.subtitleTrack = -1; // off
            return null;
          } else {
            hls.subtitleTrack = next;
            return tracks[next].name || `Track ${next + 1}`;
          }
        }
        return false; // No tracks
      }
    }));

    useEffect(() => {
      if (Platform.OS !== 'web' || !videoRef.current || !source) return;

      const video = videoRef.current;
      
      const handleTimeUpdate = () => {
        if (onProgress) {
          onProgress(video.currentTime, video.duration);
        }
      };

      const handleEnded = () => {
        if (onEnd) onEnd();
      };

      const handleError = (e: any) => {
        const err = video.error;
        if (onError) {
          if (err) {
            onError({ type: 'html5', code: err.code, message: err.message });
          } else {
            onError(e);
          }
        }
      };

      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('ended', handleEnded);
      video.addEventListener('error', handleError);

      let hls: Hls | null = null;
      let hlsRetryCount = 0;
      let retryTimeout: ReturnType<typeof setTimeout>;

      const loadHls = () => {
        if (hls) {
          hls.destroy();
        }
        hls = new Hls({
          debug: false,
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 30,
          maxBufferLength: 2,
          maxMaxBufferLength: 8,
          liveSyncDurationCount: 1,
          liveMaxLatencyDurationCount: 2,
          startFragPrefetch: true,
          testBandwidth: false,
        });
        hlsRef.current = hls;

        hls.loadSource(source);
        hls.attachMedia(video);
        
        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            console.log('HLS fatal error:', data);
            if (hlsRetryCount < 3) {
              hlsRetryCount++;
              const delay = [3000, 5000, 8000][hlsRetryCount - 1];
              console.log(`Hls.js fatal error, retrying in ${delay}ms...`);
              retryTimeout = setTimeout(() => {
                 loadHls();
              }, delay);
            } else {
              if (onError) onError(data);
            }
          }
        });

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          hlsRetryCount = 0; // reset on success
          if (!paused) {
            video.play().catch(e => {
              console.log('Autoplay prevented, trying muted autoplay', e);
              video.muted = true;
              video.play().catch(e2 => console.log('Muted autoplay also prevented', e2));
            });
          }
        });
      };

      const isVOD = source.toLowerCase().includes('.mp4') || source.toLowerCase().includes('.mkv') || source.toLowerCase().includes('.avi');
      if (Hls.isSupported() && !isVOD && (source.includes('.m3u8') || source.includes('mpegurl') || source.includes('/proxy'))) {
        loadHls();
      } else {
        video.src = source;
        video.addEventListener('loadedmetadata', () => {
          if (!paused) {
            video.play().catch(e => {
              console.log('Autoplay prevented, trying muted autoplay', e);
              video.muted = true;
              video.play().catch(e2 => console.log('Muted autoplay also prevented', e2));
            });
          }
        });
      }

      const handlePlaying = () => {
        if (onReady) onReady();
      };
      video.addEventListener('playing', handlePlaying);

      return () => {
        if (retryTimeout) clearTimeout(retryTimeout);
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('ended', handleEnded);
        video.removeEventListener('playing', handlePlaying);
        video.removeEventListener('error', handleError);
        video.pause();
        video.removeAttribute('src');
        video.load();
        if (hls) {
          hls.destroy();
        }
      };
    }, [source]);

    useEffect(() => {
      if (Platform.OS !== 'web' || !videoRef.current) return;
      const video = videoRef.current;
      if (paused) {
        video.pause();
      } else {
        video.play().catch(e => {
          console.log('Autoplay prevented, trying muted autoplay', e);
          video.muted = true;
          video.play().catch(e2 => console.log('Muted autoplay also prevented', e2));
        });
      }
    }, [paused]);

    if (Platform.OS !== 'web') return null;

    return (
      <View style={style}>
        <video
          ref={videoRef}
          style={{
            width: '100%',
            height: '100%',
            objectFit: aspectMode === 0 ? 'contain' : aspectMode === 1 ? 'cover' : 'fill'
          }}
          controls={controls}
          playsInline
          muted={muted}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
