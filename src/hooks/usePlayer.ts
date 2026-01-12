import { useState, useRef, useCallback } from "react";
import { api } from "../lib/api";
import type { QueueItem } from "../types";

export function usePlayer(playQueue: QueueItem[]) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [songDuration, setSongDuration] = useState(0);
  const currentVideoIdRef = useRef<string | null>(null);

  const getCurrentSong = useCallback(() => {
    return playQueue.find((song) => song.videoId === currentVideoIdRef.current) || null;
  }, [playQueue]);

  const togglePlayPause = useCallback(async () => {
    try {
      await api.control("toggle-play");
      const cs = await api.currentSong();
      setIsPlaying(!cs.isPaused);
    } catch {}
  }, []);

  const playNext = useCallback(async () => {
    try {
      await api.control("next");
      setCurrentTime(0);
      const cs = await api.currentSong();
      currentVideoIdRef.current = cs.videoId;
      setIsPlaying(!cs.isPaused);
      setSongDuration(cs.songDuration || 0);
    } catch {}
  }, []);

  const playPrevious = useCallback(async () => {
    try {
      await api.control("previous");
      setCurrentTime(0);
      const cs = await api.currentSong();
      currentVideoIdRef.current = cs.videoId;
      setIsPlaying(!cs.isPaused);
      setSongDuration(cs.songDuration || 0);
    } catch {}
  }, []);

  const handleGoBack = useCallback(async () => {
    try {
      await api.goBack(10);
      const cs = await api.currentSong();
      setCurrentTime(Math.max(0, Math.round(cs.elapsedSeconds || 0)));
    } catch {}
  }, []);

  const handleGoForward = useCallback(async () => {
    try {
      await api.goForward(10);
      const cs = await api.currentSong();
      setCurrentTime(Math.max(0, Math.round(cs.elapsedSeconds || 0)));
    } catch {}
  }, []);

  const seek = useCallback(async (seconds: number) => {
    try {
      await api.seek(seconds);
    } catch {}
  }, []);

  return {
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    songDuration,
    setSongDuration,
    currentVideoIdRef,
    getCurrentSong,
    togglePlayPause,
    playNext,
    playPrevious,
    handleGoBack,
    handleGoForward,
    seek,
  };
}





