@echo off
chcp 65001 >nul
title D-Lib 部落格管理後台
cd /d "%~dp0"

echo ======================================================
echo           D-Lib 部落格管理後台啟動中...
echo ======================================================
echo.
echo 後台網址: http://localhost:3000
echo 正在自動為您在瀏覽器開啟管理頁面...
echo.

start http://localhost:3000
node admin/server.js

pause
