/* API client for YTMD Desktop API */

const importMeta: any = import.meta;

// Get API base URL from URL parameters or environment variable
function getApiBaseUrl(): string {
  // Check URL parameters first (ip or host, and optional port)
  const urlParams = new URLSearchParams(window.location.search);
  const ip = urlParams.get('ip') || urlParams.get('host');
  const port = urlParams.get('port') || '26538';
  
  // If IP/host is provided, use it
  if (ip) {
    // Support both IP address and hostname
    return `http://${ip}:${port}/api/v1`;
  }
  
  // If no IP parameter, default to localhost
  // Check environment variable first, otherwise use localhost
  if (importMeta?.env?.VITE_YTMD_API_URL) {
    return importMeta.env.VITE_YTMD_API_URL;
  }
  
  // Default to localhost
  return `http://localhost:${port}/api/v1`;
}

// Dynamic BASE URL that can be updated
let BASE = getApiBaseUrl();

// Function to update API base URL (useful for runtime changes)
export function setApiBaseUrl(url: string) {
  BASE = url;
}

// Function to get current API base URL
export function getApiBaseUrlValue(): string {
  return BASE;
}

// Function to reinitialize API base URL from URL parameters
export function reinitializeApiBaseUrl() {
  BASE = getApiBaseUrl();
  console.log('API Base URL updated to:', BASE);
}

// Function to get current target IP/port from URL or return default
export function getCurrentTarget(): { ip: string | null; port: string; display: string } {
  const urlParams = new URLSearchParams(window.location.search);
  const ip = urlParams.get('ip') || urlParams.get('host');
  const port = urlParams.get('port') || '26538';
  
  if (ip) {
    return { ip, port, display: `${ip}:${port}` };
  }
  
  // Return default localhost (when no parameter provided)
  return { ip: 'localhost', port, display: `localhost:${port}` };
}

