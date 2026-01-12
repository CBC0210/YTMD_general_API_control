# YTMD_BC 實現方式分析

## 關鍵發現

### 1. 進度條（elapsedSeconds）的實現

YTMD_BC 使用 **MutationObserver** 監聽 DOM 元素的實時變化：

```typescript
// src/providers/song-info-front.ts
export const setupTimeChangedListener = singleton(() => {
  const progressObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      const target = mutation.target as Node & { value: string };
      const numberValue = Number(target.value);
      window.ipcRenderer.send('ytmd:time-changed', numberValue);
      songInfo.elapsedSeconds = numberValue;
    }
  });
  const progressBar = document.querySelector('#progress-bar');
  if (progressBar) {
    progressObserver.observe(progressBar, { attributeFilter: ['value'] });
  }
});
```

**工作流程：**
1. 監聽 `#progress-bar` 元素的 `value` 屬性變化
2. 當 `value` 改變時，立即通過 IPC 發送 `ytmd:time-changed` 事件
3. API Server 在主進程中接收事件，更新內部的 `songInfo.elapsedSeconds`
4. API 端點返回的是**實時維護的狀態**，而不是每次請求時從 DOM 讀取

### 2. 音量（volume）的實現

YTMD_BC 監聽 `<video>` 元素的 `volumechange` 事件：

```typescript
// src/providers/song-info-front.ts
export const setupVolumeChangedListener = singleton((api: YoutubePlayer) => {
  document.querySelector('video')?.addEventListener('volumechange', () => {
    window.ipcRenderer.send('ytmd:volume-changed', {
      state: api.getVolume(),
      isMuted: api.isMuted(),
    });
  });
  
  // 發送初始值
  window.ipcRenderer.send('ytmd:volume-changed', {
    state: api.getVolume(),
    isMuted: api.isMuted(),
  });
});
```

**工作流程：**
1. 監聽 `<video>` 元素的 `volumechange` 事件
2. 使用 `api.getVolume()` 和 `api.isMuted()` 獲取當前值
3. 通過 IPC 發送 `ytmd:volume-changed` 事件
4. API Server 在主進程中接收事件，更新內部的 `volumeState`
5. API 端點返回的是**實時維護的狀態**

### 3. API Server 的狀態管理

```typescript
// src/plugins/api-server/backend/main.ts
export const backend = createBackend<BackendType, APIServerConfig>({
  async start(ctx) {
    // 註冊回調，當 songInfo 更新時觸發
    registerCallback((songInfo) => {
      this.songInfo = songInfo;
    });
    
    // 監聽 IPC 事件，更新狀態
    ctx.ipc.on('ytmd:volume-changed', (newVolumeState: VolumeState) => {
      this.volumeState = newVolumeState;
    });
  }
});
```

**關鍵點：**
- API Server 是 **Electron 插件**，運行在主進程中
- 它維護**實時狀態**（`this.songInfo`, `this.volumeState`）
- 當 DOM 變化時，通過 IPC 事件更新這些狀態
- API 端點返回的是這些**實時維護的狀態**，而不是每次請求時重新讀取

### 4. API 端點的實現

```typescript
// src/plugins/api-server/backend/routes/control.ts
app.openapi(routes.songInfo, async (ctx) => {
  const info = await songInfoGetter(); // 返回 this.songInfo（實時狀態）
  if (!info) {
    ctx.status(204);
    return ctx.body(null);
  }
  return ctx.json(body satisfies ResponseSongInfo);
});

app.openapi(routes.getVolumeState, async (ctx) => {
  return ctx.json(
    (await volumeStateGetter()) ?? { state: 0, isMuted: false },
    // volumeStateGetter() 返回 this.volumeState（實時狀態）
  );
});
```

## 為什麼我們的實現無法獲取正確的值？

### 問題根源

1. **我們是外部 Web 應用**：我們無法直接訪問 YTMD 的 DOM 或 IPC 通信
2. **HTTP API 的限制**：我們只能通過 HTTP 請求獲取數據
3. **API 返回的是靜態快照**：雖然 YTMD_BC 的 API Server 維護實時狀態，但當我們通過 HTTP 請求時，可能：
   - API Server 沒有正確初始化狀態監聽器
   - 狀態更新有延遲
   - 或者 API 實現有問題，返回了初始值（0）

### 測試結果

從我們的測試中發現：
- `/api/v1/song` 返回的 `elapsedSeconds` 總是 `0`
- `/api/v1/volume` 返回的 `state` 總是 `0`

這表明：
1. 要麼 API Server 的狀態監聽器沒有正確設置
2. 要麼狀態更新機制有問題
3. 要麼這是 YTMD API 的已知限制

