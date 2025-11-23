@echo off
setlocal

REM --- config ---
set REPO=C:\Repos\cadastre
set NOTES=%REPO%\STAGING_NOTES.md
set LOGDIR=%REPO%\logs
set DEVLOG=%LOGDIR%\devserver.log

if not exist "%LOGDIR%" mkdir "%LOGDIR%"

echo.
echo === Cadastre STAGING code update ===
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
if errorlevel 1 goto :fail

REM --- install deps ---
echo Installing deps...
npm install
if errorlevel 1 goto :fail

REM --- prisma generate ---
echo Prisma generate...
npx prisma generate
if errorlevel 1 goto :fail

REM --- update staging notes ---
for /f %%s in ('git rev-parse --short HEAD') do set SHA=%%s
for /f %%t in ('powershell -NoProfile -Command "Get-Date -Format s"') do set TS=%%t
echo %TS%  code-only  sha=%SHA%>> "%NOTES%"

REM --- log header ---
echo.>> "%DEVLOG%"
echo ===== %DATE% %TIME% : code-only restart sha=%SHA% =====>> "%DEVLOG%"

REM --- start dev server (foreground, logs to file) ---
echo.
echo Starting Next dev server...
echo (This window must stay open. Output -> %DEVLOG%)
echo.
npm run dev > "%DEVLOG%" 2>&1

goto :eof

:fail
echo.
echo Script failed before starting server. Check output above.
echo.
pause
endlocal
