import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Hls from 'hls.js';

export interface WebVideoPlayerRef {
  seek: (time: number) => void;
  toggleSubtitle: () => string | null | false;
  requestFullscreen: () => void;
  exitFullscreen: () => void;
  togglePiP: () => Promise<void>;
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
  onFullscreenExit?: () => void;
}

export const WebVideoPlayer = forwardRef<WebVideoPlayerRef, WebVideoPlayerProps>(
  ({ source, style, onProgress, onEnd, aspectMode = 0, paused = false, muted = false, controls = false, onReady, onError, onFullscreenExit }, ref) => {
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
      },
      requestFullscreen: () => {
        if (videoRef.current) {
          const v = videoRef.current as any;
          if (v.requestFullscreen) v.requestFullscreen();
          else if (v.webkitRequestFullscreen) v.webkitRequestFullscreen();
          else if (v.mozRequestFullScreen) v.mozRequestFullScreen();
          else if (v.msRequestFullscreen) v.msRequestFullscreen();
        }
      },
      exitFullscreen: () => {
        const d = document as any;
        if (d.exitFullscreen) d.exitFullscreen();
        else if (d.webkitExitFullscreen) d.webkitExitFullscreen();
        else if (d.mozCancelFullScreen) d.mozCancelFullScreen();
        else if (d.msExitFullscreen) d.msExitFullscreen();
      },
      togglePiP: async () => {
        if (videoRef.current) {
          if (document.pictureInPictureElement) {
            await document.exitPictureInPicture().catch(e => console.log('PiP exit error:', e));
          } else {
            await (videoRef.current as HTMLVideoElement).requestPictureInPicture().catch(e => console.log('PiP request error:', e));
          }
        }
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
          maxBufferLength: 10,
          maxMaxBufferLength: 20,
          maxBufferSize: 10 * 1000 * 1000,
          liveSyncDurationCount: 2,
          liveMaxLatencyDurationCount: 5,
          startFragPrefetch: true,
          startLevel: -1,
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

      const handleFullscreenChange = () => {
        const isFs = document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).mozFullScreenElement || (document as any).msFullscreenElement;
        if (!isFs && onFullscreenExit) {
          onFullscreenExit();
        }
      };
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.addEventListener('mozfullscreenchange', handleFullscreenChange);
      document.addEventListener('MSFullscreenChange', handleFullscreenChange);

      return () => {
        if (retryTimeout) clearTimeout(retryTimeout);
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('ended', handleEnded);
        video.removeEventListener('playing', handlePlaying);
        video.removeEventListener('error', handleError);
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
        document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
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
            objectFit: aspectMode === 0 ? 'contain' : aspectMode === 1 ? 'fill' : aspectMode === 2 ? 'cover' : aspectMode === 3 ? 'fill' : 'contain',
            transform: aspectMode === 3 ? 'scaleX(1.33)' : aspectMode === 4 ? 'scaleX(0.75)' : 'none'
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
