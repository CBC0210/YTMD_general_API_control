# YTMD 遠端控制 Web 界面

這是一個用於遠端控制 YTMD (YouTube Music Desktop) 的 Web 界面，讓您可以透過瀏覽器控制樹莓派上運行的 YTMD desktop，無需連接到樹莓派的桌面環境。

## 功能

- ✅ 播放控制（播放、暫停、上一首、下一首）
- ✅ 佇列管理（查看、添加、刪除歌曲）
- ✅ 搜尋歌曲
- ✅ 音量控制
- ✅ 歌曲跳轉
- ✅ 用戶歷史記錄（使用 localStorage）
- ✅ 喜歡的歌曲管理（使用 localStorage）
- ✅ 當前播放歌曲顯示

## 架構

```
Web Browser (React + Vite)
    ↓ HTTP
YTMD Desktop API Server (Port 26538)
    ↓
YTMD Desktop Application
```

## 前置需求

1. **YTMD Desktop** 已安裝並運行
2. **YTMD Desktop API Server Plugin** 已啟用
   - 在 YTMD Desktop 設定中啟用 API Server plugin
   - 預設運行在 `localhost:26538`
   - 如需從外部訪問，請設定 hostname 為 `0.0.0.0`

3. **Node.js** 和 **pnpm**（或 npm/yarn）
   - Node.js 18+ 
   - pnpm 8+

## 安裝

1. 複製專案到本地：
```bash
cd /path/to/YTMD_general_API_control
```

2. 安裝依賴：
```bash
pnpm install
```

3. 配置環境變數（可選）：
```bash
cp .env.example .env
# 編輯 .env 文件，設定 YTMD API URL（如果需要）
```

## 開發

啟動開發服務器：

```bash
pnpm dev
```

然後在瀏覽器中打開 `http://localhost:5173`

## 構建

構建生產版本：

```bash
pnpm build
```

構建產物會在 `build/` 目錄中。

## 部署

### 方法 1: 透過 SSH 上傳（推薦，無需 Git）

如果您還沒有配置 Git，可以直接壓縮專案並透過 SSH 上傳：

```bash
# 使用自動化腳本（推薦）
./package-and-upload.sh
```

腳本會自動壓縮、上傳、解壓、安裝依賴和構建。

詳細說明請參考：[docs/DEPLOY_VIA_SSH.md](docs/DEPLOY_VIA_SSH.md)

### 方法 2: 使用 Git 克隆

1. 克隆專案到樹莓派
2. 運行部署腳本：`./deploy.sh`
3. 配置 nginx（參考 [快速開始指南](QUICK_START.md)）
4. 確保 YTMD Desktop API Server 已啟用並運行

### 詳細說明

- **SSH 上傳部署**：請參考 [docs/DEPLOY_VIA_SSH.md](docs/DEPLOY_VIA_SSH.md)
- **快速開始**：請參考 [QUICK_START.md](QUICK_START.md)
- **完整部署指南**：請參考 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

## 配置

### 環境變數

- `VITE_YTMD_API_URL`: YTMD Desktop API 的 URL（可選）
  - 如果設置，會優先使用此環境變數
  - 如果未設置，且 URL 中沒有 `ip` 或 `host` 參數，則預設使用 `http://localhost:26538/api/v1`
- `VITE_PORT`: Vite 開發服務器端口（預設：`5173`）

### URL 參數配置（優先於環境變數）

- `ip` 或 `host`：目標 YTMD API 服務器的 IP 地址或主機名
  - 如果未提供，預設使用 `localhost`
- `port`：目標服務器的端口號（預設：`26538`）

**優先級**：URL 參數 > 環境變數 > 預設 localhost

### YTMD Desktop API Server 配置

確保 YTMD Desktop 的 API Server plugin 已正確配置：

1. 打開 YTMD Desktop
2. 進入設定 > Plugins > API Server
3. 啟用 API Server
4. 設定 hostname 為 `0.0.0.0`（如果需要從外部訪問）
5. 設定端口（預設：`26538`）
6. 如果需要認證，配置 JWT secret 和授權客戶端

## 使用

1. 確保 YTMD Desktop 正在運行
2. 確保 API Server plugin 已啟用
3. 啟動 Web 界面（開發模式或生產模式）
4. 在瀏覽器中打開界面
5. 輸入暱稱（可選，用於保存歷史記錄和喜歡的歌曲）
6. 開始使用！

### 動態切換目標服務器

您可以通過 URL 參數動態指定要連接的 YTMD API 服務器：

- **使用 IP 地址**：`http://localhost/?ip=172.24.8.204`
- **使用主機名**：`http://localhost/?host=raspberry-pi.local`
- **指定端口**：`http://localhost/?ip=172.24.8.204&port=26538`

**參數說明**：
- `ip` 或 `host`：目標服務器的 IP 地址或主機名（必填，二選一）
- `port`：目標服務器的端口號（可選，預設：`26538`）

**範例**：
- `http://localhost/?ip=192.168.1.100` - 連接到 192.168.1.100:26538
- `http://localhost/?ip=172.24.8.204&port=26538` - 連接到 172.24.8.204:26538
- `http://localhost/?host=raspberry-pi.local` - 連接到 raspberry-pi.local:26538

**注意**：
- 如果沒有提供 `ip` 或 `host` 參數，應用會預設使用 `localhost:26538`
- 如果設置了環境變數 `VITE_YTMD_API_URL`，會優先使用環境變數
- 當前連接的目標會顯示在頁面頂部
- 切換目標時，應用會自動重新初始化 API 連接

## 用戶管理

用戶管理功能使用瀏覽器的 `localStorage` 儲存數據：

- **歷史記錄**：自動記錄您加入佇列的歌曲（最多 200 首）
- **喜歡的歌曲**：手動標記喜歡的歌曲
- **多用戶支援**：通過暱稱區分不同用戶的數據

**注意**：數據僅存在於瀏覽器中，不會跨設備同步。

## 故障排除

### 無法連接到 YTMD Desktop API

1. 確認 YTMD Desktop 正在運行
2. 確認 API Server plugin 已啟用
3. 檢查 API Server 的 hostname 和端口設定
4. 如果從外部訪問，確認防火牆允許連接
5. 檢查 `VITE_YTMD_API_URL` 環境變數是否正確

### CORS 錯誤

如果遇到 CORS 錯誤，請確認：

1. YTMD Desktop API Server 已啟用 CORS
2. API Server 的 hostname 設定為 `0.0.0.0`（如果需要從外部訪問）

### 搜尋功能無法使用

YTMD Desktop 的搜尋 API 返回的數據格式可能因版本而異。如果搜尋結果無法正確顯示，請檢查瀏覽器控制台的錯誤訊息。

## 技術棧

- **React 18** - UI 框架
- **Vite** - 構建工具
- **TypeScript** - 類型安全
- **Tailwind CSS** - 樣式
- **Radix UI** - UI 組件

## 授權

MIT License