## 解決方案

### 方案 1：完全依賴前端狀態（當前實現）

**優點：**
- 不依賴 API 的實時更新
- 響應速度快
- 用戶體驗流暢

**缺點：**
- 刷新頁面後會重置為 0
- 需要前端計時器持續運行

### 方案 2：使用 WebSocket（如果 YTMD_BC 支持）

如果 YTMD_BC 的 API Server 支持 WebSocket，我們可以：
- 建立 WebSocket 連接
- 接收實時狀態更新
- 同步前端狀態

### 方案 3：更頻繁的輪詢 + 智能同步

- 增加 API 輪詢頻率
- 只在 API 返回有效值時同步
- 保持前端計時器作為主要數據源

## 重要發現：WebSocket 支持

YTMD_BC 的 API Server **支持 WebSocket**，可以實時推送狀態更新：

```typescript
// src/plugins/api-server/backend/routes/websocket.ts
app.openapi(
  createRoute({
    method: 'get',
    path: `/api/${API_VERSION}/ws`,
    summary: 'websocket endpoint',
    description: 'WebSocket endpoint for real-time updates',
  }),
  upgradeWebSocket(() => ({
    onOpen(_, ws) {
      // 發送當前播放器狀態
      ws.send(JSON.stringify({
        type: DataTypes.PlayerInfo,
        ...createPlayerState({
          songInfo: lastSongInfo,
          volumeState,
          repeat,
          shuffle,
        }),
      }));
    },
  }))
);
```

**WebSocket 推送的事件類型：**
- `POSITION_CHANGED`: 播放位置變化（`elapsedSeconds`）
- `VOLUME_CHANGED`: 音量變化
- `PLAYER_STATE_CHANGED`: 播放/暫停狀態變化
- `VIDEO_CHANGED`: 歌曲切換

## 測試結果

通過測試 `172.24.8.204:26538` 的 API：
- `/api/v1/song` 返回的 `elapsedSeconds` **總是 0**，即使歌曲在播放
- `/api/v1/volume` 返回的 `state` **總是 0**
- 這表明 **HTTP API 端點沒有正確返回實時狀態**

可能的原因：
1. API Server 的狀態監聽器沒有正確初始化
2. DOM 監聽器沒有正確設置
3. IPC 事件沒有正確觸發
4. 或者這是 YTMD API 的已知限制

## 結論

### YTMD_BC 能夠正確顯示進度和音量的原因：

1. **它是 Electron 插件**，可以直接監聽 DOM 變化
2. **使用 IPC 通信**，實時更新內部狀態
3. **API 返回的是實時維護的狀態**，而不是每次請求時重新讀取
4. **支持 WebSocket**，可以實時推送狀態更新

### 我們的 Web 應用面臨的限制：

1. **無法直接訪問 DOM 或 IPC**
2. **只能通過 HTTP API 獲取數據**
3. **HTTP API 端點沒有正確返回實時狀態**（總是返回 0）
4. **可以考慮使用 WebSocket**，但需要實現 WebSocket 客戶端

### 解決方案建議：

#### 方案 1：使用 WebSocket（推薦，如果 API Server 正常工作）

如果 YTMD_BC 的 API Server 正常工作，我們可以：
- 連接到 `/api/v1/ws` WebSocket 端點
- 接收實時狀態更新（`POSITION_CHANGED`, `VOLUME_CHANGED` 等）
- 同步前端狀態

**優點：**
- 實時更新，準確性高
- 減少 HTTP 請求次數
- 與 YTMD_BC 的設計一致

**缺點：**
- 需要實現 WebSocket 客戶端
- 如果 API Server 有問題，WebSocket 也可能無法正常工作

#### 方案 2：完全依賴前端狀態（當前實現）

**優點：**
- 不依賴 API 的實時更新
- 響應速度快
- 用戶體驗流暢
- 實現簡單

**缺點：**
- 刷新頁面後會重置為 0
- 需要前端計時器持續運行
- 可能與實際播放狀態有微小偏差

#### 方案 3：混合方案

- 使用 WebSocket 獲取實時更新（如果可用）
- 使用前端計時器作為備用
- 定期通過 HTTP API 同步（作為最後的備用方案）

## 建議

**當前最佳方案：** 繼續使用方案 2（完全依賴前端狀態），因為：
1. HTTP API 端點沒有正確返回實時狀態
2. 前端計時器已經實現並正常工作
3. 用戶體驗已經很好

**未來改進：** 如果 YTMD_BC 的 API Server 修復了狀態更新問題，可以考慮實現 WebSocket 客戶端以獲取更準確的實時狀態。
