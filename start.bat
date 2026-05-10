@echo off
chcp 65001 >nul
setlocal

cd /d "%~dp0"

echo ==============================
echo   AI Story Studio - 启动脚本
echo ==============================
echo.

:: 检查 Python
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] 未找到 Python，请先安装 Python 3.10+
    pause
    exit /b 1
)

:: 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] 未找到 Node.js，请先安装 Node.js 18+
    pause
    exit /b 1
)

:: 检查 .env
if not exist .env (
    if exist .env.example (
        copy .env.example .env >nul
        echo [INFO] 已从 .env.example 创建 .env（使用 Mock 模式）
    )
)

:: 安装后端依赖
echo [1/3] 安装后端依赖...
python -m pip install -r requirements.txt -q
if %errorlevel% neq 0 (
    echo [ERROR] 后端依赖安装失败
    pause
    exit /b 1
)

:: 安装前端依赖
echo [2/3] 安装前端依赖...
cd frontend
if not exist node_modules (
    npm install --silent
) else (
    echo        node_modules 已存在，跳过
)
cd ..

:: 启动服务
echo [3/3] 启动服务...
echo.
echo   后端: http://localhost:8000
echo   前端: http://localhost:5173
echo   API 文档: http://localhost:8000/docs
echo.
echo   关闭此窗口停止所有服务
echo.

:: 启动后端（新窗口）
start "AI Story Studio - Backend" cmd /c "python -m uvicorn backend.main:app --reload --port 8000"

:: 启动前端（新窗口）
start "AI Story Studio - Frontend" cmd /c "cd frontend && npm run dev"

echo 服务已在新窗口中启动。
echo 关闭对应窗口即可停止服务。
echo.
pause
