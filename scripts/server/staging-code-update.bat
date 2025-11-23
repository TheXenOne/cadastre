@echo off
setlocal

REM --- config ---
set REPO=C:\Repos\cadastre
set NOTES=%REPO%\STAGING_NOTES.md
set LOGDIR=%REPO%\logs

if not exist "%LOGDIR%" mkdir "%LOGDIR%"

echo.
echo === Cadastre STAGING code update ===

REM --- go to repo ---
cd /d "%REPO%"

REM --- stop anything on port 3000 (current dev server) ---
echo Stopping any process on port 3000...
for /f "tokens=5" %%p in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
  echo Killing PID %%p
  taskkill /F /PID %%p >nul 2>&1
)

REM --- pull latest main ---
echo Pulling latest main...
git checkout main >nul 2>&1
git pull

REM --- install deps if needed (safe to run always) ---
echo Installing deps...
npm install

REM --- regenerate prisma client ---
echo Prisma generate...
npx prisma generate

REM --- restart dev server in new window, log to file ---
echo Starting Next dev server...
start "cadastre-dev" cmd /k "cd /d %REPO% && npm run dev"

REM --- write staging note ---
for /f %%s in ('git rev-parse --short HEAD') do set SHA=%%s
for /f %%t in ('powershell -NoProfile -Command "Get-Date -Format s"') do set TS=%%t

echo %TS%  code-only  sha=%SHA%>> "%NOTES%"

echo Done. Notes updated.
echo.
endlocal
