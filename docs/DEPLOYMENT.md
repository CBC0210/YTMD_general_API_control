# 部署配置說明

本文件說明如何在樹莓派上部署 YTMD 遠端控制 Web 界面。

## 前置需求

### 1. 系統需求
- **樹莓派**（任何型號，建議 Raspberry Pi 4 或更新）
- **作業系統**：Raspberry Pi OS（Debian-based）或其他 Linux 發行版
- **Node.js 18+** 和 **pnpm 8+**（或 npm/yarn）

### 2. 軟體需求
- **YTMD Desktop** 已安裝並運行
- **YTMD Desktop API Server Plugin** 已啟用
- **Web 服務器**（nginx 或 Apache，用於提供靜態文件）

## 部署步驟

### 步驟 1: 克隆專案

在樹莓派上克隆專案到目標目錄：

```bash
# 選擇一個合適的目錄，例如 /opt 或 /home/pi
cd /opt
sudo git clone <your-git-repository-url> YTMD_general_API_control
cd YTMD_general_API_control
```

或者使用 SSH：

```bash
cd /opt
sudo git clone git@github.com:your-username/YTMD_general_API_control.git
cd YTMD_general_API_control
```

### 步驟 2: 安裝依賴

```bash
# 如果還沒有安裝 pnpm，先安裝
npm install -g pnpm

# 安裝專案依賴
pnpm install
```

### 步驟 3: 配置環境變數

創建 `.env` 文件（如果需要自定義配置）：

```bash
cp .env.example .env  # 如果有的話
nano .env
```

環境變數說明：

```env
# YTMD Desktop API 的 URL
# 如果 YTMD 運行在同一台機器上，使用 localhost
# 如果需要從外部訪問，請確保 YTMD API Server 的 hostname 設定為 0.0.0.0
VITE_YTMD_API_URL=http://localhost:26538/api/v1

# 開發服務器端口（僅開發模式使用）
VITE_PORT=5173
```

**注意**：如果 YTMD Desktop 和 Web 界面運行在同一台機器上，通常不需要修改 `VITE_YTMD_API_URL`。

### 步驟 4: 構建生產版本

```bash
pnpm build
```

構建產物會在 `build/` 目錄中。

### 步驟 5: 配置 Web 服務器（nginx）

#### 5.1 安裝 nginx

```bash
sudo apt update
sudo apt install nginx
```

#### 5.2 創建 nginx 配置

創建配置文件：

```bash
sudo nano /etc/nginx/sites-available/ytmd-web
```

添加以下配置：

```nginx
server {
    listen 80;
    server_name _;  # 替換為您的域名或 IP 地址

    # 靜態文件根目錄（指向構建產物）
    root /opt/YTMD_general_API_control/build;
    index index.html;

    # 啟用 gzip 壓縮
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # 主要位置
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 靜態資源緩存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 安全標頭
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

#### 5.3 啟用站點

```bash
# 創建符號連結
sudo ln -s /etc/nginx/sites-available/ytmd-web /etc/nginx/sites-enabled/

# 測試配置
sudo nginx -t

# 重啟 nginx
sudo systemctl restart nginx
```

#### 5.4 設定開機自動啟動

```bash
sudo systemctl enable nginx
```

### 步驟 6: 配置 YTMD Desktop API Server

確保 YTMD Desktop 的 API Server plugin 已正確配置：

1. 打開 YTMD Desktop
2. 進入 **設定 > Plugins > API Server**
3. 啟用 **API Server**
4. 設定 **hostname** 為 `0.0.0.0`（允許從外部訪問）
5. 設定 **端口**（預設：`26538`）
6. 如果需要認證，配置 JWT secret 和授權客戶端

**重要**：如果 Web 界面和 YTMD 運行在同一台機器上，hostname 可以設定為 `localhost` 或 `127.0.0.1`。

### 步驟 7: 配置防火牆（如果需要）

如果從外部網絡訪問，需要開放端口：

```bash
# 開放 HTTP 端口（80）
sudo ufw allow 80/tcp

