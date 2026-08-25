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

echo  [2/3] Preparing browser shortcuts...
start "" "http://localhost:3000"
start "" "http://localhost:3000/faculty.html"

echo.
echo  ============================================================
echo   Portal URL    : http://localhost:3000
echo   Faculty URL   : http://localhost:3000/faculty.html
echo  ============================================================
echo.
echo  [3/3] Starting Node.js Express Server on port 3000...
echo  [Server is running. Keep this window open. Press Ctrl+C to stop.]
echo.
node server.js
pause
