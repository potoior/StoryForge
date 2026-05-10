#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "=============================="
echo "  AI Story Studio - 生产模式  "
echo "=============================="

PYTHON=$(command -v python3 || command -v python)

# 检查 .env
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "[INFO] 已从 .env.example 创建 .env"
    fi
fi

# 安装依赖
echo "[1/3] 安装后端依赖..."
$PYTHON -m pip install -r requirements.txt -q

echo "[2/3] 安装前端依赖并构建..."
cd frontend
npm install --silent
npm run build
cd ..

echo "[3/3] 启动生产服务..."
echo ""
echo "  访问地址: http://localhost:8000"
echo "  API 文档: http://localhost:8000/docs"
echo ""
echo "  按 Ctrl+C 停止服务"
echo ""

$PYTHON -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
