# 快速開始指南

## 在樹莓派上部署

### 1. 克隆專案

```bash
cd /opt
sudo git clone <your-git-repository-url> YTMD_general_API_control
cd YTMD_general_API_control
```

### 2. 運行部署腳本

```bash
sudo chmod +x deploy.sh
./deploy.sh
```

或者手動執行：

```bash
# 安裝依賴
pnpm install

# 構建生產版本
pnpm build
```

### 3. 配置 nginx

創建 nginx 配置文件：

```bash
sudo nano /etc/nginx/sites-available/ytmd-web
```

添加以下內容（替換路徑為實際路徑）：

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

### 4. 確保 YTMD Desktop API Server 運行

- 打開 YTMD Desktop
- 進入 **設定 > Plugins > API Server**
- 啟用 **API Server**
- 設定 hostname 為 `0.0.0.0`（如果需要從外部訪問）
- 設定端口為 `26538`

### 5. 訪問

在瀏覽器中打開：`http://<樹莓派IP地址>`

## 更新

當需要更新代碼時：

```bash
cd /opt/YTMD_general_API_control
git pull
./deploy.sh
sudo systemctl reload nginx
```

## 詳細說明

更多詳細的部署說明請參考 [部署文檔](docs/DEPLOYMENT.md)。





