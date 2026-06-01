@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo    产品详情页AI生成系统 - 启动脚本
echo ========================================
echo.

echo [1/3] 检查端口 3000 占用情况...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo 发现占用端口的进程 PID: %%a
    echo 正在终止进程 %%a...
    taskkill /F /PID %%a >nul 2>&1
    if errorlevel 1 (
        echo 进程终止失败或进程已不存在
    ) else (
        echo 进程已终止
    )
)
echo 端口清理完成
echo.

echo [2/3] 获取局域网IP地址...
set "LOCAL_IP="
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    for /f "tokens=1 delims= " %%b in ("%%a") do (
        set "LOCAL_IP=%%b"
    )
)
if defined LOCAL_IP (
    echo 局域网IP: !LOCAL_IP!
) else (
    echo 未检测到局域网IP
    set "LOCAL_IP=localhost"
)
echo.

echo [3/3] 启动服务...
cd /d "%~dp0"
start "" npm start
echo.

timeout /t 3 /nobreak >nul
echo.

echo ========================================
echo    服务已启动!
echo.
if defined LOCAL_IP (
    echo    本地访问: http://localhost:3000
    echo    局域网访问: http://!LOCAL_IP!:3000
) else (
    echo    访问地址: http://localhost:3000
)
echo.
echo    默认账号: admin / admin123
echo ========================================
echo.
echo 按任意键打开浏览器访问本地地址...
pause >nul
start http://localhost:3000
