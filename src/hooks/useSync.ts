import { useEffect, useRef } from "react";
import { api } from "../lib/api";
import type { QueueItem } from "../types";

interface UseSyncOptions {
  playQueue: QueueItem[];
  setPlayQueue: (queue: QueueItem[]) => void;
  currentVideoIdRef: React.MutableRefObject<string | null>;
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setSongDuration: (duration: number) => void;
  volume: number;
  setVolume: (volume: number) => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  setRepeatMode: (mode: 'NONE' | 'ALL' | 'ONE' | null) => void;
  setIsShuffled: (shuffled: boolean) => void;
  setLikeState: (state: 'LIKE' | 'DISLIKE' | 'INDIFFERENT' | null) => void;
  lastVolChangeAt: React.MutableRefObject<number>;
  queueTickRef: React.MutableRefObject<number>;
  lastSyncTimeRef?: React.MutableRefObject<number>;
  syncTimeFromServer?: () => Promise<void>;
  nickname?: string; // 添加 nickname 用於從 localStorage 獲取點贊狀態
  likedSongs?: any[]; // 添加 likedSongs 用於檢查點贊狀態
}

export function useSync({
  playQueue,
  setPlayQueue,
  currentVideoIdRef,
  setIsPlaying,
  setCurrentTime,
  setSongDuration,
  volume,
  setVolume,
  isMuted,
  setIsMuted,
  setRepeatMode,
  setIsShuffled,
  setLikeState,
  lastVolChangeAt,
  queueTickRef,
  lastSyncTimeRef,
  syncTimeFromServer,
  nickname,
  likedSongs,
}: UseSyncOptions) {
  useEffect(() => {
    let mounted = true;
    let prevVid: string | null = null;
    const timer = setInterval(async () => {
      try {
        const cs = await api.currentSong();
        if (!mounted) return;
        
        // console.log('[SYNC DEBUG] currentSong result:', cs);
        // console.log('[SYNC DEBUG] elapsedSeconds:', cs.elapsedSeconds, 'songDuration:', cs.songDuration);
        
        const vid = cs.videoId || null;
        const isPaused = cs.isPaused ?? true;
        
        // 更新播放狀態
        setIsPlaying(!isPaused);
        
        // 更新歌曲長度
        const duration = cs.songDuration || 0;
        // console.log('[SYNC DEBUG] Setting songDuration to:', duration);
        setSongDuration(duration);
        
        // 檢查歌曲是否切換
        const songChanged = prevVid !== vid;
        // console.log('[SYNC DEBUG] songChanged:', songChanged, 'prevVid:', prevVid, 'currentVid:', vid);
        
        if (vid !== currentVideoIdRef.current) {
          currentVideoIdRef.current = vid;
        }
        
        // 只在歌曲切換時同步時間，或者如果用戶最近沒有互動（超過 5 秒）才同步
        const timeSinceLastSync = lastSyncTimeRef ? Date.now() - lastSyncTimeRef.current : Infinity;
        const shouldSyncTime = songChanged || 
          (lastSyncTimeRef && timeSinceLastSync > 5000);
        
        // console.log('[SYNC DEBUG] shouldSyncTime:', shouldSyncTime, 'timeSinceLastSync:', timeSinceLastSync, 'songChanged:', songChanged);
        // console.log('[SYNC DEBUG] API elapsedSeconds:', cs.elapsedSeconds, 'type:', typeof cs.elapsedSeconds);
        // console.log('[SYNC DEBUG] isPaused:', isPaused);
        
        if (shouldSyncTime) {
          const serverTime = Math.max(0, Math.round(cs.elapsedSeconds || 0));
          
          // 歌曲切換時必須同步（即使 API 返回 0，因為可能是新歌曲剛開始）
          if (songChanged) {
            // console.log('[SYNC DEBUG] Song changed, syncing time to:', serverTime);
            setCurrentTime(serverTime);
            if (lastSyncTimeRef) {
              lastSyncTimeRef.current = Date.now();
            }
          } 
          // 如果 API 返回有效時間（> 0），同步
          else if (serverTime > 0) {
            // console.log('[SYNC DEBUG] API returned valid time, syncing to:', serverTime);
            setCurrentTime(serverTime);
            if (lastSyncTimeRef) {
              lastSyncTimeRef.current = Date.now();
            }
          }
          // 如果歌曲在播放但 API 返回 0，這是 YTMD API 的已知限制
          // 完全依賴前端計時器，不更新 currentTime
          else if (!isPaused && !songChanged) {
            // console.log('[SYNC DEBUG] Song playing but API returned 0 (YTMD API limitation). Keeping frontend timer value.');
            // 不更新 currentTime，完全依賴前端計時器
            // 但更新 lastSyncTimeRef，避免頻繁檢查
            if (lastSyncTimeRef) {
              lastSyncTimeRef.current = Date.now();
            }
          }
          // 如果暫停且 API 返回 0，同步（可能是剛開始或重置）
          else if (isPaused) {
            // console.log('[SYNC DEBUG] Song paused, syncing time to:', serverTime);
            setCurrentTime(serverTime);
            if (lastSyncTimeRef) {
              lastSyncTimeRef.current = Date.now();
            }
          }
        } else {
          // console.log('[SYNC DEBUG] Not syncing time (user recently interacted or song not changed)');
        }
        
        if (songChanged) {
          prevVid = vid;
          // 歌曲切換時刷新佇列
          const q = await api.queue();
          if (!mounted) return;
          setPlayQueue(
            q.map((it) => ({
              id: `${it.videoId}-${it.index}`,
              title: it.title,
              artist: it.artist,
              duration: it.duration,
              videoId: it.videoId,
              thumbnail: it.thumbnail,
              status: "queued",
              queuePosition: it.index,
            })) as QueueItem[],
          );
          
          // 歌曲切換時，從用戶設定（localStorage）更新點贊狀態
          if (nickname && vid && likedSongs) {
            const isLiked = likedSongs.some((likedSong) => (likedSong.videoId || likedSong.id) === vid);
            // console.log('[SYNC DEBUG] Song changed, updating likeState from localStorage:', isLiked ? 'LIKE' : 'INDIFFERENT');
            setLikeState(isLiked ? 'LIKE' : 'INDIFFERENT');
          } else if (!nickname) {
            setLikeState(null);
          }
        }
        // 每 4 秒同步一次佇列（即使歌曲未變更），避免多人操作時不同步
        queueTickRef.current = (queueTickRef.current + 1) % 4;
        if (queueTickRef.current === 0) {
          try {
            const q = await api.queue();
            if (!mounted) return;
            setPlayQueue(
              q.map((it) => ({
                id: `${it.videoId}-${it.index}`,
                title: it.title,
                artist: it.artist,
                duration: it.duration,
                videoId: it.videoId,
                thumbnail: it.thumbnail,
                status: "queued",
                queuePosition: it.index,
              })) as QueueItem[],
            );
          } catch {}
        }
        // 音量：若 700ms 內沒有本地調整，才拉取伺服器值
        if (Date.now() - lastVolChangeAt.current > 700) {
          const v = await api.volume.get();
          // console.log('[SYNC DEBUG] Volume sync:', v, 'current local volume:', volume);
          if (!mounted) return;
          // 只有在音量值合理（0-100）時才更新
          if (typeof v.state === "number" && v.state >= 0 && v.state <= 100) {
            // 如果 API 返回 0 但沒有靜音，且當前本地音量不是 0，可能是 API 問題
            // 在這種情況下，不更新音量，保持當前值
            if (v.state === 0 && !v.isMuted && volume > 0) {
              // console.warn('[SYNC DEBUG] API returned volume 0 but not muted, and local volume is', volume, '- likely API issue, keeping local volume');
              // 只更新靜音狀態，不更新音量值
              setIsMuted(v.isMuted);
            } else {
              // 正常情況：API 返回有效值，或者本地音量也是 0，更新
              // console.log('[SYNC DEBUG] Setting volume to:', v.state, 'isMuted:', v.isMuted);
              setVolume(v.state);
              setIsMuted(v.isMuted);
            }
          } else {
            // console.warn('[SYNC DEBUG] Invalid volume value from API:', v.state, 'skipping update');
          }
        } else {
          // console.log('[SYNC DEBUG] Skipping volume sync (user recently adjusted)');
        }
        // 每 2 秒同步一次重複模式、隨機播放
        // 注意：喜歡狀態不再從 API 同步，而是從用戶設定（localStorage）獲取
        if (queueTickRef.current % 2 === 0) {
          try {
            const repeat = await api.repeatMode.get();
            if (!mounted) return;
            setRepeatMode(repeat);
            const shuffle = await api.shuffle.get();
            if (!mounted) return;
            setIsShuffled(shuffle);
            // 喜歡狀態不再從 API 同步，改為在歌曲切換時從 localStorage 更新
          } catch {}
        }
      } catch {}
    }, 1000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [
    currentVideoIdRef,
    setIsPlaying,
    setCurrentTime,
    setSongDuration,
    setPlayQueue,
    queueTickRef,
    lastVolChangeAt,
    setVolume,
    setIsMuted,
    setRepeatMode,
    setIsShuffled,
    setLikeState,
    lastSyncTimeRef,
    nickname,
    likedSongs,
  ]);
}





