#!/bin/bash

# YTMD Web Interface 打包和上傳腳本
# 用於將專案壓縮後透過 SSH 上傳到樹莓派

set -e

# 顏色輸出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# SSH 主機配置（根據 docs/pi.md）
SSH_HOST="raspberry-pi-dorm"
REMOTE_USER="dorm"
REMOTE_DIR="/home/dorm/YTMD_general_API_control"
REMOTE_DEPLOY_DIR="/opt/YTMD_general_API_control"

# 專案根目錄
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ARCHIVE_NAME="ytmd-web-interface.tar.gz"
TEMP_DIR=$(mktemp -d)

echo "=========================================="
echo "YTMD Web Interface 打包和上傳腳本"
echo "=========================================="
echo ""

# 檢查是否在正確的目錄
if [ ! -f "package.json" ]; then
    echo -e "${RED}錯誤：請在專案根目錄執行此腳本${NC}"
    exit 1
fi

echo -e "${YELLOW}步驟 1: 創建壓縮檔...${NC}"

# 創建臨時目錄並複製需要的文件
echo "正在準備要打包的文件..."

# 使用 tar 排除不需要的文件和目錄
tar --exclude='node_modules' \
    --exclude='build' \
    --exclude='dist' \
    --exclude='.git' \
    --exclude='.vscode' \
    --exclude='.idea' \
    --exclude='*.log' \
    --exclude='.DS_Store' \
    --exclude='Thumbs.db' \
    --exclude='*.swp' \
    --exclude='*.swo' \
    --exclude='*~' \
    -czf "$TEMP_DIR/$ARCHIVE_NAME" \
    -C "$PROJECT_DIR" .

ARCHIVE_SIZE=$(du -h "$TEMP_DIR/$ARCHIVE_NAME" | cut -f1)
echo -e "${GREEN}✓ 壓縮完成：$ARCHIVE_NAME (大小: $ARCHIVE_SIZE)${NC}"
echo ""

# 詢問是否上傳
read -p "是否現在上傳到樹莓派？ (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "壓縮檔已保存在: $TEMP_DIR/$ARCHIVE_NAME"
    echo "您可以稍後手動上傳："
    echo "  scp $TEMP_DIR/$ARCHIVE_NAME $SSH_HOST:~/"
    exit 0
fi

echo -e "${YELLOW}步驟 2: 上傳到樹莓派...${NC}"

# 測試 SSH 連線
if ! ssh -o ConnectTimeout=5 "$SSH_HOST" "echo 'SSH 連線測試成功'" > /dev/null 2>&1; then
    echo -e "${RED}錯誤：無法連接到 $SSH_HOST${NC}"
    echo "請檢查："
    echo "  1. 網路連線"
    echo "  2. SSH 配置（~/.ssh/config）"
    echo "  3. 參考 docs/pi.md 檢查 SSH 設定"
    exit 1
fi

# 上傳壓縮檔
echo "正在上傳到 $SSH_HOST..."
scp "$TEMP_DIR/$ARCHIVE_NAME" "$SSH_HOST:~/"

echo -e "${GREEN}✓ 上傳完成${NC}"
echo ""

# 詢問是否在遠端解壓和部署
read -p "是否在樹莓派上解壓並部署？ (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "壓縮檔已上傳到: ~/$ARCHIVE_NAME"
    echo "您可以稍後手動部署："
    echo "  ssh $SSH_HOST 'cd /opt && sudo tar -xzf ~/$ARCHIVE_NAME -C YTMD_general_API_control --strip-components=0'"
    exit 0
fi

echo -e "${YELLOW}步驟 3: 在樹莓派上解壓和部署...${NC}"

# 在遠端執行部署
ssh "$SSH_HOST" << EOF
    set -e
    
    echo "正在解壓到 $REMOTE_DEPLOY_DIR..."
    
    # 創建目標目錄（如果不存在）
    sudo mkdir -p $REMOTE_DEPLOY_DIR
    
    # 解壓到臨時目錄
    TEMP_EXTRACT=\$(mktemp -d)
    tar -xzf ~/$ARCHIVE_NAME -C "\$TEMP_EXTRACT"
    
    # 移動文件到目標目錄
    sudo cp -r "\$TEMP_EXTRACT"/* $REMOTE_DEPLOY_DIR/
    
    # 清理臨時目錄
    rm -rf "\$TEMP_EXTRACT"
    rm -f ~/$ARCHIVE_NAME
    
    echo "正在安裝依賴..."
    cd $REMOTE_DEPLOY_DIR
    
    # 檢查 pnpm
    if ! command -v pnpm &> /dev/null; then
        echo "安裝 pnpm..."
        sudo npm install -g pnpm
    fi
    
    # 安裝依賴
    pnpm install
    
    echo "正在構建生產版本..."
    pnpm build
    
    echo "設定權限..."
    sudo chown -R $REMOTE_USER:$REMOTE_USER $REMOTE_DEPLOY_DIR
    
    echo ""
    echo "=========================================="
    echo "部署完成！"
    echo "=========================================="
    echo ""
    echo "下一步："
    echo "1. 配置 nginx（參考 QUICK_START.md 或 docs/DEPLOYMENT.md）"
    echo "2. 確保 YTMD Desktop API Server 已啟用"
    echo "3. 訪問 http://172.24.8.204"
    echo ""
EOF

echo ""
echo -e "${GREEN}=========================================="
echo "✓ 部署完成！"
echo "==========================================${NC}"
echo ""
echo "專案已部署到: $REMOTE_DEPLOY_DIR"
echo ""
echo "下一步："
echo "1. 配置 nginx（如果還沒配置）"
echo "2. 確保 YTMD Desktop API Server 已啟用並運行"
echo "3. 訪問 http://172.24.8.204"
echo ""

# 清理本地臨時文件
rm -f "$TEMP_DIR/$ARCHIVE_NAME"
rmdir "$TEMP_DIR"




