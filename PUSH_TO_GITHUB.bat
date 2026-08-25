@echo off
title Push Project Updates to GitHub
color 0A
cls
echo.
echo ============================================================
echo   Pushing latest fixes to GitHub repository...
echo ============================================================
echo.
cd /d "C:\Users\Harish\Desktop\To select"
git push origin main
echo.
echo ============================================================
echo   Push completed! Check your GitHub repository and Pages.
echo ============================================================
echo.
pause
