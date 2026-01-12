import { useState, useCallback } from "react";
import { api } from "../lib/api";
import type { QueueItem } from "../types";

export function useQueue() {
  const [playQueue, setPlayQueue] = useState<QueueItem[]>([]);

  const refreshQueue = useCallback(async () => {
    try {
      const q = await api.queue();
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
  }, []);

  const addToQueue = useCallback(async (
    song: { videoId: string; title?: string; artist?: string; duration?: string; thumbnail?: string },
    nickname?: string,
    insertPosition?: 'INSERT_AT_END' | 'INSERT_AFTER_CURRENT_VIDEO'
  ) => {
    try {
      await api.enqueue(song, nickname, insertPosition);
      await refreshQueue();
    } catch {}
  }, [refreshQueue]);

  const removeFromQueue = useCallback(async (songId: string) => {
    const idx = Number((songId.split('-').pop() as string) || '0');
    try {
      await api.queueDelete(idx);
      await refreshQueue();
    } catch {}
  }, [refreshQueue]);

  const moveSongInQueue = useCallback(async (song: QueueItem, direction: 'up' | 'down') => {
    try {
      const currentIndex = song.queuePosition;
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      
      if (targetIndex < 0 || targetIndex >= playQueue.length) return;
      
      await api.moveSongInQueue(currentIndex, targetIndex);
      await refreshQueue();
    } catch {}
  }, [playQueue.length, refreshQueue]);

  const clearQueue = useCallback(async (currentVideoId: string | null) => {
    try {
      const q = await api.queue();
      const targets = q
        .filter((it) => it.videoId !== currentVideoId)
        .map((it) => it.index)
        .sort((a, b) => b - a);
      
      for (const idx of targets) {
        try {
          await api.queueDelete(idx);
        } catch {}
      }
      await refreshQueue();
    } catch {}
  }, [refreshQueue]);

  const jumpToQueueItem = useCallback(async (song: QueueItem) => {
    try {
      await api.setQueueIndex(song.queuePosition);
      await api.control('play');
      await refreshQueue();
    } catch {}
  }, [refreshQueue]);

  return {
    playQueue,
    setPlayQueue,
    refreshQueue,
    addToQueue,
    removeFromQueue,
    moveSongInQueue,
    clearQueue,
    jumpToQueueItem,
  };
}