# 如果需要 HTTPS，開放 443
sudo ufw allow 443/tcp

# 如果 YTMD API 需要從外部訪問，開放 26538
sudo ufw allow 26538/tcp
```

### 步驟 8: 設定自動更新（可選）

創建一個腳本用於更新和重新構建：

```bash
sudo nano /opt/YTMD_general_API_control/update.sh
```

添加以下內容：

```bash
#!/bin/bash
cd /opt/YTMD_general_API_control
git pull
pnpm install
pnpm build
sudo systemctl reload nginx
```

設定執行權限：

```bash
chmod +x /opt/YTMD_general_API_control/update.sh
```

## 系統服務配置（可選）

如果需要將更新腳本設定為定時任務，可以使用 cron：

```bash
# 編輯 crontab
crontab -e

# 添加定時任務（例如每天凌晨 2 點更新）
0 2 * * * /opt/YTMD_general_API_control/update.sh >> /var/log/ytmd-update.log 2>&1
```

## 訪問 Web 界面

部署完成後，可以通過以下方式訪問：

- **本地訪問**：`http://localhost`
- **網絡訪問**：`http://<樹莓派IP地址>`
- **域名訪問**：`http://<您的域名>`（如果配置了域名）

## 故障排除

### 1. 無法訪問 Web 界面

- 檢查 nginx 是否運行：`sudo systemctl status nginx`
- 檢查端口是否開放：`sudo netstat -tlnp | grep :80`
- 檢查 nginx 錯誤日誌：`sudo tail -f /var/log/nginx/error.log`

### 2. 無法連接到 YTMD Desktop API

- 確認 YTMD Desktop 正在運行
- 確認 API Server plugin 已啟用
- 檢查 API Server 的 hostname 和端口設定
- 測試 API 連接：`curl http://localhost:26538/api/v1/song`
- 檢查瀏覽器控制台的錯誤訊息

### 3. CORS 錯誤

如果遇到 CORS 錯誤，請確認：

- YTMD Desktop API Server 已啟用 CORS
- API Server 的 hostname 設定正確（如果需要從外部訪問，設定為 `0.0.0.0`）

### 4. 構建失敗

- 確認 Node.js 版本：`node --version`（需要 18+）
- 確認 pnpm 版本：`pnpm --version`（需要 8+）
- 清除緩存並重新安裝：`rm -rf node_modules pnpm-lock.yaml && pnpm install`

### 5. 權限問題

如果遇到權限問題：

```bash
# 確保 nginx 可以讀取構建目錄
sudo chmod -R 755 /opt/YTMD_general_API_control/build
sudo chown -R www-data:www-data /opt/YTMD_general_API_control/build
```

## 更新部署

當需要更新代碼時：

```bash
cd /opt/YTMD_general_API_control
git pull
pnpm install
pnpm build
sudo systemctl reload nginx
```

或者使用更新腳本：

```bash
/opt/YTMD_general_API_control/update.sh
```

## 安全建議

1. **使用 HTTPS**：配置 SSL 證書（Let's Encrypt）以加密連接
2. **防火牆**：只開放必要的端口
3. **定期更新**：保持系統和依賴包更新
4. **備份**：定期備份配置文件和構建產物

## 配置 HTTPS（可選）

使用 Let's Encrypt 配置 HTTPS：

```bash
# 安裝 certbot
sudo apt install certbot python3-certbot-nginx

# 獲取證書（替換為您的域名）
sudo certbot --nginx -d your-domain.com

# 自動續期
sudo certbot renew --dry-run
```

然後更新 nginx 配置以使用 HTTPS。

## 日誌位置

- **nginx 訪問日誌**：`/var/log/nginx/access.log`
- **nginx 錯誤日誌**：`/var/log/nginx/error.log`
- **系統日誌**：`/var/log/syslog`

## 支援

如有問題，請檢查：
- 瀏覽器控制台的錯誤訊息
- nginx 錯誤日誌
- YTMD Desktop 的日誌
- 系統日誌





