@echo off
setlocal enabledelayedexpansion

REM --- config ---
set REPO=C:\Repos\cadastre
set NOTES=%REPO%\STAGING_NOTES.md
set LOGDIR=%REPO%\logs
set DEVLOG=%LOGDIR%\devserver.log

if not exist "%LOGDIR%" mkdir "%LOGDIR%"

echo.
echo === Cadastre STAGING code update ===

REM --- go to repo ---
cd /d "%REPO%"

REM --- stop anything on port 3000 ---
echo Stopping any process on port 3000...
for /f "tokens=5" %%p in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
  echo Killing PID %%p
  taskkill /F /PID %%p >nul 2>&1
)

REM --- pull latest main ---
echo Pulling latest main...
git checkout main >nul 2>&1
git pull

REM --- install deps ---
echo Installing deps...
npm install

REM --- prisma generate ---
echo Prisma generate...
npx prisma generate

REM --- clear previous log header ---
echo.>> "%DEVLOG%"
echo ===== %DATE% %TIME% : restart =====>> "%DEVLOG%"

REM --- start dev server with logging ---
echo Starting Next dev server...
start "cadastre-dev" cmd /k ^
  "cd /d %REPO% && npm run dev >> %DEVLOG% 2>&1"

REM --- update staging notes ---
for /f %%s in ('git rev-parse --short HEAD') do set SHA=%%s
for /f %%t in ('powershell -NoProfile -Command "Get-Date -Format s"') do set TS=%%t
echo %TS%  code-only  sha=%SHA%>> "%NOTES%"

echo Done. If the server doesn't stay up, open:
echo   %DEVLOG%
echo to see the crash reason.
echo.
endlocal
