@echo off
color 0A
title GitHub + Vercel Deployment Setup

echo.
echo ============================================
echo   cheapfollower.shop Deployment Setup
echo ============================================
echo.

REM Check if Git is installed
where git >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Git is not installed!
    echo.
    echo Please install Git first:
    echo 1. Download from: https://git-scm.com/download/win
    echo 2. Run the installer
    echo 3. Run this script again
    echo.
    echo Opening Git download page...
    timeout /t 3 >nul
    start https://git-scm.com/download/win
    echo.
    pause
    exit /b
)

echo [OK] Git is installed
echo.

REM Check if already initialized
if exist ".git" (
    echo [OK] Git repository already initialized
) else (
    echo Initializing Git repository...
    git init
    echo [OK] Git repository initialized
)
echo.

REM Stage all files
echo Staging files...
git add .
echo [OK] Files staged
echo.

REM Create commit
echo Creating commit...
git log --oneline >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    git commit -m "Initial commit: cheapfollower.shop SMM panel"
    echo [OK] Initial commit created
) else (
    git commit -m "Update: Latest changes before deployment" >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        echo [OK] New commit created
    ) else (
        echo [INFO] No changes to commit
    )
)
echo.

echo ============================================
echo   NEXT STEPS
echo ============================================
echo.
echo 1. CREATE GITHUB REPOSITORY
echo    - Opening GitHub new repo page...
echo    - Name it: cheapfollower-shop
echo    - Make it Private
echo    - Do NOT initialize with README
echo.

timeout /t 3 >nul
start https://github.com/new

echo 2. COPY YOUR GITHUB USERNAME
echo    Type your GitHub username and press Enter:
set /p GITHUB_USER="   GitHub username: "
echo.

if "%GITHUB_USER%"=="" (
    set GITHUB_USER=YOUR_USERNAME
)

echo 3. RUN THESE COMMANDS IN POWERSHELL:
echo.
echo    cd "%CD%"
echo    git remote add origin https://github.com/%GITHUB_USER%/cheapfollower-shop.git
echo    git branch -M main
echo    git push -u origin main
echo.
echo.
echo 4. THEN DEPLOY TO VERCEL
echo    Opening Vercel...
timeout /t 2 >nul
start https://vercel.com/new
echo.
echo.

echo ============================================
echo Copy the commands above and run them in PowerShell!
echo ============================================
echo.
pause
