import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Hls from 'hls.js';
import { getHlsUrl } from './getHlsurl';

const formatTime = (seconds) => {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function HlsVideoPlayer({ src, videoId, className, onContextMenu, onEnded, autoPlay, preload, controls, ...rest }) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const hideControlsTimeoutRef = useRef(null);

  const [levels, setLevels] = useState([]);
  const [currentLevel, setCurrentLevel] = useState(-1);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [usingHls, setUsingHls] = useState(false);

  const [isInWatchLater, setIsInWatchLater] = useState(false);
  const [watchLaterLoading, setWatchLaterLoading] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    const hlsUrl = getHlsUrl(src);
    setLevels([]);
    setCurrentLevel(-1);
    setSettingsOpen(false);

    if (Hls.isSupported()) {
      setUsingHls(true);
      const hls = new Hls();
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        const seen = new Set();
        const availableLevels = data.levels
          .map((level, index) => ({ index, height: level.height }))
          .filter((level) => {
            if (seen.has(level.height)) return false;
            seen.add(level.height);
            return true;
          })
          .sort((a, b) => b.height - a.height);
        setLevels(availableLevels);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.error('HLS playback failed, falling back to direct file:', data);
          hls.destroy();
          setUsingHls(false);
          video.src = src;
        }
      });

      hls.loadSource(hlsUrl);
      hls.attachMedia(video);

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl') === 'probably') {
      setUsingHls(false);
      video.src = hlsUrl;
    } else {
      setUsingHls(false);
      video.src = src;
    }
  }, [src]);

  // Check whether this video is already in the user's Watch Later list,
  // so the menu label reflects real state rather than always starting fresh.
  useEffect(() => {
    if (!videoId) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    const checkWatchLater = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/v1/users/watch-later`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const list = res.data.data || [];
        setIsInWatchLater(list.some((v) => v._id === videoId));
      } catch (err) {
        console.error('Failed to check Watch Later status:', err);
      }
    };

    checkWatchLater();
  }, [videoId]);

  const toggleWatchLater = async () => {
    if (!videoId || watchLaterLoading) return;
    setWatchLaterLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${API_BASE}/api/v1/users/watch-later/${videoId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsInWatchLater(res.data.data.isInWatchLater);
    } catch (err) {
      console.error('Failed to toggle Watch Later:', err);
    } finally {
      setWatchLaterLoading(false);
    }
  };

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play();
    else video.pause();
  }, []);

  const skip = useCallback((seconds) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(Math.max(video.currentTime + seconds, 0), video.duration || Infinity);
  }, []);

  const changeVolume = useCallback((delta) => {
    const video = videoRef.current;
    if (!video) return;
    const next = Math.min(Math.max(video.volume + delta, 0), 1);
    video.volume = next;
    video.muted = false;
    setVolume(next);
    setIsMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'arrowright':
        case 'l':
          e.preventDefault();
          skip(5);
          break;
        case 'arrowleft':
        case 'j':
          e.preventDefault();
          skip(-5);
          break;
        case 'arrowup':
          e.preventDefault();
          changeVolume(0.05);
          break;
        case 'arrowdown':
          e.preventDefault();
          changeVolume(-0.05);
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, skip, changeVolume, toggleFullscreen, toggleMute]);

  const showControlsTemporarily = useCallback(() => {
    setControlsVisible(true);
    clearTimeout(hideControlsTimeoutRef.current);
    if (isPlaying) {
      hideControlsTimeoutRef.current = setTimeout(() => setControlsVisible(false), 2500);
    }
  }, [isPlaying]);

  useEffect(() => {
    return () => clearTimeout(hideControlsTimeoutRef.current);
  }, []);

  const handleSelectQuality = (levelIndex) => {
    if (hlsRef.current) hlsRef.current.currentLevel = levelIndex;
    setCurrentLevel(levelIndex);
  };

  const currentQualityLabel =
    currentLevel === -1 ? 'Auto' : `${levels.find((l) => l.index === currentLevel)?.height}p`;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black group"
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => isPlaying && setControlsVisible(false)}
    >
      <video
        ref={videoRef}
        className={className}
        autoPlay={autoPlay}
        preload={preload}
        onContextMenu={onContextMenu}
        onClick={togglePlay}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onEnded={(e) => {
          setIsPlaying(false);
          onEnded?.(e);
        }}
        {...rest}
      />

      {/* Custom control bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-4 pt-10 pb-3 transition-opacity duration-300 ${
          controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={(e) => {
            const video = videoRef.current;
            if (video) video.currentTime = Number(e.target.value);
          }}
          className="w-full h-1 accent-primary cursor-pointer"
        />

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3">
            <button onClick={togglePlay} className="text-white hover:text-primary transition-colors" title={isPlaying ? 'Pause (space)' : 'Play (space)'}>
              {isPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
              )}
            </button>

            <button onClick={() => skip(-5)} className="text-white hover:text-primary transition-colors" title="Back 5s (←)">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7M4 12h13a4 4 0 100-8" /></svg>
            </button>

            <button onClick={() => skip(5)} className="text-white hover:text-primary transition-colors" title="Forward 5s (→)">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M20 12H7a4 4 0 110-8" /></svg>
            </button>

            <button onClick={toggleMute} className="text-white hover:text-primary transition-colors" title="Mute (m)">
              {isMuted || volume === 0 ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5L6 9H3v6h3l5 4V5zM23 9l-6 6M17 9l6 6" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5L6 9H3v6h3l5 4V5zM15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13" /></svg>
              )}
            </button>

            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                const video = videoRef.current;
                const next = Number(e.target.value);
                if (video) { video.volume = next; video.muted = false; }
                setVolume(next);
                setIsMuted(false);
              }}
              className="w-16 h-1 accent-primary cursor-pointer hidden sm:block"
            />

            <span className="text-xs text-white/90 font-medium whitespace-nowrap">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-3 relative">
            {/* Merged settings menu: quality + Add to Playlist + Watch Later */}
            <div className="relative">
              {settingsOpen && (
                <div className="absolute bottom-8 right-0 mb-1 bg-black/90 rounded-lg overflow-hidden text-sm min-w-[180px] shadow-lg">
                  {usingHls && levels.length > 0 && (
                    <>
                      <p className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-wide text-white/50">Quality</p>
                      <button
                        onClick={() => handleSelectQuality(-1)}
                        className={`block w-full text-left px-4 py-2 hover:bg-white/10 transition-colors ${currentLevel === -1 ? 'text-primary font-semibold' : 'text-white'}`}
                      >
                        Auto
                      </button>
                      {levels.map((level) => (
                        <button
                          key={level.index}
                          onClick={() => handleSelectQuality(level.index)}
                          className={`block w-full text-left px-4 py-2 hover:bg-white/10 transition-colors ${currentLevel === level.index ? 'text-primary font-semibold' : 'text-white'}`}
                        >
                          {level.height}p
                        </button>
                      ))}
                      <div className="h-px bg-white/10 my-1" />
                    </>
                  )}

                  {videoId && (
                    <Link
                      to={`/add-to-playlist/${videoId}`}
                      onClick={() => setSettingsOpen(false)}
                      className="block px-4 py-2 text-white hover:bg-white/10 transition-colors"
                    >
                      Add to Playlist
                    </Link>
                  )}

                  <button
                    onClick={toggleWatchLater}
                    disabled={watchLaterLoading}
                    className="block w-full text-left px-4 py-2 text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                  >
                    {isInWatchLater ? 'Remove from Watch Later' : 'Watch Later'}
                  </button>
                </div>
              )}

              <button
                onClick={() => setSettingsOpen((prev) => !prev)}
                className="text-white hover:text-primary transition-colors flex items-center gap-1 text-xs"
                title="Settings"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
                {currentQualityLabel}
              </button>
            </div>

            <button onClick={toggleFullscreen} className="text-white hover:text-primary transition-colors" title="Fullscreen (f)">
              {isFullscreen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" /></svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}