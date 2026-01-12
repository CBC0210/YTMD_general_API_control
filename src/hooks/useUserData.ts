import { useState, useCallback } from "react";
import { userStorage } from "../lib/userStorage";
import type { Song } from "../types";

export function useUserData(nickname: string) {
  const [history, setHistory] = useState<Song[]>([]);
  const [likedSongs, setLikedSongs] = useState<Song[]>([]);
  const [reco, setReco] = useState<Song[]>([]);
  const [recoLoading, setRecoLoading] = useState(false);

  const loadUserData = useCallback(() => {
    if (!nickname) {
      setHistory([]);
      setLikedSongs([]);
      setReco([]);
      return;
    }
    try {
      const hist = userStorage.getHistory(nickname);
      const likes = userStorage.getLikes(nickname);
      setHistory((hist || []).map((x: any) => ({
        id: x.videoId,
        videoId: x.videoId,
        title: x.title,
        artist: x.artist,
        duration: x.duration,
        thumbnail: x.thumbnail,
      })));
      setLikedSongs((likes || []).map((x: any) => ({
        id: x.videoId,
        videoId: x.videoId,
        title: x.title,
        artist: x.artist,
        duration: x.duration,
        thumbnail: x.thumbnail,
      })));
      const r = userStorage.getRecommendations(nickname);
      setReco((r || []).map((s: any) => ({
        id: s.videoId,
        videoId: s.videoId,
        title: s.title,
        artist: s.artist,
        duration: s.duration,
        thumbnail: s.thumbnail,
      })));
    } catch {}
  }, [nickname]);

  const addToHistory = useCallback((song: Song) => {
    if (!nickname) return;
    userStorage.addHistory(nickname, {
      videoId: song.videoId || song.id,
      title: song.title,
      artist: song.artist,
      duration: song.duration,
      thumbnail: song.thumbnail,
    });
    loadUserData();
  }, [nickname, loadUserData]);

  const removeFromHistory = useCallback((videoId: string) => {
    if (!nickname) return;
    userStorage.removeHistoryItem(nickname, videoId);
    loadUserData();
  }, [nickname, loadUserData]);

  const clearHistory = useCallback(() => {
    if (!nickname) return;
    userStorage.clearHistory(nickname);
    loadUserData();
  }, [nickname, loadUserData]);

  const toggleLike = useCallback((song: Song) => {
    if (!nickname) return;
    const isLiked = likedSongs.some((likedSong) => (likedSong.videoId || likedSong.id) === (song.videoId || song.id));
    if (isLiked) {
      userStorage.unlikeSong(nickname, song.videoId || song.id);
    } else {
      userStorage.likeSong(nickname, {
        videoId: song.videoId || song.id,
        title: song.title,
        artist: song.artist,
        duration: song.duration,
        thumbnail: song.thumbnail,
      });
    }
    loadUserData();
  }, [nickname, likedSongs, loadUserData]);

  const refreshRecommendations = useCallback(() => {
    if (!nickname) return;
    setRecoLoading(true);
    try {
      const r = userStorage.getRecommendations(nickname);
      setReco((r || []).map((s: any) => ({
        id: s.videoId,
        videoId: s.videoId,
        title: s.title,
        artist: s.artist,
        duration: s.duration,
        thumbnail: s.thumbnail,
      })));
    } catch {}
    setRecoLoading(false);
  }, [nickname]);

  return {
    history,
    setHistory,
    likedSongs,
    setLikedSongs,
    reco,
    setReco,
    recoLoading,
    loadUserData,
    addToHistory,
    removeFromHistory,
    clearHistory,
    toggleLike,
    refreshRecommendations,
  };
}





