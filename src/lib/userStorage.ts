/**
 * User storage service using server-side API
 * Stores user data on the server in data/ directory
 */

// Get API base URL for user data API
function getUserDataApiUrl(): string {
  // Use current page's origin for API calls
  // The API server should be proxied through nginx at /api/users/*
  return window.location.origin;
}

/**
 * Make API request to user data server
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${getUserDataApiUrl()}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return response.json();
}

export const userStorage = {
  /**
   * Add item to user history
   */
  async addHistory(nickname: string, item: any): Promise<void> {
    if (!nickname || !nickname.trim()) {
      console.warn('[USER STORAGE] Cannot add history: nickname is empty');
      return;
    }
    if (!item || !item.videoId) {
      console.warn('[USER STORAGE] Cannot add history: item is invalid', item);
      return;
    }
    try {
      const result = await apiRequest<{ success: boolean; count: number }>(
        `/api/users/${encodeURIComponent(nickname)}/history`,
        {
          method: 'POST',
          body: JSON.stringify(item),
        }
      );
      console.log(`[USER STORAGE] Added to history for "${nickname}":`, item.videoId, `(total: ${result.count} items)`);
    } catch (error) {
      console.error(`[USER STORAGE] Failed to add history for "${nickname}":`, error);
      throw error;
    }
  },

  /**
   * Get user history
   */
  async getHistory(nickname: string): Promise<any[]> {
    if (!nickname || !nickname.trim()) {
      console.warn('[USER STORAGE] Cannot get history: nickname is empty');
      return [];
    }
    try {
      const history = await apiRequest<any[]>(
        `/api/users/${encodeURIComponent(nickname)}/history`
      );
      console.log(`[USER STORAGE] Retrieved history for "${nickname}": ${history.length} items`);
      return history || [];
    } catch (error) {
      console.error(`[USER STORAGE] Failed to get history for "${nickname}":`, error);
      return [];
    }
  },

  /**
   * Clear user history
   */
  async clearHistory(nickname: string): Promise<void> {
    if (!nickname || !nickname.trim()) {
      console.warn('[USER STORAGE] Cannot clear history: nickname is empty');
      return;
    }
    try {
      await apiRequest(
        `/api/users/${encodeURIComponent(nickname)}/history`,
        {
          method: 'DELETE',
        }
      );
      console.log(`[USER STORAGE] Cleared history for "${nickname}"`);
    } catch (error) {
      console.error(`[USER STORAGE] Failed to clear history for "${nickname}":`, error);
      throw error;
    }
  },

  /**
   * Remove specific item from history
   */
  async removeHistoryItem(nickname: string, videoId: string): Promise<void> {
    if (!nickname || !nickname.trim()) {
      console.warn('[USER STORAGE] Cannot remove history item: nickname is empty');
      return;
    }
    try {
      await apiRequest(
        `/api/users/${encodeURIComponent(nickname)}/history/${encodeURIComponent(videoId)}`,
        {
          method: 'DELETE',
        }
      );
      console.log(`[USER STORAGE] Removed history item for "${nickname}":`, videoId);
    } catch (error) {
      console.error(`[USER STORAGE] Failed to remove history item for "${nickname}":`, error);
      throw error;
    }
  },

  /**
   * Add song to likes
   */
  async likeSong(nickname: string, item: any): Promise<void> {
    if (!nickname || !nickname.trim()) {
      console.warn('[USER STORAGE] Cannot like song: nickname is empty');
      return;
    }
    if (!item || !item.videoId) {
      console.warn('[USER STORAGE] Cannot like song: item is invalid', item);
      return;
    }
    try {
      const result = await apiRequest<{ success: boolean; count: number; message?: string }>(
        `/api/users/${encodeURIComponent(nickname)}/likes`,
        {
          method: 'POST',
          body: JSON.stringify(item),
        }
      );
      if (result.message === 'Already liked') {
        console.log(`[USER STORAGE] Song already liked for "${nickname}":`, item.videoId);
      } else {
        console.log(`[USER STORAGE] Added to likes for "${nickname}":`, item.videoId, `(total: ${result.count} items)`);
      }
    } catch (error) {
      console.error(`[USER STORAGE] Failed to like song for "${nickname}":`, error);
      throw error;
    }
  },

  /**
   * Remove song from likes
   */
  async unlikeSong(nickname: string, videoId: string): Promise<void> {
    if (!nickname || !nickname.trim()) {
      console.warn('[USER STORAGE] Cannot unlike song: nickname is empty');
      return;
    }
    try {
      await apiRequest(
        `/api/users/${encodeURIComponent(nickname)}/likes/${encodeURIComponent(videoId)}`,
        {
          method: 'DELETE',
        }
      );
      console.log(`[USER STORAGE] Removed like for "${nickname}":`, videoId);
    } catch (error) {
      console.error(`[USER STORAGE] Failed to unlike song for "${nickname}":`, error);
      throw error;
    }
  },

  /**
   * Get user likes
   */
  async getLikes(nickname: string): Promise<any[]> {
    if (!nickname || !nickname.trim()) {
      console.warn('[USER STORAGE] Cannot get likes: nickname is empty');
      return [];
    }
    try {
      const likes = await apiRequest<any[]>(
        `/api/users/${encodeURIComponent(nickname)}/likes`
      );
      console.log(`[USER STORAGE] Retrieved likes for "${nickname}": ${likes.length} items`);
      return likes || [];
    } catch (error) {
      console.error(`[USER STORAGE] Failed to get likes for "${nickname}":`, error);
      return [];
    }
  },

  /**
   * Get recommendations based on user history and liked songs
   * First 2 songs: from likes and history
   * Rest: based on artists, keywords from liked/history songs
   */
  async getRecommendations(nickname: string, limit: number = 10): Promise<any> {
    if (!nickname || !nickname.trim()) {
      console.warn('[USER STORAGE] Cannot get recommendations: nickname is empty');
      return {
        firstTwo: [],
        artists: [],
        keywords: [],
        seen: new Set(),
        limit: limit,
      };
    }
    try {
      const result = await apiRequest<{
        firstTwo: any[];
        artists: string[];
        keywords: string[];
        seen: string[];
        limit: number;
      }>(
        `/api/users/${encodeURIComponent(nickname)}/recommendations?limit=${limit}`
      );
      // Convert seen array back to Set
      return {
        ...result,
        seen: new Set(result.seen || []),
      };
    } catch (error) {
      console.error(`[USER STORAGE] Failed to get recommendations for "${nickname}":`, error);
      return {
        firstTwo: [],
        artists: [],
        keywords: [],
        seen: new Set(),
        limit: limit,
      };
    }
  },
};
