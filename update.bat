@echo off
setlocal EnableDelayedExpansion
title Video Speed HUD - Updater

echo ========================================================
echo   Video Speed HUD ^& Question Time Watcher Updater
echo ========================================================
echo.

REM Check if git is available
where git >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Git is not installed or not in your PATH.
    echo Please install Git from https://git-scm.com/
    echo or download the latest release ZIP from:
    echo https://github.com/Fire162/PW-extension/releases
    echo.
    pause
    exit /b 1
)

echo [*] Pulling latest updates from GitHub...
echo.

git pull
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo  [SUCCESS] Extension files updated to latest version!
    echo ========================================================
    echo.
    echo Next Steps to apply updates in Chrome/Edge:
    echo   1. Open your browser and go to: chrome://extensions
    echo   2. Find "Video Speed HUD & Question Time Watcher"
    echo   3. Click the circular [Reload] button.
    echo.
) else (
    echo.
    echo [WARNING] Git pull encountered an issue.
    echo If you modified local files, run: git stash
    echo Then run this updater again.
    echo.
)

pause