async function j<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    if (res.status === 204) return undefined as unknown as T;
    throw new Error(`${res.status}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

export type QueueItem = {
  title: string;
  artist: string;
  duration: string;
  videoId: string;
  index: number;
  thumbnail: string;
};

export type CurrentSong = {
  videoId: string | null;
  title?: string;
  artist?: string;
  isPaused?: boolean;
  elapsedSeconds?: number;
  songDuration?: number;
};

// Helper function to parse YTMD queue response
function parseQueueResponse(data: any): QueueItem[] {
  if (!data || !data.items) return [];
  
  const items: QueueItem[] = [];
  data.items.forEach((item: any, index: number) => {
    if (item.playlistPanelVideoRenderer) {
      const renderer = item.playlistPanelVideoRenderer;
      
      // Extract title
      let title = 'Unknown Title';
      if (renderer.title?.runs?.[0]?.text) {
        title = renderer.title.runs[0].text;
      }
      
      // Extract artist
      let artist = 'Unknown Artist';
      if (renderer.longBylineText?.runs) {
        for (const run of renderer.longBylineText.runs) {
          if (run.text && run.text.trim() !== ' • ') {
            artist = run.text;
            break;
          }
        }
      }
      
      // Extract duration
      let duration = '';
      if (renderer.lengthText?.runs?.[0]?.text) {
        duration = renderer.lengthText.runs[0].text;
      }
      
      // Extract videoId
      const videoId = renderer.videoId || '';
      
      // Extract thumbnail
      let thumbnail = '';
      if (renderer.thumbnail?.thumbnails?.length > 0) {
        thumbnail = renderer.thumbnail.thumbnails[renderer.thumbnail.thumbnails.length - 1].url || '';
      }
      if (!thumbnail && videoId) {
        thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      }
      
      items.push({
        title,
        artist,
        duration,
        videoId,
        index,
        thumbnail,
      });
    }
  });
  
  return items;
}

export const api = {
  // Health check - not available in YTMD API, so we check song endpoint
  health: async () => {
    try {
      await j('/song');
      return { status: 'ok', queue_connected: true };
    } catch {
      return { status: 'error', queue_connected: false };
    }
  },
  
  // Config - not available in YTMD API
  config: () => Promise.resolve({}),
  
  // Get queue
  queue: async (): Promise<QueueItem[]> => {
    try {
      const data = await j<any>('/queue');
      return parseQueueResponse(data);
    } catch (error) {
      console.error('Failed to get queue:', error);
      return [];
    }
  },
  
  // Get current song
  currentSong: async (): Promise<CurrentSong> => {
    try {
      const data = await j<any>('/song');
      if (!data) {
        return { videoId: null };
      }
      
      // Extract thumbnail
      let thumbnail = '';
      if (data.thumbnails?.length > 0) {
        thumbnail = data.thumbnails[data.thumbnails.length - 1].url || '';
      }
      if (!thumbnail && data.videoId) {
        thumbnail = `https://i.ytimg.com/vi/${data.videoId}/hqdefault.jpg`;
      }
      
      return {
        videoId: data.videoId || null,
        title: data.title || '',
        artist: data.artist || '',
        isPaused: data.isPaused ?? true,
        elapsedSeconds: data.elapsedSeconds || 0,
        songDuration: data.songDuration || 0,
      };
    } catch (error) {
      console.error('Failed to get current song:', error);
      return { videoId: null };
    }
  },
  
  // Search
  search: async (q: string): Promise<any> => {
    try {
      // YTMD search API may return JSON string or parsed object
      const response = await fetch(getApiBaseUrlValue() + '/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}`);
      }
      
      // Get response as text first to handle both JSON string and object
      const text = await response.text();
      
      let parsedData: any;
      try {
        // Try to parse as JSON
        parsedData = JSON.parse(text);
      } catch (e) {
        // If parsing fails, try to use text directly (might already be an object)
        try {
          parsedData = text;
        } catch {
          console.error('Failed to parse search response:', e);
          return null;
        }
      }
      
      // Log for debugging
      console.log('Search response type:', typeof parsedData);
      console.log('Search response:', parsedData);
      
      return parsedData;
    } catch (error) {
      console.error('Search failed:', error);
      return null;
    }
  },
  
  // Add song to queue
  enqueue: async (
    song: QueueItem | { videoId: string; title?: string; artist?: string; duration?: string; thumbnail?: string },
    nickname?: string,
    insertPosition?: 'INSERT_AT_END' | 'INSERT_AFTER_CURRENT_VIDEO'
  ): Promise<{ success: boolean; message: string }> => {
    try {
      await j<void>('/queue', {
        method: 'POST',
        body: JSON.stringify({
          videoId: song.videoId,
          insertPosition: insertPosition || 'INSERT_AT_END',
        }),
      });
      return { success: true, message: '歌曲已加入佇列' };
    } catch (error) {
      console.error('Failed to enqueue:', error);
      return { success: false, message: '加入佇列失敗' };
    }
  },
  
  // Playback controls
  control: (action: 'play' | 'pause' | 'next' | 'previous' | 'toggle-play') => {
    const actionMap: Record<string, string> = {
      'play': '/play',
      'pause': '/pause',
      'next': '/next',
      'previous': '/previous',
      'toggle-play': '/toggle-play',
    };
    return j<void>(actionMap[action] || '/toggle-play', { method: 'POST' });
  },
  
  // Seek
  seek: (seconds: number) => j<void>('/seek-to', {
    method: 'POST',
    body: JSON.stringify({ seconds }),
  }),
  
  // Go back/forward
  goBack: (seconds: number) => j<void>('/go-back', {
    method: 'POST',
    body: JSON.stringify({ seconds }),
  }),
  goForward: (seconds: number) => j<void>('/go-forward', {
    method: 'POST',
    body: JSON.stringify({ seconds }),
  }),
  
  // Volume
  volume: {
    get: async (): Promise<{ state: number; isMuted: boolean }> => {
      try {
        const data = await j<{ state: number; isMuted: boolean }>('/volume');
        return data || { state: 0, isMuted: false };
      } catch (error) {
        console.error('Failed to get volume:', error);
        return { state: 0, isMuted: false };
      }
    },
    set: (v: number) => j<void>('/volume', {
      method: 'POST',
      body: JSON.stringify({ volume: v }),
    }),
  },
  
  // Queue management
  queueDelete: (index: number) => j<void>(`/queue/${index}`, { method: 'DELETE' }),
  setQueueIndex: (index: number) => j<void>('/queue', {
    method: 'PATCH',
    body: JSON.stringify({ index }),
  }),
  clearQueue: () => j<void>('/queue', { method: 'DELETE' }),
  moveSongInQueue: (index: number, toIndex: number) => j<void>(`/queue/${index}`, {
    method: 'PATCH',
    body: JSON.stringify({ toIndex }),
  }),
  
  // Repeat mode
  repeatMode: {
    get: async (): Promise<'NONE' | 'ALL' | 'ONE' | null> => {
      try {
        const data = await j<{ mode: 'NONE' | 'ALL' | 'ONE' | null }>('/repeat-mode');
        return data?.mode ?? null;
      } catch (error) {
        console.error('Failed to get repeat mode:', error);
        return null;
      }
    },
    switch: (iteration: number = 1) => j<void>('/switch-repeat', {
      method: 'POST',
      body: JSON.stringify({ iteration }),
    }),
  },
  
  // Shuffle
  shuffle: {
    get: async (): Promise<boolean> => {
      try {
        const data = await j<{ state: boolean | null }>('/shuffle');
        return data?.state ?? false;
      } catch (error) {
        console.error('Failed to get shuffle state:', error);
        return false;
      }
    },
    toggle: () => j<void>('/shuffle', { method: 'POST' }),
  },
  
  // Mute
  toggleMute: () => j<void>('/toggle-mute', { method: 'POST' }),
  
  // Like/Dislike
  like: {
    get: async (): Promise<'LIKE' | 'DISLIKE' | 'INDIFFERENT' | null> => {
      try {
        const data = await j<{ state: 'LIKE' | 'DISLIKE' | 'INDIFFERENT' | null }>('/like-state');
        return data?.state ?? null;
      } catch (error: any) {
        // 如果 API 不支持 like-state（404），靜默返回 null
        if (error?.message === '404') {
          return null;
        }
        // 其他錯誤才記錄
        console.error('Failed to get like state:', error);
        return null;
      }
    },
    set: () => j<void>('/like', { method: 'POST' }),
    dislike: () => j<void>('/dislike', { method: 'POST' }),
  },
  
  // Fullscreen
  fullscreen: {
    get: async (): Promise<boolean> => {
      try {
        const data = await j<{ state: boolean }>('/fullscreen');
        return data?.state ?? false;
      } catch (error) {
        console.error('Failed to get fullscreen state:', error);
        return false;
      }
    },
    set: (state: boolean) => j<void>('/fullscreen', {
      method: 'POST',
      body: JSON.stringify({ state }),
    }),
  },
  
  // Play song from beginning (add to queue and set as current)
  playSong: async (videoId: string, insertPosition?: 'INSERT_AT_END' | 'INSERT_AFTER_CURRENT_VIDEO'): Promise<void> => {
    // First, add song to queue
    await j<void>('/queue', {
      method: 'POST',
      body: JSON.stringify({
        videoId,
        insertPosition: insertPosition || 'INSERT_AT_END',
      }),
    });
    
    // Then, find the song in queue and set it as current
    const queue = await api.queue();
    const songIndex = queue.findIndex(item => item.videoId === videoId);
    if (songIndex >= 0) {
      await api.setQueueIndex(songIndex);
      await api.control('play');
    }
  },
  
  // User management - these will be handled by localStorage (see userStorage.ts)
  // Keeping the interface for compatibility
  user: {
    history: (nickname: string) => {
      // This will be handled by userStorage
      return Promise.resolve([]);
    },
    clearHistory: (nickname: string) => {
      // This will be handled by userStorage
      return Promise.resolve();
    },
    removeHistoryItem: (nickname: string, videoId: string) => {
      // This will be handled by userStorage
      return Promise.resolve();
    },
    likes: (nickname: string) => {
      // This will be handled by userStorage
      return Promise.resolve([]);
    },
    like: (nickname: string, item: any) => {
      // This will be handled by userStorage
      return Promise.resolve();
    },
    unlike: (nickname: string, videoId: string) => {
      // This will be handled by userStorage
      return Promise.resolve();
    },
    recommendations: (nickname: string) => {
      // Not available in YTMD API
      return Promise.resolve([]);
    },
  },
  
};

export async function raw<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, init);
  if (!res.ok) {
    if (res.status === 204) return undefined as unknown as T;
    throw new Error(`${res.status}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}
