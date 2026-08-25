@echo off
title Pancha Tatva - Server + Database
color 1F
cls
echo.
echo ============================================================
echo   PANCHA TATVA - Elemental House Portal
echo   Starting Server and Connecting to PostgreSQL...
echo ============================================================
echo.
cd /d "C:\Users\Harish\Desktop\To select"

echo  [1/2] Preparing browser shortcuts...
start "" "http://localhost:3000"
start "" "http://localhost:3000/faculty.html"

echo.
echo ============================================================
echo   Portal URL    : http://localhost:3000
echo   Faculty URL   : http://localhost:3000/faculty.html
echo ============================================================
echo.
echo  [2/2] Starting Node.js Express Server on port 3000...
echo  [Server is running. Keep this window open. Press Ctrl+C to stop.]
echo.
node server.js
pause
