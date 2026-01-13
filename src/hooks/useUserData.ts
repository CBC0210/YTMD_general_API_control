import { useState, useCallback, useEffect } from "react";
import { userStorage } from "../lib/userStorage";
import { api } from "../lib/api";
import { parseSearchResponse } from "../features/search/searchService";
import type { Song } from "../types";

export function useUserData(nickname: string) {
  const [history, setHistory] = useState<Song[]>([]);
  const [likedSongs, setLikedSongs] = useState<Song[]>([]);
  const [reco, setReco] = useState<Song[]>([]);
  const [recoLoading, setRecoLoading] = useState(false);

  const loadUserData = useCallback(async () => {
    if (!nickname || !nickname.trim()) {
      console.log('[USER DATA] No nickname provided, clearing user data');
      setHistory([]);
      setLikedSongs([]);
      setReco([]);
      return;
    }
    try {
      console.log(`[USER DATA] Loading data for user: "${nickname}"`);
      const [hist, likes] = await Promise.all([
        userStorage.getHistory(nickname),
        userStorage.getLikes(nickname),
      ]);
      const historyMapped = (hist || []).map((x: any) => ({
        id: x.videoId,
        videoId: x.videoId,
        title: x.title,
        artist: x.artist,
        duration: x.duration,
        thumbnail: x.thumbnail,
      }));
      const likesMapped = (likes || []).map((x: any) => ({
        id: x.videoId,
        videoId: x.videoId,
        title: x.title,
        artist: x.artist,
        duration: x.duration,
        thumbnail: x.thumbnail,
      }));
      setHistory(historyMapped);
      setLikedSongs(likesMapped);
      console.log(`[USER DATA] Loaded ${historyMapped.length} history items and ${likesMapped.length} liked songs for "${nickname}"`);
      // Don't load recommendations in loadUserData - use refreshRecommendations instead
      // This avoids async issues and ensures recommendations are always fresh
      setReco([]);
    } catch (error) {
      console.error(`[USER DATA] Failed to load data for "${nickname}":`, error);
    }
  }, [nickname]);

  const addToHistory = useCallback(async (song: Song) => {
    if (!nickname) return;
    try {
      await userStorage.addHistory(nickname, {
        videoId: song.videoId || song.id,
        title: song.title,
        artist: song.artist,
        duration: song.duration,
        thumbnail: song.thumbnail,
      });
      await loadUserData();
    } catch (error) {
      console.error('[USER DATA] Failed to add to history:', error);
    }
  }, [nickname, loadUserData]);

  const removeFromHistory = useCallback(async (videoId: string) => {
    if (!nickname) return;
    try {
      await userStorage.removeHistoryItem(nickname, videoId);
      await loadUserData();
    } catch (error) {
      console.error('[USER DATA] Failed to remove from history:', error);
    }
  }, [nickname, loadUserData]);

  const clearHistory = useCallback(async () => {
    if (!nickname) return;
    try {
      await userStorage.clearHistory(nickname);
      await loadUserData();
    } catch (error) {
      console.error('[USER DATA] Failed to clear history:', error);
    }
  }, [nickname, loadUserData]);

  const toggleLike = useCallback(async (song: Song) => {
    if (!nickname) return;
    try {
      const isLiked = likedSongs.some((likedSong) => (likedSong.videoId || likedSong.id) === (song.videoId || song.id));
      if (isLiked) {
        await userStorage.unlikeSong(nickname, song.videoId || song.id);
      } else {
        await userStorage.likeSong(nickname, {
          videoId: song.videoId || song.id,
          title: song.title,
          artist: song.artist,
          duration: song.duration,
          thumbnail: song.thumbnail,
        });
      }
      await loadUserData();
    } catch (error) {
      console.error('[USER DATA] Failed to toggle like:', error);
    }
  }, [nickname, likedSongs, loadUserData]);

  const refreshRecommendations = useCallback(async () => {
    if (!nickname) return;
    setRecoLoading(true);
    try {
      // Get recommendation structure (first 2 + search hints)
      const recData = await userStorage.getRecommendations(nickname, 10);
      
      // Handle old format (direct array) for backward compatibility
      if (Array.isArray(recData)) {
        setReco((recData || []).map((s: any) => ({
          id: s.videoId || s.id,
          videoId: s.videoId || s.id,
          title: s.title || '未知標題',
          artist: s.artist || '未知藝術家',
          duration: s.duration,
          thumbnail: s.thumbnail,
        })));
        setRecoLoading(false);
        return;
      }
      
      // New format: { firstTwo, artists, keywords, seen, limit }
      const recommendations: Song[] = [];
      const seen = new Set<string>(recData.seen || []);
      
      // Add first 2 songs from likes/history
      if (recData.firstTwo && Array.isArray(recData.firstTwo)) {
        recData.firstTwo.forEach((s: any) => {
          if (s.videoId) {
            recommendations.push({
              id: s.videoId,
              videoId: s.videoId,
              title: s.title || '未知標題',
              artist: s.artist || '未知藝術家',
              duration: s.duration,
              thumbnail: s.thumbnail,
            });
          }
        });
      }
      
      // If we already have enough, return early
      if (recommendations.length >= recData.limit) {
        setReco(recommendations.slice(0, recData.limit));
        setRecoLoading(false);
        return;
      }
      
      // Search for songs based on artists and keywords
      const artists = recData.artists || [];
      const keywords = recData.keywords || [];
      const limit = recData.limit || 10;
      
      // Search by artists (prioritize most frequent artists)
      const artistSearches: Promise<Song[]>[] = [];
      const artistsToSearch = artists.slice(0, 3); // Search top 3 artists
      
      for (const artist of artistsToSearch) {
        if (recommendations.length >= limit) break;
        
        artistSearches.push(
          api.search(artist).then((data: any) => {
            const results = parseSearchResponse(data);
            // Filter out songs user already has
            return results.filter((song: Song) => 
              song.videoId && !seen.has(song.videoId)
            );
          }).catch((error: any) => {
            console.error(`Failed to search for artist "${artist}":`, error);
            return [];
          })
        );
      }
      
      // Search by keywords (combine top keywords)
      if (keywords.length > 0 && recommendations.length < limit) {
        const topKeywords = Array.from(keywords).slice(0, 2);
        const keywordQuery = topKeywords.join(' ');
        
        artistSearches.push(
          api.search(keywordQuery).then((data: any) => {
            const results = parseSearchResponse(data);
            return results.filter((song: Song) => 
              song.videoId && !seen.has(song.videoId)
            );
          }).catch((error: any) => {
            console.error(`Failed to search for keywords "${keywordQuery}":`, error);
            return [];
          })
        );
      }
      
      // Wait for all searches to complete
      const searchResults = await Promise.all(artistSearches);
      
      // Combine and deduplicate results
      const allSearchResults: Song[] = [];
      const searchSeen = new Set<string>();
      
      for (const results of searchResults) {
        for (const song of results) {
          if (song.videoId && !searchSeen.has(song.videoId) && !seen.has(song.videoId)) {
            searchSeen.add(song.videoId);
            seen.add(song.videoId);
            allSearchResults.push(song);
          }
        }
      }
      
      // Add search results to recommendations
      recommendations.push(...allSearchResults);
      
      // Limit to requested number
      setReco(recommendations.slice(0, limit).map((s: any) => ({
        id: s.videoId || s.id,
        videoId: s.videoId || s.id,
        title: s.title || '未知標題',
        artist: s.artist || '未知藝術家',
        duration: s.duration,
        thumbnail: s.thumbnail,
      })));
    } catch (error) {
      console.error('Failed to get recommendations:', error);
      setReco([]);
    }
    setRecoLoading(false);
  }, [nickname]);

  // 當 nickname 改變時，自動重新載入資料
  useEffect(() => {
    console.log(`[USER DATA] Nickname changed to: "${nickname}"`);
    loadUserData();
  }, [nickname, loadUserData]);

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





