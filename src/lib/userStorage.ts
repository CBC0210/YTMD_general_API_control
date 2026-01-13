/**
 * User storage service using localStorage
 * Implements the same API as the Flask UserService for compatibility
 */

interface UserData {
  history: Array<{
    videoId: string;
    title?: string;
    artist?: string;
    duration?: string;
    thumbnail?: string;
    [key: string]: any;
  }>;
  likes: Array<{
    videoId: string;
    title?: string;
    artist?: string;
    duration?: string;
    thumbnail?: string;
    [key: string]: any;
  }>;
}

interface StorageData {
  users: Record<string, UserData>;
}

const STORAGE_KEY = 'ytmd_users';
const MAX_HISTORY_ITEMS = 200;

/**
 * Get all user data from localStorage
 */
function getStorageData(): StorageData {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      // 驗證資料結構
      if (!parsed.users || typeof parsed.users !== 'object') {
        console.warn('[USER STORAGE] Invalid data structure, resetting to default');
        return { users: {} };
      }
      return parsed;
    }
  } catch (error) {
    console.error('[USER STORAGE] Failed to read user storage:', error);
  }
  return { users: {} };
}

/**
 * Save all user data to localStorage
 */
function saveStorageData(data: StorageData): void {
  try {
    // 確保資料結構正確
    if (!data.users || typeof data.users !== 'object') {
      console.error('[USER STORAGE] Invalid data structure, cannot save');
      return;
    }
    const jsonData = JSON.stringify(data);
    localStorage.setItem(STORAGE_KEY, jsonData);
    // 驗證保存是否成功
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved || saved !== jsonData) {
      console.error('[USER STORAGE] Failed to verify saved data');
    }
  } catch (error) {
    console.error('[USER STORAGE] Failed to save user storage:', error);
    // 如果是存儲空間不足，嘗試清理舊資料
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('[USER STORAGE] Storage quota exceeded, attempting cleanup...');
      // 可以考慮清理最舊的歷史記錄
    }
  }
}

/**
 * Ensure user exists in storage
 */
function ensureUser(nickname: string): UserData {
  const data = getStorageData();
  if (!data.users[nickname]) {
    data.users[nickname] = { history: [], likes: [] };
    saveStorageData(data);
  }
  return data.users[nickname];
}

/**
 * Get user data
 */
function getUser(nickname: string): UserData {
  return ensureUser(nickname);
}

