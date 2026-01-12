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
}: UseSyncOptions) {
  useEffect(() => {
    let mounted = true;
    let prevVid: string | null = null;
    const timer = setInterval(async () => {
      try {
        const cs = await api.currentSong();
        if (!mounted) return;
        const vid = cs.videoId || null;
        if (vid !== currentVideoIdRef.current) {
          currentVideoIdRef.current = vid;
        }
        setIsPlaying(!cs.isPaused);
        setCurrentTime(Math.max(0, Math.round(cs.elapsedSeconds || 0)));
        setSongDuration(cs.songDuration || 0);
        if (prevVid !== vid) {
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
          if (!mounted) return;
          if (typeof v.state === "number") setVolume(v.state);
          setIsMuted(v.isMuted);
        }
        // 每 2 秒同步一次重複模式、隨機播放和喜歡狀態
        if (queueTickRef.current % 2 === 0) {
          try {
            const repeat = await api.repeatMode.get();
            if (!mounted) return;
            setRepeatMode(repeat);
            const shuffle = await api.shuffle.get();
            if (!mounted) return;
            setIsShuffled(shuffle);
            // 只在有當前歌曲時才獲取喜歡狀態，避免 404 錯誤
            if (vid) {
              try {
                const like = await api.like.get();
                if (!mounted) return;
                setLikeState(like);
              } catch {
                // 靜默處理 404 錯誤
                setLikeState(null);
              }
            }
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
  ]);
}





