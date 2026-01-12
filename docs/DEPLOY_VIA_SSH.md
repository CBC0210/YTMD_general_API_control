# 透過 SSH 上傳部署指南

本文件說明如何將專案壓縮後透過 SSH 上傳到樹莓派並部署。

## 前置需求

### 1. SSH 配置
確保已按照 [docs/pi.md](pi.md) 配置好 SSH 連線：
- SSH 主機別名：`raspberry-pi-dorm`
- 使用者：`dorm`
- 金鑰認證已配置

### 2. 本地環境
- 已安裝 Node.js 和 pnpm（僅用於測試，部署時會在樹莓派上安裝）
- 專案已準備就緒

## 快速部署

### 方法 1: 使用自動化腳本（推薦）

在專案根目錄執行：

```bash
./package-and-upload.sh
```

腳本會自動：
1. 壓縮專案（排除 node_modules、build 等不需要的文件）
2. 上傳到樹莓派
3. 在樹莓派上解壓、安裝依賴、構建
4. 設定權限

### 方法 2: 手動步驟

#### 步驟 1: 壓縮專案

在專案根目錄執行：

```bash
# 創建壓縮檔（排除不需要的文件）
tar --exclude='node_modules' \
    --exclude='build' \
    --exclude='dist' \
    --exclude='.git' \
    --exclude='.vscode' \
    --exclude='.idea' \
    --exclude='*.log' \
    --exclude='.DS_Store' \
    -czf ytmd-web-interface.tar.gz .
```

#### 步驟 2: 上傳到樹莓派

```bash
scp ytmd-web-interface.tar.gz raspberry-pi-dorm:~/
```

#### 步驟 3: 在樹莓派上解壓和部署

```bash
# 連接到樹莓派
ssh raspberry-pi-dorm

# 創建目標目錄
sudo mkdir -p /opt/YTMD_general_API_control

# 解壓
cd /opt
sudo tar -xzf ~/ytmd-web-interface.tar.gz -C YTMD_general_API_control --strip-components=0

# 安裝 pnpm（如果還沒安裝）
sudo npm install -g pnpm

# 安裝依賴
cd /opt/YTMD_general_API_control
pnpm install

# 構建生產版本
pnpm build

# 設定權限
sudo chown -R dorm:dorm /opt/YTMD_general_API_control

# 清理
rm ~/ytmd-web-interface.tar.gz
```

#### 步驟 4: 配置 nginx

```bash
# 創建 nginx 配置
sudo nano /etc/nginx/sites-available/ytmd-web
```

添加以下內容：

```nginx
server {
    listen 80;
    server_name _;

    root /opt/YTMD_general_API_control/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

啟用站點：

```bash
sudo ln -s /etc/nginx/sites-available/ytmd-web /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 更新部署

當需要更新代碼時，重複上述步驟即可。或者使用自動化腳本：

```bash
./package-and-upload.sh
```

腳本會自動處理更新過程。

## 故障排除

### 1. SSH 連線失敗

檢查 SSH 配置：

```bash
# 測試連線
ssh raspberry-pi-dorm "echo '連線測試'"

# 檢查 SSH config
cat ~/.ssh/config | grep -A 10 raspberry-pi-dorm
```

參考 [docs/pi.md](pi.md) 檢查 SSH 配置。

### 2. 上傳失敗

- 檢查網路連線：`ping 172.24.8.204`
- 檢查磁碟空間：`ssh raspberry-pi-dorm "df -h"`
- 檢查權限：確保目標目錄有寫入權限

### 3. 構建失敗

- 檢查 Node.js 版本：`ssh raspberry-pi-dorm "node --version"`（需要 18+）
- 檢查 pnpm 版本：`ssh raspberry-pi-dorm "pnpm --version"`（需要 8+）
- 檢查磁碟空間：`ssh raspberry-pi-dorm "df -h"`

### 4. nginx 無法訪問

- 檢查 nginx 狀態：`ssh raspberry-pi-dorm "sudo systemctl status nginx"`
- 檢查 nginx 錯誤日誌：`ssh raspberry-pi-dorm "sudo tail -f /var/log/nginx/error.log"`
- 檢查端口是否開放：`ssh raspberry-pi-dorm "sudo netstat -tlnp | grep :80"`

## 檔案結構

部署後的目錄結構：

```
/opt/YTMD_general_API_control/
├── build/              # 構建產物（nginx 提供此目錄）
├── src/                # 原始碼
├── package.json        # 依賴配置
├── pnpm-lock.yaml      # 鎖定版本
├── vite.config.ts      # Vite 配置
└── ...                 # 其他配置檔案
```

## 安全注意事項

1. **權限設定**：確保只有必要的用戶可以訪問專案目錄
2. **防火牆**：只開放必要的端口（80, 443）
3. **定期更新**：保持系統和依賴包更新
4. **備份**：定期備份配置文件和構建產物

## 相關文檔

- [docs/pi.md](pi.md) - SSH 配置說明
- [QUICK_START.md](../QUICK_START.md) - 快速開始指南
- [docs/DEPLOYMENT.md](DEPLOYMENT.md) - 完整部署指南




