import { useState, useRef, useCallback, useEffect } from "react";
import { api } from "../lib/api";
import type { QueueItem } from "../types";

export function usePlayer(playQueue: QueueItem[]) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [songDuration, setSongDuration] = useState(0);
  const currentVideoIdRef = useRef<string | null>(null);
  const progressTimerRef = useRef<number | null>(null);
  const lastSyncTimeRef = useRef<number>(0);

  const getCurrentSong = useCallback(() => {
    return playQueue.find((song) => song.videoId === currentVideoIdRef.current) || null;
  }, [playQueue]);

  // 前端計時器：當播放時自動更新進度
  useEffect(() => {
    // 清除舊的計時器
    if (progressTimerRef.current !== null) {
      // console.log('[PLAYER DEBUG] Clearing existing timer');
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    
    if (isPlaying && songDuration > 0) {
      // console.log('[PLAYER DEBUG] Starting progress timer, songDuration:', songDuration, 'isPlaying:', isPlaying);
      
      progressTimerRef.current = window.setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 1;
          // 如果超過歌曲長度，停止計時器（等待歌曲切換）
          if (next >= songDuration) {
            // console.log('[PLAYER DEBUG] Reached song duration, stopping timer at:', songDuration);
            if (progressTimerRef.current !== null) {
              clearInterval(progressTimerRef.current);
              progressTimerRef.current = null;
            }
            return songDuration;
          }
          // 每 5 秒記錄一次，方便調試
          if (next % 5 === 0) {
            // console.log('[PLAYER DEBUG] Progress timer tick, currentTime:', next, '/', songDuration);
          }
          return next;
        });
      }, 1000);
      
      // 確認計時器已設置
      if (progressTimerRef.current !== null) {
        // console.log('[PLAYER DEBUG] Timer started successfully, ID:', progressTimerRef.current);
      } else {
        // console.error('[PLAYER DEBUG] Failed to start timer!');
      }
    } else {
      // console.log('[PLAYER DEBUG] Not starting timer - isPlaying:', isPlaying, 'songDuration:', songDuration);
    }
    
    return () => {
      if (progressTimerRef.current !== null) {
        // console.log('[PLAYER DEBUG] Cleaning up timer on unmount/change');
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };
  }, [isPlaying, songDuration]); // 注意：不包含 currentTime，避免計時器不斷重啟

  // 同步服務器時間（用於互動後同步）
  const syncTimeFromServer = useCallback(async () => {
    try {
      // console.log('[PLAYER DEBUG] syncTimeFromServer called');
      const cs = await api.currentSong();
      // console.log('[PLAYER DEBUG] currentSong result:', cs);
      const serverTime = Math.max(0, Math.round(cs.elapsedSeconds || 0));
      // console.log('[PLAYER DEBUG] Setting currentTime to:', serverTime);
      setCurrentTime(serverTime);
      lastSyncTimeRef.current = Date.now();
    } catch (error) {
      // console.error('[PLAYER DEBUG] syncTimeFromServer error:', error);
    }
  }, []);

  const togglePlayPause = useCallback(async () => {
    try {
      await api.control("toggle-play");
      const cs = await api.currentSong();
      const newIsPlaying = !cs.isPaused;
      setIsPlaying(newIsPlaying);
      
      // 只有在 API 返回有效時間（> 0）時才同步，否則保持前端計時器的值
      const serverTime = Math.max(0, Math.round(cs.elapsedSeconds || 0));
      if (serverTime > 0 || !newIsPlaying) {
        // 如果暫停，同步時間；如果播放且 API 返回有效時間，也同步
        // console.log('[PLAYER DEBUG] togglePlayPause: syncing time to', serverTime);
        setCurrentTime(serverTime);
        lastSyncTimeRef.current = Date.now();
      } else {
        // 如果播放但 API 返回 0，可能是 API 問題，不覆蓋前端計時器
        // console.log('[PLAYER DEBUG] togglePlayPause: API returned 0, keeping frontend timer value');
        lastSyncTimeRef.current = Date.now();
      }
    } catch {}
  }, []);

  const playNext = useCallback(async () => {
    try {
      await api.control("next");
      const cs = await api.currentSong();
      currentVideoIdRef.current = cs.videoId;
      setIsPlaying(!cs.isPaused);
      setCurrentTime(Math.max(0, Math.round(cs.elapsedSeconds || 0)));
      setSongDuration(cs.songDuration || 0);
      lastSyncTimeRef.current = Date.now();
    } catch {}
  }, []);

  const playPrevious = useCallback(async () => {
    try {
      await api.control("previous");
      const cs = await api.currentSong();
      currentVideoIdRef.current = cs.videoId;
      setIsPlaying(!cs.isPaused);
      setCurrentTime(Math.max(0, Math.round(cs.elapsedSeconds || 0)));
      setSongDuration(cs.songDuration || 0);
      lastSyncTimeRef.current = Date.now();
    } catch {}
  }, []);

  const handleGoBack = useCallback(async () => {
    try {
      await api.goBack(10);
      // 嘗試獲取當前時間，如果 API 返回有效值就使用
      try {
        const cs = await api.currentSong();
        const newTime = Math.max(0, Math.round(cs.elapsedSeconds || 0));
        // 如果 API 返回有效值（> 0 或接近預期值），使用它
        if (newTime > 0) {
          // console.log('[PLAYER DEBUG] goBack: API returned time:', newTime);
          setCurrentTime(newTime);
        } else {
          // 如果 API 返回 0，使用當前時間減 10 秒
          // console.log('[PLAYER DEBUG] goBack: API returned 0, using currentTime - 10');
          setCurrentTime((prev) => Math.max(0, prev - 10));
        }
      } catch {
        // 如果獲取失敗，使用當前時間減 10 秒
        setCurrentTime((prev) => Math.max(0, prev - 10));
      }
      lastSyncTimeRef.current = Date.now();
    } catch {}
  }, []);

  const handleGoForward = useCallback(async () => {
    try {
      await api.goForward(10);
      // 嘗試獲取當前時間，如果 API 返回有效值就使用
      try {
        const cs = await api.currentSong();
        const newTime = Math.max(0, Math.round(cs.elapsedSeconds || 0));
        // 如果 API 返回有效值（> 0 或接近預期值），使用它
        if (newTime > 0) {
          // console.log('[PLAYER DEBUG] goForward: API returned time:', newTime);
          setCurrentTime(newTime);
        } else {
          // 如果 API 返回 0，使用當前時間加 10 秒
          // console.log('[PLAYER DEBUG] goForward: API returned 0, using currentTime + 10');
          setCurrentTime((prev) => Math.min(songDuration, prev + 10));
        }
      } catch {
        // 如果獲取失敗，使用當前時間加 10 秒
        setCurrentTime((prev) => Math.min(songDuration, prev + 10));
      }
      lastSyncTimeRef.current = Date.now();
    } catch {}
  }, [songDuration]);

  const seek = useCallback(async (seconds: number) => {
    try {
      // seek 現在會返回實際設置的時間
      const actualTime = await api.seek(seconds);
      // console.log('[PLAYER DEBUG] Seek result, setting currentTime to:', actualTime);
      setCurrentTime(actualTime);
      lastSyncTimeRef.current = Date.now();
    } catch (error) {
      // console.error('[PLAYER DEBUG] Seek error:', error);
      // 即使出錯，也更新本地時間
      setCurrentTime(seconds);
      lastSyncTimeRef.current = Date.now();
    }
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
    syncTimeFromServer,
    lastSyncTimeRef,
  };
}





