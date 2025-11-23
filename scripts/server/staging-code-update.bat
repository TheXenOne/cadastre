@echo off
setlocal

REM --- config ---
set REPO=C:\Repos\cadastre
set NOTES=%REPO%\STAGING_NOTES.md
set LOGDIR=%REPO%\logs
set DEVLOG=%LOGDIR%\devserver.log

if not exist "%LOGDIR%" mkdir "%LOGDIR%"

echo.
echo === Cadastre STAGING code update (debug) ===

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
if errorlevel 1 goto :fail

REM --- prisma generate ---
echo Prisma generate...
npx prisma generate
if errorlevel 1 goto :fail

REM --- header for log ---
echo.>> "%DEVLOG%"
echo ===== %DATE% %TIME% : restart =====>> "%DEVLOG%"

REM --- start dev server FOREGROUND with logging ---
echo Starting Next dev server (this window will stay open)...
echo If it crashes, check: %DEVLOG%
call npm run dev >> "%DEVLOG%" 2>&1

goto :eof

:fail
echo.
echo Script failed before starting server. Check output above.
echo.
endlocal
