#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "=============================="
echo "  AI Story Studio - 启动脚本  "
echo "=============================="

# 检查 Python
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo "[ERROR] 未找到 Python，请先安装 Python 3.10+"
    exit 1
fi
PYTHON=$(command -v python3 || command -v python)

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] 未找到 Node.js，请先安装 Node.js 18+"
    exit 1
fi

# 检查 .env
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "[INFO] 已从 .env.example 创建 .env（使用 Mock 模式）"
    fi
fi

# 安装后端依赖
echo "[1/3] 安装后端依赖..."
$PYTHON -m pip install -r requirements.txt -q

# 安装前端依赖
echo "[2/3] 安装前端依赖..."
cd frontend
if [ ! -d node_modules ]; then
    npm install --silent
else
    echo "       node_modules 已存在，跳过"
fi
cd ..

# 启动服务
echo "[3/3] 启动服务..."
echo ""
echo "  后端: http://localhost:8000"
echo "  前端: http://localhost:5173"
echo "  API 文档: http://localhost:8000/docs"
echo ""
echo "  按 Ctrl+C 停止所有服务"
echo ""

# 后台启动后端
$PYTHON -m uvicorn backend.main:app --reload --port 8000 &
BACKEND_PID=$!

# 前台启动前端
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# 捕获退出信号，停止所有进程
cleanup() {
    echo ""
    echo "正在停止服务..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    wait $BACKEND_PID 2>/dev/null
    wait $FRONTEND_PID 2>/dev/null
    echo "已停止"
}
trap cleanup SIGINT SIGTERM

wait
