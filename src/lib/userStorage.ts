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
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to read user storage:', error);
  }
  return { users: {} };
}

/**
 * Save all user data to localStorage
 */
function saveStorageData(data: StorageData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save user storage:', error);
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
  },

  /**
   * Get user history
   */
  getHistory(nickname: string): any[] {
    const user = getUser(nickname);
    return user.history || [];
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
    if (!item || !item.videoId) return;
    
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
    const user = getUser(nickname);
    return user.likes || [];
  },

  /**
   * Get recommendations (not implemented, returns empty array)
   */
  getRecommendations(nickname: string): any[] {
    // Not implemented in localStorage version
    return [];
  },
};