export const userStorage = {
  /**
   * Add item to user history
   */
  addHistory(nickname: string, item: any): void {
    if (!nickname || !nickname.trim()) {
      console.warn('[USER STORAGE] Cannot add history: nickname is empty');
      return;
    }
    if (!item || !item.videoId) {
      console.warn('[USER STORAGE] Cannot add history: item is invalid', item);
      return;
    }
    const data = getStorageData();
    const user = ensureUser(nickname);
    
    // Remove existing item with same videoId
    user.history = user.history.filter(
      (x) => x.videoId !== item.videoId
    );
    
    // Add to beginning
    user.history.unshift(item);
    
    // Keep only last 200 items
    user.history = user.history.slice(0, MAX_HISTORY_ITEMS);
    
    data.users[nickname] = user;
    saveStorageData(data);
    console.log(`[USER STORAGE] Added to history for "${nickname}":`, item.videoId, `(total: ${user.history.length} items)`);
  },

  /**
   * Get user history
   */
  getHistory(nickname: string): any[] {
    if (!nickname || !nickname.trim()) {
      console.warn('[USER STORAGE] Cannot get history: nickname is empty');
      return [];
    }
    const user = getUser(nickname);
    const history = user.history || [];
    console.log(`[USER STORAGE] Retrieved history for "${nickname}": ${history.length} items`);
    return history;
  },

  /**
   * Clear user history
   */
  clearHistory(nickname: string): void {
    const data = getStorageData();
    const user = ensureUser(nickname);
    user.history = [];
    data.users[nickname] = user;
    saveStorageData(data);
  },

  /**
   * Remove specific item from history
   */
  removeHistoryItem(nickname: string, videoId: string): void {
    const data = getStorageData();
    const user = ensureUser(nickname);
    user.history = user.history.filter(
      (x) => x.videoId !== videoId
    );
    data.users[nickname] = user;
    saveStorageData(data);
  },

  /**
   * Add song to likes
   */
  likeSong(nickname: string, item: any): void {
    if (!nickname || !nickname.trim()) {
      console.warn('[USER STORAGE] Cannot like song: nickname is empty');
      return;
    }
    if (!item || !item.videoId) {
      console.warn('[USER STORAGE] Cannot like song: item is invalid', item);
      return;
    }
    
    const data = getStorageData();
    const user = ensureUser(nickname);
    
    // Check if already liked
    const alreadyLiked = user.likes.some(
      (x) => x.videoId === item.videoId
    );
    
    if (!alreadyLiked) {
      user.likes.push(item);
      data.users[nickname] = user;
      saveStorageData(data);
      console.log(`[USER STORAGE] Added to likes for "${nickname}":`, item.videoId, `(total: ${user.likes.length} items)`);
    } else {
      console.log(`[USER STORAGE] Song already liked for "${nickname}":`, item.videoId);
    }
  },

  /**
   * Remove song from likes
   */
  unlikeSong(nickname: string, videoId: string): void {
    const data = getStorageData();
    const user = ensureUser(nickname);
    user.likes = user.likes.filter(
      (x) => x.videoId !== videoId
    );
    data.users[nickname] = user;
    saveStorageData(data);
  },

  /**
   * Get user likes
   */
  getLikes(nickname: string): any[] {
    if (!nickname || !nickname.trim()) {
      console.warn('[USER STORAGE] Cannot get likes: nickname is empty');
      return [];
    }
    const user = getUser(nickname);
    const likes = user.likes || [];
    console.log(`[USER STORAGE] Retrieved likes for "${nickname}": ${likes.length} items`);
    return likes;
  },

  /**
   * Get recommendations based on user history and liked songs
   * First 2 songs: from likes and history
   * Rest: based on artists, keywords from liked/history songs
   */
  getRecommendations(nickname: string, limit: number = 10): any[] {
    const user = getUser(nickname);
    const recommendations: any[] = [];
    const seen = new Set<string>();
    
    // Step 1: First 2 songs from likes and history (prioritize liked songs)
    const firstTwoSongs: any[] = [];
    
    // Add liked songs first
    if (user.likes && user.likes.length > 0) {
      for (const song of user.likes) {
        if (song.videoId && !seen.has(song.videoId) && firstTwoSongs.length < 2) {
          seen.add(song.videoId);
          firstTwoSongs.push(song);
        }
      }
    }
    
    // Fill remaining slots with history songs
    if (firstTwoSongs.length < 2 && user.history && user.history.length > 0) {
      for (const song of user.history) {
        if (song.videoId && !seen.has(song.videoId) && firstTwoSongs.length < 2) {
          seen.add(song.videoId);
          firstTwoSongs.push(song);
        }
      }
    }
    
    recommendations.push(...firstTwoSongs);
    
    // If we already have enough, return early
    if (recommendations.length >= limit) {
      return recommendations.slice(0, limit);
    }
    
    // Step 2: Extract artists and keywords from all user songs
    const allUserSongs = [
      ...(user.likes || []),
      ...(user.history || [])
    ];
    
    if (allUserSongs.length === 0) {
      return recommendations;
    }
    
    // Extract unique artists
    const artists = new Set<string>();
    allUserSongs.forEach(song => {
      if (song.artist) {
        // Split by common separators and clean up
        song.artist.split(/[,&、，]/).forEach(artist => {
          const cleaned = artist.trim();
          if (cleaned && cleaned.length > 0) {
            artists.add(cleaned);
          }
        });
      }
    });
    
    // Extract keywords from titles (remove common words)
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them']);
    const keywords = new Set<string>();
    allUserSongs.forEach(song => {
      if (song.title) {
        // Extract meaningful words from title
        const words = song.title.toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter(word => word.length > 2 && !commonWords.has(word));
        words.forEach(word => keywords.add(word));
      }
    });
    
    // Return recommendations with metadata for async search
    // Note: This function now returns a structure that indicates what to search
    return {
      firstTwo: recommendations,
      artists: Array.from(artists),
      keywords: Array.from(keywords),
      seen: seen,
      limit: limit,
    };
  },
};





