# 使用者資料伺服器部署說明

## 概述

使用者資料現在保存在伺服器端的 `data/` 目錄下，而不是客戶端的 `localStorage`。這需要一個後端 API 服務器來處理資料的保存和讀取。

## 架構

```
Web Browser (React)
    ↓ HTTP
Nginx (Port 80)
    ├─→ /api/users/* → Backend API Server (Port 3001)
    └─→ /* → Static Files (build/)
```

## 部署步驟

### 1. 安裝依賴

```bash
cd /opt/YTMD_general_API_control
pnpm install
```

### 2. 啟動後端服務器

#### 方法 1: 使用 systemd 服務（推薦）

```bash
# 複製服務配置文件
sudo cp docs/ytmd-user-api.service /etc/systemd/system/

# 編輯服務配置（如果需要修改用戶或路徑）
sudo nano /etc/systemd/system/ytmd-user-api.service

# 重新載入 systemd
sudo systemctl daemon-reload

# 啟動服務
sudo systemctl start ytmd-user-api

# 設定開機自動啟動
sudo systemctl enable ytmd-user-api

# 檢查服務狀態
sudo systemctl status ytmd-user-api
```

#### 方法 2: 手動啟動（測試用）

```bash
cd /opt/YTMD_general_API_control
pnpm start
# 或
node server/index.js
```

### 3. 配置 Nginx

更新 nginx 配置以代理 API 請求：

```bash
sudo nano /etc/nginx/sites-available/ytmd-web
```

添加以下配置（或參考 `docs/nginx-config-example.conf`）：

```nginx
# API 代理：將 /api/users/* 請求代理到後端服務器
location /api/users/ {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

測試並重新載入 nginx：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 4. 創建資料目錄

後端服務器會自動創建 `data/` 目錄，但您也可以手動創建：

```bash
mkdir -p /opt/YTMD_general_API_control/data
chown -R dorm:dorm /opt/YTMD_general_API_control/data
```

## 資料結構

每個使用者的資料保存在 `data/<nickname>.json` 文件中：

```json
{
  "history": [
    {
      "videoId": "...",
      "title": "...",
      "artist": "...",
      "duration": "...",
      "thumbnail": "..."
    }
  ],
  "likes": [
    {
      "videoId": "...",
      "title": "...",
      "artist": "...",
      "duration": "...",
      "thumbnail": "..."
    }
  ]
}
```

## API 端點

### 歷史記錄

- `GET /api/users/:nickname/history` - 獲取使用者歷史記錄
- `POST /api/users/:nickname/history` - 添加歷史記錄
- `DELETE /api/users/:nickname/history/:videoId` - 刪除特定歷史記錄
- `DELETE /api/users/:nickname/history` - 清空歷史記錄

### 喜歡的歌曲

- `GET /api/users/:nickname/likes` - 獲取喜歡的歌曲
- `POST /api/users/:nickname/likes` - 添加喜歡的歌曲
- `DELETE /api/users/:nickname/likes/:videoId` - 取消喜歡

### 推薦

- `GET /api/users/:nickname/recommendations?limit=10` - 獲取推薦歌曲

### 健康檢查

- `GET /api/health` - 檢查服務器狀態

## 故障排除

### 後端服務器無法啟動

1. 檢查端口 3001 是否被占用：
   ```bash
   sudo netstat -tlnp | grep :3001
   ```

2. 檢查日誌：
   ```bash
   sudo journalctl -u ytmd-user-api -f
   ```

3. 檢查權限：
   ```bash
   ls -la /opt/YTMD_general_API_control/data
   ```

### API 請求失敗

1. 檢查後端服務器是否運行：
   ```bash
   curl http://localhost:3001/api/health
   ```

2. 檢查 nginx 配置：
   ```bash
   sudo nginx -t
   ```

3. 檢查 nginx 錯誤日誌：
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

### 資料未保存

1. 檢查 `data/` 目錄權限
2. 檢查後端服務器日誌
3. 檢查瀏覽器控制台的錯誤訊息

## 備份

建議定期備份 `data/` 目錄：

```bash
# 創建備份腳本
sudo nano /opt/YTMD_general_API_control/backup-user-data.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups/ytmd-user-data"
mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/user-data-$(date +%Y%m%d-%H%M%S).tar.gz /opt/YTMD_general_API_control/data
# 保留最近 7 天的備份
find $BACKUP_DIR -name "user-data-*.tar.gz" -mtime +7 -delete
```

設定執行權限並添加到 crontab：

```bash
chmod +x /opt/YTMD_general_API_control/backup-user-data.sh
crontab -e
# 添加：0 2 * * * /opt/YTMD_general_API_control/backup-user-data.sh
```
