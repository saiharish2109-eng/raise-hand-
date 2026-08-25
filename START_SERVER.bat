@echo off
title Pancha Tatva - Server + Database
color 1F
cls
echo.
echo  ============================================================
echo   PANCHA TATVA - Elemental House Portal
echo   Starting Server and Connecting to PostgreSQL...
echo  ============================================================
echo.
cd /d "C:\Users\Harish\Desktop\To select"

echo  [1/3] Starting PostgreSQL server check...
ping -n 1 localhost >nul

echo  [2/3] Starting Node.js Express Server on port 3000...
start "" /b node server.js

echo  [3/3] Waiting for server to start...
timeout /t 2 /nobreak >nul

echo.
echo  Opening Portal in your browser...
start "" "http://localhost:3000"
timeout /t 1 /nobreak >nul
start "" "http://localhost:3000/faculty.html"

echo.
echo  ============================================================
echo   Portal URL    : http://localhost:3000
echo   Faculty URL   : http://localhost:3000/faculty.html
echo  ============================================================
echo.
echo  [Server is running. Keep this window open.]
echo  [Press Ctrl+C to stop the server]
echo.
node server.js
pause
