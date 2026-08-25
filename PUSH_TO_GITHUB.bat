@echo off
title Push Project Updates to GitHub (my-first-project)
color 0A
cls
echo.
echo ============================================================
echo   Pushing latest fixes to saiharish2109-eng/my-first-project...
echo ============================================================
echo.
cd /d "C:\Users\Harish\Desktop\To select"
git push -u origin main
echo.
echo ============================================================
echo   Push completed! 
echo   Your live link: https://saiharish2109-eng.github.io/my-first-project/
echo ============================================================
echo.
pause
