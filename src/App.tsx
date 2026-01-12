import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./components/ui/alert-dialog";
import { Badge } from "./components/ui/badge";
import { Slider } from "./components/ui/slider";
import {
  Search,
  Plus,
  Trash2,
  User,
  Clock,
  Star,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Heart,
  RefreshCw,
  X,
  MoreVertical,
  Repeat,
  Repeat1,
  Shuffle,
  Rewind,
  FastForward,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { api, reinitializeApiBaseUrl, getCurrentTarget } from "./lib/api";
import { userStorage } from "./lib/userStorage";
import type { Song, QueueItem } from "./types";
import { SwipeRow } from "./components/Queue/SwipeRow";
import { SearchResultItem } from "./components/Search/SearchResultItem";
import { NowPlaying } from "./components/Player/NowPlaying";
import { UserProfile } from "./components/User/UserProfile";
import { LikedSongs } from "./components/User/LikedSongs";
import { History } from "./components/User/History";
import { usePlayer } from "./hooks/usePlayer";
import { useQueue } from "./hooks/useQueue";
import { useSearch } from "./hooks/useSearch";
import { useUserData } from "./hooks/useUserData";
import { useSync } from "./hooks/useSync";



export default function App() {
  // User state
  const [nickname, setNickname] = useState("");
  const [nicknameInput, setNicknameInput] = useState("");
  const [selectedSong, setSelectedSong] = useState<QueueItem | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<Song | null>(null);
  
  // UI state
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [queueExpanded, setQueueExpanded] = useState(false);
  const [likedExpanded, setLikedExpanded] = useState(false);
  const [adding, setAdding] = useState<Set<string>>(new Set());
  const [infoMsg, setInfoMsg] = useState<string>("");
  const [toastMsg, setToastMsg] = useState<string>("");
  const toastTimerRef = useRef<number | null>(null);
  const [openMenus, setOpenMenus] = useState<Set<string>>(new Set());
  
  // Volume state
  const [volume, setVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);
  const lastVolChangeAt = useRef<number>(0);
  
  // Player state
  const [repeatMode, setRepeatMode] = useState<'NONE' | 'ALL' | 'ONE' | null>(null);
  const [isShuffled, setIsShuffled] = useState(false);
  const [likeState, setLikeState] = useState<'LIKE' | 'DISLIKE' | 'INDIFFERENT' | null>(null);
  
  // Hooks
  const queueTickRef = useRef<number>(0);
  const { playQueue, setPlayQueue, refreshQueue, addToQueue: addToQueueHook, removeFromQueue, moveSongInQueue, clearQueue, jumpToQueueItem: jumpToQueueItemHook } = useQueue();
  const player = usePlayer(playQueue);
  const { searchQuery, setSearchQuery, searchResults, handleSearch, clearSearch } = useSearch();
  const userData = useUserData(nickname);
  
  // Use player hook state
  const { isPlaying, setIsPlaying, currentTime, setCurrentTime, songDuration, setSongDuration, currentVideoIdRef, getCurrentSong, togglePlayPause, playNext, playPrevious, handleGoBack, handleGoForward, seek, syncTimeFromServer, lastSyncTimeRef } = player;
  
  // Use user data hook state
  const { history, setHistory, likedSongs, setLikedSongs, reco, setReco, recoLoading, loadUserData, addToHistory, removeFromHistory, clearHistory: clearHistoryHook, toggleLike, refreshRecommendations } = userData;


  // 顯示加入按鈕文案（固定寬度避免抖動）
  const renderAddLabel = (id?: string) =>
    id && adding.has(id) ? "加入中…" : "加入";



  // Play song from start (添加歌曲 -> 定位 -> 刪除其他非正在播放的歌曲)
  const playSongFromStart = async (song: Song) => {
    console.log('playSongFromStart called for song:', song.title);
    try {
      const sid = song.videoId || song.id;
      if (!sid) {
        console.log('playSongFromStart: No videoId or id found');
        return;
      }
      
      // 若此歌曲已在加入中，阻止重複點擊
      if (adding.has(sid)) {
        console.log('playSongFromStart: Song already being added');
        return;
      }
      
      // 設定加入中狀態並顯示提示
      setAdding((prev) => new Set(prev).add(sid));
      setInfoMsg("正在播放，請稍候…");
      const clearInfo = setTimeout(() => setInfoMsg(""), 2500);
      
      console.log('playSongFromStart: Step 1 - Adding song to queue with videoId:', sid);

      // 步驟 1: 添加對應歌曲
      const enqueueResult = await api.enqueue(
        {
          videoId: sid,
          title: song.title,
          artist: song.artist,
          duration: song.duration,
          thumbnail: song.thumbnail,
        },
        nickname || undefined,
        'INSERT_AT_END'
      );
      console.log('playSongFromStart: Enqueue result:', enqueueResult);
      
      // 步驟 2: 獲取佇列並定位到該歌曲
      console.log('playSongFromStart: Step 2 - Getting queue and finding song index');
      // 等待一小段時間確保 API 已處理
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 重試查找歌曲索引（最多重試 10 次）
      let songIndex = -1;
      let retries = 0;
      while (songIndex < 0 && retries < 10) {
        const updatedQueue = await api.queue();
        console.log('playSongFromStart: Queue items (retry', retries, '):', updatedQueue.map(q => ({ videoId: q.videoId, index: q.index, title: q.title })));
        songIndex = updatedQueue.findIndex(item => item.videoId === sid);
        console.log('playSongFromStart: Found song at index:', songIndex, 'retry:', retries, 'looking for videoId:', sid);
        
        if (songIndex < 0) {
          retries++;
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      if (songIndex < 0) {
        console.error('playSongFromStart: Failed to find song in queue after retries');
        throw new Error('歌曲未成功添加到佇列');
      }
      
      // 步驟 3: 定位到該歌曲並播放
      console.log('playSongFromStart: Step 3 - Setting queue index to:', songIndex);
      try {
        await api.setQueueIndex(songIndex);
        console.log('playSongFromStart: Queue index set successfully');
      } catch (error) {
        console.error('playSongFromStart: Failed to set queue index:', error);
        throw error;
      }
      
      try {
        await api.control('play');
        console.log('playSongFromStart: Play command sent successfully');
      } catch (error) {
        console.error('playSongFromStart: Failed to play:', error);
        throw error;
      }
      
      // 等待一小段時間確保播放已開始
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 步驟 4: 刪除其他非正在播放的歌曲（參考 clearQueue 的實現）
      console.log('playSongFromStart: Step 4 - Getting queue and current song to delete others');
      const q = await api.queue();
      const currentSong = await api.currentSong();
      console.log('playSongFromStart: Current song:', currentSong.videoId, 'Queue length:', q.length);
      const playingVid = currentSong.videoId;
      
      // 找出所有非正在播放的索引，倒序刪除避免位移
      const targets = q
        .filter((it) => it.videoId !== playingVid)
        .map((it) => it.index)
        .sort((a, b) => b - a);
      console.log('playSongFromStart: Songs to delete:', targets.length, 'indices:', targets);
      
      for (const idx of targets) {
        try {
          await api.queueDelete(idx);
          console.log('playSongFromStart: Deleted queue item at index:', idx);
        } catch (error) {
          console.error('playSongFromStart: Failed to delete queue item at index', idx, ':', error);
        }
      }
      console.log('playSongFromStart: Finished deleting other songs');
      
      // 立即更新當前歌曲狀態
      console.log('playSongFromStart: Updating current song state');
      const finalCurrentSong = await api.currentSong();
      currentVideoIdRef.current = finalCurrentSong.videoId;
      setIsPlaying(!finalCurrentSong.isPaused);
      setCurrentTime(finalCurrentSong.elapsedSeconds || 0);
      setSongDuration(finalCurrentSong.songDuration || 0);
      console.log('playSongFromStart: Current song state updated:', {
        videoId: finalCurrentSong.videoId,
        isPaused: finalCurrentSong.isPaused,
        elapsed: finalCurrentSong.elapsedSeconds
      });
      
      // 刷新佇列
      console.log('playSongFromStart: Refreshing queue');
      await refreshQueue();
      console.log('playSongFromStart: Queue refreshed');
      
      // Add to history if nickname is set
      if (nickname) {
        addToHistory(song);
      }
      
      // 顯示頂部 Toast 成功提示
      const title = song.title || "";
      const artist = song.artist ? ` - ${song.artist}` : "";
      const msg = `正在播放：${title}${artist}`;
      setToastMsg(msg);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => setToastMsg(""), 2500) as unknown as number;
      console.log('playSongFromStart: Completed successfully');
      
    } catch (error) {
      console.error('Failed to play song:', error);
      setToastMsg('播放失敗：' + (error instanceof Error ? error.message : '未知錯誤'));
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => setToastMsg(""), 2500) as unknown as number;
    } finally {
      const sid = song.videoId || song.id;
      if (sid) setAdding((prev) => { const s = new Set(prev); s.delete(sid); return s; });
    }
  };

  // Wrapper for addToQueue hook with UI feedback
  const addToQueue = async (song: Song) => {
    try {
      const sid = song.videoId || song.id;
      if (sid && adding.has(sid)) return;
      if (sid) setAdding((prev) => new Set(prev).add(sid));
      setInfoMsg("已送出加入佇列，請稍候…");
      const clearInfo = setTimeout(() => setInfoMsg(""), 2500);

      await addToQueueHook(
        {
          videoId: song.videoId || song.id,
          title: song.title,
          artist: song.artist,
          duration: song.duration,
          thumbnail: song.thumbnail,
        },
        nickname || undefined,
      );
      
      if (nickname) {
        addToHistory(song);
      }
      
  const title = song.title || "";
  const artist = song.artist ? ` - ${song.artist}` : "";
  const msg = `已加入到佇列：${title}${artist}`;
  setToastMsg(msg);
  if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
  toastTimerRef.current = window.setTimeout(() => setToastMsg(""), 2500) as unknown as number;
      
      if (nickname) {
        refreshRecommendations();
      }
    } catch {}
    finally {
      const sid = song.videoId || song.id;
      if (sid) setAdding((prev) => { const s = new Set(prev); s.delete(sid); return s; });
    }
  };

  // Wrapper for removeFromQueue to handle selectedSong
  const handleRemoveFromQueue = async (songId: string) => {
    await removeFromQueue(songId);
    setSelectedSong(null);
  };


  // Wrapper for clearQueue hook
  const handleClearQueue = async () => {
    await clearQueue(currentVideoIdRef.current);
  };

  // History row with left-swipe delete

  const handleSongClick = (song: QueueItem) => {
    setSelectedSong(song);
  };

  const handleNicknameConfirm = () => {
    const n = nicknameInput.trim();
    setNickname(n);
    localStorage.setItem("ytmd_nickname", n);
    loadUserData();
  };

  const handleNicknameClear = () => {
    setNickname("");
    setNicknameInput("");
    localStorage.removeItem("ytmd_nickname");
    loadUserData();
  };

  // 切換重複模式
  const toggleRepeat = async () => {
    try {
      await api.repeatMode.switch(1);
      const repeat = await api.repeatMode.get();
      setRepeatMode(repeat);
    } catch {}
  };

  // 切換隨機播放
  const toggleShuffle = async () => {
    try {
      await api.shuffle.toggle();
      const shuffle = await api.shuffle.get();
      setIsShuffled(shuffle);
    } catch {}
  };

  // 切換喜歡狀態（只保存在用戶設定，不修改 YTMD 賬號）
  const toggleLikeAPI = () => {
    if (!nickname) {
      setToastMsg('請先輸入暱稱以使用點贊功能');
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => setToastMsg(""), 2500) as unknown as number;
      return;
    }
    
    const song = getCurrentSong();
    if (!song) return;
    
    const songId = song.videoId || song.id;
    if (!songId) return;
    
    // 檢查當前歌曲是否已被當前用戶點贊
    const isLiked = likedSongs.some((likedSong) => (likedSong.videoId || likedSong.id) === songId);
    
    if (isLiked) {
      // 取消點贊
      userStorage.unlikeSong(nickname, songId);
      setLikeState('INDIFFERENT');
    } else {
      // 點贊
      userStorage.likeSong(nickname, {
        videoId: songId,
        title: song.title,
        artist: song.artist,
        duration: song.duration,
        thumbnail: song.thumbnail,
      });
      setLikeState('LIKE');
    }
    
    // 更新喜歡的歌曲列表
    const likes = userStorage.getLikes(nickname);
    setLikedSongs((likes || []).map((x: any) => ({
      id: x.videoId,
      videoId: x.videoId,
      title: x.title,
      artist: x.artist,
      duration: x.duration,
      thumbnail: x.thumbnail,
    })));
    
    // 刷新推薦
    refreshRecommendations();
  };




  // Initialize API base URL from URL parameters
  React.useEffect(() => {
    reinitializeApiBaseUrl();
  }, []); // Only run once on mount

  // Track current target for display
  const [currentTarget, setCurrentTarget] = React.useState(() => getCurrentTarget());

  // Reinitialize API when URL parameters change
  React.useEffect(() => {
    const handleLocationChange = () => {
      reinitializeApiBaseUrl();
      setCurrentTarget(getCurrentTarget());
    };
    
    // Listen for popstate (back/forward navigation)
    window.addEventListener('popstate', handleLocationChange);
    
    // Also check if URL parameters changed (for programmatic changes)
    let lastTarget = currentTarget;
    const checkUrlParams = () => {
      const newTarget = getCurrentTarget();
      if (newTarget.ip !== lastTarget.ip || newTarget.port !== lastTarget.port) {
        reinitializeApiBaseUrl();
        setCurrentTarget(newTarget);
        lastTarget = newTarget;
      }
    };
    
    // Check periodically (every 2 seconds) if URL params changed
    const interval = setInterval(checkUrlParams, 2000);
    
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      clearInterval(interval);
    };
  }, []);

  // init from backend
  React.useEffect(() => {
    const saved = localStorage.getItem("ytmd_nickname") || "";
    setNickname(saved);
    setNicknameInput(saved);
    (async () => {
      try {
        console.log('[INIT DEBUG] Starting initialization...');
        await refreshQueue();
        const cs = await api.currentSong();
        console.log('[INIT DEBUG] Initial currentSong:', cs);
        console.log('[INIT DEBUG] elapsedSeconds:', cs.elapsedSeconds, 'type:', typeof cs.elapsedSeconds);
        console.log('[INIT DEBUG] songDuration:', cs.songDuration, 'type:', typeof cs.songDuration);
        
        currentVideoIdRef.current = cs.videoId;
        const willBePlaying = !cs.isPaused;
        setIsPlaying(willBePlaying);
        const initialTime = Math.max(0, Math.round(cs.elapsedSeconds || 0));
        const initialDuration = Math.max(0, Math.round(cs.songDuration || 0));
        console.log('[INIT DEBUG] Setting initial currentTime to:', initialTime, 'from API:', cs.elapsedSeconds);
        console.log('[INIT DEBUG] Setting initial songDuration to:', initialDuration, 'from API:', cs.songDuration);
        console.log('[INIT DEBUG] isPaused:', cs.isPaused, 'will set isPlaying to:', willBePlaying);
        
        // 注意：YTMD API 可能無法正確返回 elapsedSeconds，總是返回 0
        // 我們仍然使用 API 的值作為初始值，但前端計時器會處理實際的進度更新
        if (initialTime === 0 && willBePlaying && initialDuration > 0) {
          console.warn('[INIT DEBUG] WARNING: API returned elapsedSeconds=0 but song is playing. This is a known YTMD API limitation. Frontend timer will handle progress.');
        }
        
        // 先設置 songDuration，這樣計時器才能正常啟動
        setSongDuration(initialDuration);
        // 然後設置 currentTime（即使 API 返回 0，前端計時器會自動開始）
        setCurrentTime(initialTime);
        
        // 初始化時也設置 lastSyncTimeRef，避免立即同步
        if (lastSyncTimeRef) {
          lastSyncTimeRef.current = Date.now();
        }
        
        // 注意：YTMD API 可能無法正確返回 elapsedSeconds，總是返回 0
        // 我們仍然使用 API 的值作為初始值，但前端計時器會處理實際的進度更新
        if (initialTime === 0 && willBePlaying && initialDuration > 0) {
          console.warn('[INIT DEBUG] WARNING: API returned elapsedSeconds=0 but song is playing. This is a known YTMD API limitation. Frontend timer will handle progress.');
        }
        
        console.log('[INIT DEBUG] After setting states:');
        console.log('[INIT DEBUG] - isPlaying:', willBePlaying);
        console.log('[INIT DEBUG] - songDuration:', initialDuration);
        console.log('[INIT DEBUG] - currentTime:', initialTime);
        console.log('[INIT DEBUG] - Frontend timer will start automatically if isPlaying=true and songDuration>0');
        
        const v = await api.volume.get();
        console.log('[INIT DEBUG] Initial volume:', v);
        // 如果 API 返回 0 但沒有靜音，可能是 API 問題，使用默認值
        if (typeof v.state === "number" && v.state >= 0 && v.state <= 100) {
          if (v.state === 0 && !v.isMuted) {
            console.warn('[INIT DEBUG] API returned volume 0 but not muted - likely API issue, using default volume 75');
            setVolume(75); // 使用默認音量
            setIsMuted(false);
          } else {
            console.log('[INIT DEBUG] Setting volume to:', v.state, 'isMuted:', v.isMuted);
            setVolume(v.state);
            setIsMuted(v.isMuted);
          }
        } else {
          console.warn('[INIT DEBUG] Invalid volume value, using default');
          setVolume(75); // 使用默認音量
          setIsMuted(false);
        }
        
        const repeat = await api.repeatMode.get();
        console.log('[INIT DEBUG] Initial repeatMode:', repeat);
        setRepeatMode(repeat);
        
        const shuffle = await api.shuffle.get();
        console.log('[INIT DEBUG] Initial shuffle:', shuffle);
        setIsShuffled(shuffle);
        
        // 從用戶設定（localStorage）獲取點贊狀態，而不是從 API
        if (saved && cs.videoId) {
          const likes = userStorage.getLikes(saved);
          const isLiked = likes.some((likedSong: any) => likedSong.videoId === cs.videoId);
          console.log('[INIT DEBUG] Initial likeState from localStorage:', isLiked ? 'LIKE' : 'INDIFFERENT');
          setLikeState(isLiked ? 'LIKE' : 'INDIFFERENT');
        } else {
          setLikeState(null);
        }
        
        if (saved) {
          loadUserData();
        }
        console.log('[INIT DEBUG] Initialization complete');
      } catch (error) {
        console.error('[INIT DEBUG] Initialization error:', error);
      }
    })();
  }, [refreshQueue, loadUserData]);

  // Use sync hook for periodic synchronization
  useSync({
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
  });

  // 點擊外部關閉選單
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // 檢查是否點擊在選單容器內或選單按鈕上
      const isMenuContainer = target.closest('.menu-container');
      const isMenuButton = target.closest('[data-menu-button]');
      const isMenuContent = target.closest('[data-menu-content]');
      
      // 如果點擊在選單相關元素外，關閉所有選單
      if (!isMenuContainer && !isMenuButton && !isMenuContent) {
        setOpenMenus(new Set());
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 dark">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            YTMD控制系統
          </h1>
          <p className="text-gray-400">由 CBC 修改開發</p>
          <p className="text-gray-500 text-sm mt-2">
            連接目標: <span className="text-gray-300 font-mono">{currentTarget.display}</span>
            {currentTarget.ip && currentTarget.ip !== 'localhost' && (
              <span className="ml-2 text-xs">(使用 ?ip=IP地址 或 ?host=主機名 參數切換目標)</span>
            )}
          </p>
        </div>

        {/* Now Playing Section */}
        <NowPlaying
          currentSong={getCurrentSong()}
          isPlaying={isPlaying}
          currentTime={currentTime}
          songDuration={songDuration}
          volume={volume}
          isMuted={isMuted}
          repeatMode={repeatMode}
          isShuffled={isShuffled}
          likeState={likeState}
          canPlayPrevious={playQueue.findIndex((song) => song.status === "playing") !== 0}
          canPlayNext={playQueue.findIndex((song) => song.status === "playing") !== playQueue.length - 1}
          onPlayPause={togglePlayPause}
          onPrevious={playPrevious}
          onNext={playNext}
          onSeek={async (seconds) => {
            try {
              // seek 現在會返回實際設置的時間
              const actualTime = await api.seek(seconds);
              console.log('[APP DEBUG] Seek result, setting currentTime to:', actualTime);
              setCurrentTime(actualTime);
              if (lastSyncTimeRef) {
                lastSyncTimeRef.current = Date.now();
              }
            } catch (error) {
              console.error('[APP DEBUG] Seek error:', error);
              // 即使出錯，也更新本地時間
              setCurrentTime(seconds);
              if (lastSyncTimeRef) {
                lastSyncTimeRef.current = Date.now();
              }
            }
          }}
          onVolumeChange={async (vol) => {
            setVolume(vol);
            lastVolChangeAt.current = Date.now();
            try {
              // volume.set 現在會返回實際設置的音量
              const result = await api.volume.set(vol);
              console.log('[APP DEBUG] Volume set result:', result);
              // 如果 API 返回有效值，使用 API 的值
              if (result.state > 0 || (result.state === 0 && vol === 0)) {
                setVolume(result.state);
                setIsMuted(result.isMuted);
              }
            } catch (error) {
              console.error('[APP DEBUG] Failed to set volume:', error);
            }
            if (isMuted && vol > 0) {
              setIsMuted(false);
            }
          }}
          onToggleMute={async () => {
            try {
              await api.toggleMute();
              const v = await api.volume.get();
              setIsMuted(v.isMuted);
              if (!v.isMuted && v.state > 0) {
                setVolume(v.state);
              }
            } catch (error) {
              console.error('Failed to toggle mute:', error);
            }
          }}
          onToggleRepeat={toggleRepeat}
          onToggleShuffle={toggleShuffle}
          onToggleLike={toggleLikeAPI}
          onGoBack={handleGoBack}
          onGoForward={handleGoForward}
        />

        {/* Search Section */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              搜尋
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                placeholder="輸入歌曲名稱或歌手..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleSearch(e.target.value);
                }}
                className="flex-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={clearSearch}
                disabled={!searchQuery.trim()}
                className="border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-50"
              >
                <X className="w-4 h-4 mr-1" />清除
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Search Results */}
        {searchQuery && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle>搜尋結果</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3" style={{ position: 'relative', zIndex: 1 }}>
              {infoMsg && (
                <div className="text-xs text-gray-400">{infoMsg}</div>
              )}
              {searchResults.length > 0 ? (
                searchResults.map((song) => {
                  const sid = song.videoId || song.id || '';
                  return (
                    <SearchResultItem
                    key={song.id}
                      song={song}
                      onPlay={playSongFromStart}
                      onAddToQueue={async (s) => {
                        try {
                          const songId = s.videoId || s.id;
                          if (!songId || adding.has(songId)) return;
                          setAdding((prev) => new Set(prev).add(songId));
                          await addToQueue(s);
                          setToastMsg(`已加入佇列：${s.title}`);
                          if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
                          toastTimerRef.current = window.setTimeout(() => setToastMsg(""), 2500) as unknown as number;
                        } catch (error) {
                          console.error('Failed to add song:', error);
                          setToastMsg('加入失敗');
                          if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
                          toastTimerRef.current = window.setTimeout(() => setToastMsg(""), 2500) as unknown as number;
                        } finally {
                          const songId = s.videoId || s.id;
                          if (songId) setAdding((prev) => { const s = new Set(prev); s.delete(songId); return s; });
                        }
                      }}
                      onInsertAfterCurrent={async (s) => {
                        try {
                          const songId = s.videoId || s.id;
                          if (!songId || adding.has(songId)) return;
                          setAdding((prev) => new Set(prev).add(songId));
                          
                          await api.enqueue(
                            {
                              videoId: songId,
                              title: s.title,
                              artist: s.artist,
                              duration: s.duration,
                              thumbnail: s.thumbnail,
                            },
                            nickname || undefined,
                            'INSERT_AFTER_CURRENT_VIDEO'
                          );
                          
                          if (nickname) {
                            userStorage.addHistory(nickname, {
                              videoId: songId,
                              title: s.title,
                              artist: s.artist,
                              duration: s.duration,
                              thumbnail: s.thumbnail,
                            });
                            const hist = userStorage.getHistory(nickname);
                            setHistory(hist.map((x: any) => ({
                              id: x.videoId,
                              videoId: x.videoId,
                              title: x.title,
                              artist: x.artist,
                              duration: x.duration,
                              thumbnail: x.thumbnail,
                            })));
                          }
                          
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
                            })) as any,
                          );
                          
                          setToastMsg(`已插播：${s.title}`);
                          if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
                          toastTimerRef.current = window.setTimeout(() => setToastMsg(""), 2500) as unknown as number;
                        } catch (error) {
                          console.error('Failed to insert song:', error);
                          setToastMsg('插播失敗');
                          if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
                          toastTimerRef.current = window.setTimeout(() => setToastMsg(""), 2500) as unknown as number;
                        } finally {
                          const songId = s.videoId || s.id;
                          if (songId) setAdding((prev) => { const s = new Set(prev); s.delete(songId); return s; });
                        }
                      }}
                      isAdding={!!(song.videoId || song.id) && adding.has(song.videoId || song.id)}
                      isMenuOpen={(() => {
                        const songId = song.videoId || song.id || '';
                        const isOpen = !!songId && openMenus.has(songId);
                        return isOpen;
                      })()}
                      onMenuToggle={() => {
                        const songId = song.videoId || song.id || '';
                        console.log('App: Menu toggle called for songId:', songId, 'current openMenus:', Array.from(openMenus));
                        if (songId) {
                          setOpenMenus((prev) => {
                            const newSet = new Set(prev);
                            const wasOpen = newSet.has(songId);
                            if (wasOpen) {
                              newSet.delete(songId);
                              console.log('App: Closing menu for songId:', songId);
                            } else {
                              newSet.add(songId);
                              console.log('App: Opening menu for songId:', songId);
                            }
                            console.log('App: Updated openMenus:', Array.from(newSet));
                            return newSet;
                          });
                        } else {
                          console.log('App: No songId found, cannot toggle menu');
                        }
                      }}
                    />
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>
                    找不到符合「{searchQuery}」的搜尋結果
                  </p>
                  <p className="text-sm mt-1">
                    請嘗試其他關鍵字
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Nickname Input */}
        <UserProfile
          nickname={nickname}
          nicknameInput={nicknameInput}
          onNicknameInputChange={setNicknameInput}
          onNicknameConfirm={handleNicknameConfirm}
          onNicknameClear={handleNicknameClear}
        />

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Play Queue */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>播放清單</CardTitle>
                  <p className="text-xs text-gray-400 mt-1">左滑刪除；點擊曲目跳轉。正在播放的不能刪。</p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      清除全部
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-gray-800 border-gray-700">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-white">清除佇列</AlertDialogTitle>
                      <AlertDialogDescription className="text-gray-400">
                        這將刪除所有非正在播放的歌曲，確定要繼續嗎？
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600">取消</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleClearQueue}
                        style={{ backgroundColor: "#e74c3c" }}
                        className="hover:opacity-80"
                      >
                        清除
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardHeader>
              <CardContent className="space-y-3">
                {(() => {
                  const currIdx = playQueue.findIndex((s) => s.videoId === currentVideoIdRef.current);
                  const collapsedMax = 6; // 前 1 + 當前 + 後 4
                  const startIdx = currIdx >= 0 ? Math.max(currIdx - 1, 0) : 0;
                  const endIdx = Math.min(playQueue.length, startIdx + collapsedMax);
                  const shown = queueExpanded ? playQueue : playQueue.slice(startIdx, endIdx);
                  return shown.map((song, idx) => {
                    const actualIdx = queueExpanded ? idx : startIdx + idx;
                    const canMoveUp = actualIdx > 0;
                    const canMoveDown = actualIdx < playQueue.length - 1;
                    return (
                  <SwipeRow
                    key={song.id}
                    song={song}
                    isCurrent={song.videoId === currentVideoIdRef.current}
                    onDelete={(s) => {
                      if (s.videoId === currentVideoIdRef.current) return;
                          handleRemoveFromQueue(s.id);
                    }}
                    onClick={(s) => {
                      if (s.videoId !== currentVideoIdRef.current) handleSongClick(s as any);
                    }}
                        onMoveUp={(s) => moveSongInQueue(s, 'up')}
                        onMoveDown={(s) => moveSongInQueue(s, 'down')}
                        canMoveUp={canMoveUp}
                        canMoveDown={canMoveDown}
                  />
                    );
                  });
                })()}
                {playQueue.length > 0 && (() => {
                  const currIdx = playQueue.findIndex((s) => s.videoId === currentVideoIdRef.current);
                  const collapsedMax = 6;
                  const startIdx = currIdx >= 0 ? Math.max(currIdx - 1, 0) : 0;
                  const endIdx = Math.min(playQueue.length, startIdx + collapsedMax);
                  const hiddenBefore = startIdx > 0;
                  const hiddenAfter = endIdx < playQueue.length;
                  const showToggle = queueExpanded || hiddenBefore || hiddenAfter;
                  if (!showToggle) return null;
                  return (
                    <div className="pt-1 flex justify-end">
                      <button
                        className="text-xs text-gray-300 hover:text-white underline"
                        onClick={() => setQueueExpanded((v) => !v)}
                      >
                        {queueExpanded ? '收合' : '展開'}
                      </button>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* History - Only show if nickname is provided */}
            <History
              nickname={nickname}
              history={history}
              historyExpanded={historyExpanded}
              onHistoryExpandedChange={setHistoryExpanded}
              onClearHistory={clearHistoryHook}
              onDeleteHistoryItem={(s) => setSelectedHistory(s)}
              onAddToQueue={addToQueue}
              onPlay={playSongFromStart}
              onInsertAfterCurrent={async (s) => {
                try {
                  const songId = s.videoId || s.id;
                  if (!songId || adding.has(songId)) return;
                  setAdding((prev) => new Set(prev).add(songId));
                  
                  await api.enqueue(
                    {
                      videoId: songId,
                      title: s.title,
                      artist: s.artist,
                      duration: s.duration,
                      thumbnail: s.thumbnail,
                    },
                    nickname || undefined,
                    'INSERT_AFTER_CURRENT_VIDEO'
                  );
                  
                  if (nickname) {
                    userStorage.addHistory(nickname, {
                      videoId: songId,
                      title: s.title,
                      artist: s.artist,
                      duration: s.duration,
                      thumbnail: s.thumbnail,
                    });
                    const hist = userStorage.getHistory(nickname);
                    setHistory(hist.map((x: any) => ({
                      id: x.videoId,
                      videoId: x.videoId,
                      title: x.title,
                      artist: x.artist,
                      duration: x.duration,
                      thumbnail: x.thumbnail,
                    })));
                  }
                  
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
                    })) as any,
                  );
                  
                  setToastMsg(`已插播：${s.title}`);
                  if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
                  toastTimerRef.current = window.setTimeout(() => setToastMsg(""), 2500) as unknown as number;
                } catch (error) {
                  console.error('Failed to insert song:', error);
                  setToastMsg('插播失敗');
                  if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
                  toastTimerRef.current = window.setTimeout(() => setToastMsg(""), 2500) as unknown as number;
                } finally {
                  const songId = s.videoId || s.id;
                  if (songId) setAdding((prev) => { const s = new Set(prev); s.delete(songId); return s; });
                }
              }}
              isAdding={(id) => id ? adding.has(id) : false}
              renderAddLabel={renderAddLabel}
              infoMsg={infoMsg}
            />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Liked Songs - Only show if nickname is provided */}
            {nickname && (
              <LikedSongs
                likedSongs={likedExpanded ? likedSongs : likedSongs.slice(0, 5)}
                onAddToQueue={(song) => {
                  addToQueue(song);
                  // 將最近從「喜歡的歌曲」加入的項目移到最上面
                  setLikedSongs((prev) => {
                    const id = song.videoId || song.id;
                    const rest = prev.filter((s) => (s.videoId || s.id) !== id);
                    return [
                      { ...song, id: id, videoId: id },
                      ...rest,
                    ];
                  });
                }}
                onPlay={playSongFromStart}
                onInsertAfterCurrent={async (s) => {
                  try {
                    const songId = s.videoId || s.id;
                    if (!songId || adding.has(songId)) return;
                    setAdding((prev) => new Set(prev).add(songId));
                    
                    await api.enqueue(
                      {
                        videoId: songId,
                        title: s.title,
                        artist: s.artist,
                        duration: s.duration,
                        thumbnail: s.thumbnail,
                      },
                      nickname || undefined,
                      'INSERT_AFTER_CURRENT_VIDEO'
                    );
                    
                    if (nickname) {
                      userStorage.addHistory(nickname, {
                        videoId: songId,
                        title: s.title,
                        artist: s.artist,
                        duration: s.duration,
                        thumbnail: s.thumbnail,
                      });
                      const hist = userStorage.getHistory(nickname);
                      setHistory(hist.map((x: any) => ({
                        id: x.videoId,
                        videoId: x.videoId,
                        title: x.title,
                        artist: x.artist,
                        duration: x.duration,
                        thumbnail: x.thumbnail,
                      })));
                    }
                    
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
                      })) as any,
                    );
                    
                    setToastMsg(`已插播：${s.title}`);
                    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
                    toastTimerRef.current = window.setTimeout(() => setToastMsg(""), 2500) as unknown as number;
                  } catch (error) {
                    console.error('Failed to insert song:', error);
                    setToastMsg('插播失敗');
                    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
                    toastTimerRef.current = window.setTimeout(() => setToastMsg(""), 2500) as unknown as number;
                  } finally {
                    const songId = s.videoId || s.id;
                    if (songId) setAdding((prev) => { const s = new Set(prev); s.delete(songId); return s; });
                  }
                }}
                onToggleLike={toggleLike}
                isAdding={(id) => id ? adding.has(id) : false}
                renderAddLabel={renderAddLabel}
                infoMsg={infoMsg}
              />
            )}
            {nickname && likedSongs.length > 5 && (
                    <div className="pt-1 flex justify-end">
                      <button
                        className="text-xs text-gray-300 hover:text-white underline"
                        onClick={() => setLikedExpanded((v) => !v)}
                      >
                        {likedExpanded ? '收合' : '展開'}
                      </button>
                    </div>
            )}

            {/* Recommendations - Only show if nickname is provided */}
            {nickname && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="w-5 h-5" />
                      推薦歌曲
                    </CardTitle>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshRecommendations}
                    disabled={!nickname || recoLoading}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <RefreshCw className={`w-4 h-4 mr-1 ${recoLoading ? 'animate-spin' : ''}`} />
                    刷新
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  {infoMsg && (
                    <div className="text-xs text-gray-400">{infoMsg}</div>
                  )}
                  {reco.length === 0 && (
                    <div className="text-gray-400 text-sm">尚無推薦，請先點幾首歌試試。</div>
                  )}
                  {reco.map((song) => {
                    const songId = song.videoId || song.id || '';
                    return (
                      <SearchResultItem
                        key={song.id}
                        song={song}
                        onPlay={playSongFromStart}
                        onAddToQueue={async (s) => {
                          try {
                            const songId = s.videoId || s.id;
                            if (!songId || adding.has(songId)) return;
                            setAdding((prev) => new Set(prev).add(songId));
                            await addToQueue(s);
                            setToastMsg(`已加入佇列：${s.title}`);
                            if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
                            toastTimerRef.current = window.setTimeout(() => setToastMsg(""), 2500) as unknown as number;
                          } catch (error) {
                            console.error('Failed to add song:', error);
                            setToastMsg('加入失敗');
                            if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
                            toastTimerRef.current = window.setTimeout(() => setToastMsg(""), 2500) as unknown as number;
                          } finally {
                            const songId = s.videoId || s.id;
                            if (songId) setAdding((prev) => { const s = new Set(prev); s.delete(songId); return s; });
                          }
                        }}
                        onInsertAfterCurrent={async (s) => {
                          try {
                            const songId = s.videoId || s.id;
                            if (!songId || adding.has(songId)) return;
                            setAdding((prev) => new Set(prev).add(songId));
                            
                            await api.enqueue(
                              {
                                videoId: songId,
                                title: s.title,
                                artist: s.artist,
                                duration: s.duration,
                                thumbnail: s.thumbnail,
                              },
                              nickname || undefined,
                              'INSERT_AFTER_CURRENT_VIDEO'
                            );
                            
                            if (nickname) {
                              userStorage.addHistory(nickname, {
                                videoId: songId,
                                title: s.title,
                                artist: s.artist,
                                duration: s.duration,
                                thumbnail: s.thumbnail,
                              });
                              const hist = userStorage.getHistory(nickname);
                              setHistory(hist.map((x: any) => ({
                                id: x.videoId,
                                videoId: x.videoId,
                                title: x.title,
                                artist: x.artist,
                                duration: x.duration,
                                thumbnail: x.thumbnail,
                              })));
                            }
                            
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
                              })) as any,
                            );
                            
                            setToastMsg(`已插播：${s.title}`);
                            if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
                            toastTimerRef.current = window.setTimeout(() => setToastMsg(""), 2500) as unknown as number;
                          } catch (error) {
                            console.error('Failed to insert song:', error);
                            setToastMsg('插播失敗');
                            if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
                            toastTimerRef.current = window.setTimeout(() => setToastMsg(""), 2500) as unknown as number;
                          } finally {
                            const songId = s.videoId || s.id;
                            if (songId) setAdding((prev) => { const s = new Set(prev); s.delete(songId); return s; });
                          }
                        }}
                        isAdding={adding.has(songId)}
                        isMenuOpen={openMenus.has(songId)}
                        onMenuToggle={() => {
                          setOpenMenus((prev) => {
                            const newSet = new Set(prev);
                            if (newSet.has(songId)) {
                              newSet.delete(songId);
                            } else {
                              newSet.add(songId);
                            }
                            return newSet;
                          });
                        }}
                      />
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Delete Song Dialog */}
        {/* Delete Song from Queue Dialog */}
  <AlertDialog
          open={!!selectedSong}
          onOpenChange={(open) => {
            if (!open) setSelectedSong(null);
          }}
        >
          <AlertDialogContent className="bg-gray-800 border-gray-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">
                歌曲操作
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                是否跳轉到「{selectedSong?.title}」？
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => setSelectedSong(null)}
                className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
              >
                取消
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (selectedSong) {
                    await jumpToQueueItemHook(selectedSong as any);
                  }
                  setSelectedSong(null);
                }}
                style={{ backgroundColor: "#3b82f6" }}
                className="hover:opacity-80"
              >
                跳轉
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete History Item Dialog */}
        <AlertDialog
          open={!!selectedHistory}
          onOpenChange={(open) => {
            if (!open) setSelectedHistory(null);
          }}
        >
          <AlertDialogContent className="bg-gray-800 border-gray-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">
                刪除歷史項目
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400">
                您要刪除「{selectedHistory?.title}」這筆歷史記錄嗎？
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => setSelectedHistory(null)}
                className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
              >
                取消
              </AlertDialogCancel>
              <AlertDialogAction
                  onClick={async () => {
                    if (!nickname || !selectedHistory) return;
                    try {
                      removeFromHistory(selectedHistory.videoId || selectedHistory.id);
                    } catch {}
                    setSelectedHistory(null);
                  }}
                style={{ backgroundColor: "#e74c3c" }}
                className="hover:opacity-80"
              >
                刪除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Footer Credit */}
        <footer className="text-center text-gray-500 text-xs mt-8">
          <p className="space-x-2">
            <span>
              基於 <a className="underline" href="https://github.com/th-ch/youtube-music" target="_blank" rel="noreferrer">YouTube Music Desktop App</a> 開發
            </span>
            <span>•</span>
            <span>
              點歌系統由 <strong className="text-gray-200">CBC</strong> 修改
            </span>
            <span>•</span>
            <a className="underline" href="https://github.com/CBC0210/YTMD_BC" target="_blank" rel="noreferrer">查看原始碼</a>
          </p>
        </footer>
      </div>


    {/* Top Toast */}
    {toastMsg && (
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mt-3 bg-black/75 text-white text-sm px-4 py-2 rounded-full shadow-md pointer-events-auto">
          {toastMsg}
        </div>
      </div>
    )}
  </div>
  );
}