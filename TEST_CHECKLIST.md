# 功能測試檢查清單

## API 功能測試（1-9 項）

### 1. 播放控制 (Playback Control)
- [ ] 播放 (`api.control('play')`)
- [ ] 暫停 (`api.control('pause')`)
- [ ] 切換播放/暫停 (`api.control('toggle-play')`)
- [ ] 下一首 (`api.control('next')`)
- [ ] 上一首 (`api.control('previous')`)

### 2. 搜尋 (Search)
- [ ] 搜尋歌曲 (`api.search(query)`)
- [ ] 搜尋結果解析正確
- [ ] 搜尋結果顯示在 UI 中

### 3. 佇列管理 (Queue Management)
- [ ] 獲取佇列 (`api.queue()`)
- [ ] 加入佇列 (`api.enqueue()`)
  - [ ] 加入最後 (`INSERT_AT_END`)
  - [ ] 插播 (`INSERT_AFTER_CURRENT_VIDEO`)
- [ ] 刪除佇列項目 (`api.queueDelete(index)`)
- [ ] 設置佇列索引 (`api.setQueueIndex(index)`)
- [ ] 移動歌曲 (`api.moveSongInQueue(index, toIndex)`)
- [ ] 清除佇列 (`api.clearQueue()`)

### 4. 當前歌曲資訊 (Current Song Info)
- [ ] 獲取當前歌曲 (`api.currentSong()`)
- [ ] 顯示歌曲資訊（標題、歌手、縮圖）
- [ ] 顯示播放進度
- [ ] 顯示播放時間

### 5. 音量控制 (Volume Control)
- [ ] 獲取音量 (`api.volume.get()`)
- [ ] 設置音量 (`api.volume.set(volume)`)
- [ ] 切換靜音 (`api.toggleMute()`)
- [ ] 音量滑桿功能

### 6. 進度控制 (Seek Control)
- [ ] 跳轉到指定時間 (`api.seek(seconds)`)
- [ ] 向後跳轉 (`api.goBack(seconds)`)
- [ ] 向前跳轉 (`api.goForward(seconds)`)
- [ ] 進度條拖曳功能

### 7. 重複模式 (Repeat Mode)
- [ ] 獲取重複模式 (`api.repeatMode.get()`)
- [ ] 切換重複模式 (`api.repeatMode.switch()`)
- [ ] 顯示重複模式狀態（無/全部/單曲）

### 8. 隨機播放 (Shuffle)
- [ ] 獲取隨機播放狀態 (`api.shuffle.get()`)
- [ ] 切換隨機播放 (`api.shuffle.toggle()`)
- [ ] 顯示隨機播放狀態

### 9. 喜歡狀態 (Like/Dislike)
- [ ] 獲取喜歡狀態 (`api.like.get()`)
- [ ] 標記喜歡 (`api.like.set()`)
- [ ] 標記不喜歡 (`api.like.dislike()`)
- [ ] 顯示喜歡狀態

## UI 功能測試

### 搜尋功能
- [ ] 搜尋輸入框
- [ ] 搜尋結果列表
- [ ] 點擊歌曲播放（從頭開始）
- [ ] 三個點選單
  - [ ] 加入佇列
  - [ ] 插播（當前歌曲後）

### 播放器控制
- [ ] 播放/暫停按鈕
- [ ] 上一首/下一首按鈕
- [ ] 進度條
- [ ] 時間顯示
- [ ] 音量控制
- [ ] 靜音按鈕
- [ ] 重複模式按鈕
- [ ] 隨機播放按鈕
- [ ] 喜歡按鈕

### 佇列管理
- [ ] 顯示播放清單
- [ ] 點擊歌曲跳轉
- [ ] 左滑刪除歌曲
- [ ] 移動歌曲（上/下）
- [ ] 清除全部按鈕
- [ ] 展開/收合功能

### 用戶功能（需要暱稱）
- [ ] 暱稱輸入
- [ ] 歷史記錄顯示
- [ ] 歷史記錄刪除
- [ ] 清除歷史
- [ ] 喜歡的歌曲顯示
- [ ] 取消喜歡
- [ ] 推薦歌曲顯示
- [ ] 刷新推薦

## 測試步驟

1. **啟動 YTMD Desktop 應用程式**
   - 確保 YTMD Desktop 正在運行
   - 確認 API 服務器在 `http://localhost:26538` 運行

2. **啟動前端開發服務器**
   ```bash
   npm run dev
   ```

3. **測試基本連接**
   - 打開瀏覽器訪問前端界面
   - 檢查是否能獲取當前歌曲資訊
   - 檢查是否能獲取佇列

4. **逐一測試每個功能**
   - 按照上述檢查清單逐項測試
   - 記錄任何錯誤或異常行為

5. **測試用戶功能**
   - 輸入暱稱
   - 測試歷史記錄和喜歡的歌曲功能

## 已知問題

- 如果 YTMD Desktop 未運行，所有 API 調用會失敗
- 某些 API 端點可能返回 404（如 `/like-state`），已做錯誤處理





