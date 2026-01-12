#!/bin/bash

# YTMD Web Interface 部署腳本
# 用於在樹莓派上快速部署

set -e

echo "=========================================="
echo "YTMD Web Interface 部署腳本"
echo "=========================================="

# 檢查是否在正確的目錄
if [ ! -f "package.json" ]; then
    echo "錯誤：請在專案根目錄執行此腳本"
    exit 1
fi

# 檢查 Node.js
if ! command -v node &> /dev/null; then
    echo "錯誤：未找到 Node.js，請先安裝 Node.js 18+"
    exit 1
fi

# 檢查 pnpm
if ! command -v pnpm &> /dev/null; then
    echo "警告：未找到 pnpm，嘗試安裝..."
    npm install -g pnpm
fi

echo ""
echo "步驟 1: 安裝依賴..."
pnpm install

echo ""
echo "步驟 2: 構建生產版本..."
pnpm build

echo ""
echo "=========================================="
echo "構建完成！"
echo "=========================================="
echo ""
echo "構建產物位於: $(pwd)/build"
echo ""
echo "下一步："
echo "1. 配置 nginx 或其他 Web 服務器提供 build/ 目錄"
echo "2. 確保 YTMD Desktop API Server 已啟用並運行"
echo "3. 詳細說明請參考: docs/DEPLOYMENT.md"
echo ""





