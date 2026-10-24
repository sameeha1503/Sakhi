@echo off
setlocal enabledelayedexpansion
title Sakhi - Women's Healthcare Companion

:: Navigate to directory where this batch file is located
cd /d "%~dp0"

:: Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found in your system PATH.
    echo Please install Node.js from https://nodejs.org/ and try again.
    pause
    exit /b 1
)

:: Handle command-line arguments if provided
if /i "%~1"=="dev" goto :start_dev
if /i "%~1"=="test" goto :run_tests
if /i "%~1"=="build" goto :run_build
if /i "%~1"=="lint" goto :run_lint
if /i "%~1"=="install" goto :run_install

:menu
cls
echo =========================================================
echo       Sakhi (सखी / సఖి) - Women's Healthcare Companion
echo =========================================================
echo.
echo   [1] Start Development Server (http://localhost:8080)
echo   [2] Run All Tests (Vitest - 52 tests)
echo   [3] Type Check (tsc) ^& Linter (eslint)
echo   [4] Create Production Build (npm run build)
echo   [5] Install Dependencies (npm install)
echo   [6] Exit
echo.
echo =========================================================
set /p choice="Enter your choice (1-6) [default: 1]: "

if "%choice%"=="" set choice=1
if "%choice%"=="1" goto :start_dev
if "%choice%"=="2" goto :run_tests
if "%choice%"=="3" goto :run_lint
if "%choice%"=="4" goto :run_build
if "%choice%"=="5" goto :run_install
if "%choice%"=="6" goto :exit
goto :menu

:start_dev
echo.
echo [INFO] Starting Sakhi local development server...
if not exist "node_modules\" (
    echo [INFO] node_modules not detected. Installing dependencies first...
    call npm install
)
echo.
echo Opening http://localhost:8080 in your default browser...
start "" "http://localhost:8080"
call npm run dev
goto :end

:run_tests
echo.
echo [INFO] Running all test suites (Vitest)...
call npm test
echo.
pause
goto :menu

:run_lint
echo.
echo [INFO] Running TypeScript compiler check...
call npx tsc --noEmit
if %errorlevel% equ 0 (
    echo [OK] TypeScript check passed with 0 errors.
) else (
    echo [FAIL] TypeScript check encountered errors.
)
echo.
echo [INFO] Running ESLint...
call npm run lint
echo.
pause
goto :menu

:run_build
echo.
echo [INFO] Creating production build...
call npm run build
echo.
pause
goto :menu

:run_install
echo.
echo [INFO] Installing / updating npm packages...
call npm install
echo.
pause
goto :menu

:exit
exit /b 0

:end
pause
