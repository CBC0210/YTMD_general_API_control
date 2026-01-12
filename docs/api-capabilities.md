# YTMD Desktop API 功能列表

本文檔列出所有可用的 YTMD Desktop API 功能。

## 1. 播放控制 (Playback Control)

- **`play()`** - 開始播放
- **`pause()`** - 暫停播放
- **`togglePlay()`** - 切換播放/暫停狀態
- **`next()`** - 播放下一首
- **`previous()`** - 播放上一首

## 2. 搜尋 (Search)

- **`search(query: string)`** - 搜尋歌曲
  - 返回複雜的 JSON 結構，包含 `tabbedSearchResultsRenderer` 等

## 3. 佇列管理 (Queue Management)

- **`queue()`** - 獲取當前佇列列表
- **`enqueue(song, nickname?, insertPosition?)`** - 將歌曲加入佇列
  - `insertPosition`: `'INSERT_AT_END'` (加入最後) 或 `'INSERT_AFTER_CURRENT_VIDEO'` (插播)
- **`queueDelete(index)`** - 從佇列中刪除指定索引的歌曲
- **`setQueueIndex(index)`** - 設置當前播放的佇列索引（切換到指定歌曲）
- **`clearQueue()`** - 清空整個佇列（⚠️ 注意：這會停止播放）
- **`moveSongInQueue(index, toIndex)`** - 移動佇列中的歌曲位置（API 支援但未在客戶端實現）

## 4. 當前歌曲資訊 (Current Song Info)

- **`currentSong()`** - 獲取當前播放的歌曲資訊
  - 返回：`videoId`, `title`, `artist`, `isPaused`, `elapsedSeconds`, `songDuration`

## 5. 音量控制 (Volume Control)

- **`volume.get()`** - 獲取當前音量狀態
  - 返回：`{ state: number, isMuted: boolean }`
- **`volume.set(volume: number)`** - 設置音量 (0-100)
- **`toggleMute()`** - 切換靜音狀態

## 6. 進度控制 (Seek Control)

- **`seek(seconds: number)`** - 跳轉到指定時間點
- **`goBack(seconds: number)`** - 向後跳轉指定秒數
- **`goForward(seconds: number)`** - 向前跳轉指定秒數

## 7. 重複模式 (Repeat Mode)

- **`repeatMode.get()`** - 獲取當前重複模式
  - 返回：`'NONE'` | `'ALL'` | `'ONE'` | `null`
- **`repeatMode.switch(iteration?: number)`** - 切換重複模式
  - `iteration`: 點擊次數（預設為 1）

## 8. 隨機播放 (Shuffle)

- **`shuffle.get()`** - 獲取隨機播放狀態
  - 返回：`boolean`
- **`shuffle.toggle()`** - 切換隨機播放狀態

## 9. 喜歡狀態 (Like/Dislike)

- **`like.get()`** - 獲取當前歌曲的喜歡狀態
  - 返回：`'LIKE'` | `'DISLIKE'` | `'INDIFFERENT'` | `null`
- **`like.set()`** - 標記當前歌曲為喜歡
- **`like.dislike()`** - 標記當前歌曲為不喜歡

## 10. 全螢幕 (Fullscreen)

- **`fullscreen.get()`** - 獲取全螢幕狀態
  - 返回：`boolean`
- **`fullscreen.set(state: boolean)`** - 設置全螢幕狀態

## 11. 用戶管理 (User Management)

⚠️ **注意**：這些功能在 YTMD Desktop API 中不可用，已改用 `localStorage` 實現（見 `userStorage.ts`）

- **`user.history(nickname)`** - 獲取播放歷史（使用 localStorage）
- **`user.clearHistory(nickname)`** - 清除播放歷史（使用 localStorage）
- **`user.removeHistoryItem(nickname, videoId)`** - 移除歷史項目（使用 localStorage）
- **`user.likes(nickname)`** - 獲取喜歡的歌曲列表（使用 localStorage）
- **`user.like(nickname, item)`** - 添加喜歡的歌曲（使用 localStorage）
- **`user.unlike(nickname, videoId)`** - 移除喜歡的歌曲（使用 localStorage）
- **`user.recommendations(nickname)`** - 獲取推薦（目前返回空陣列）

## 使用範例

```typescript
import { api } from './lib/api';

// 播放控制
await api.control('play');
await api.control('pause');
await api.control('next');

// 搜尋
const results = await api.search('周杰倫');

// 加入佇列
await api.enqueue({
  videoId: 'abc123',
  title: '歌曲名稱',
  artist: '歌手',
}, undefined, 'INSERT_AT_END');

// 設置音量
await api.volume.set(50);

// 切換重複模式
await api.repeatMode.switch(1);

// 切換隨機播放
await api.shuffle.toggle();
```

## 重要注意事項

1. **`clearQueue()` 會停止播放**：清空佇列後，如果沒有歌曲在播放，播放會停止。因此，如果要「從頭開始播放」某首歌曲，應該：
   - 檢查歌曲是否已在佇列中
   - 如果不在，加入佇列
   - 使用 `setQueueIndex()` 設置為當前播放索引
   - 調用 `play()` 開始播放

2. **搜尋結果解析**：YTMD API 返回的搜尋結果結構複雜，需要正確解析 `tabbedSearchResultsRenderer` 結構。

3. **API 基礎 URL**：預設為 `http://localhost:26538/api/v1`，可通過環境變數 `VITE_YTMD_API_URL` 配置。





