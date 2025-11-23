@echo off
setlocal

REM --- config ---
set REPO=C:\Repos\cadastre
set NOTES=%REPO%\STAGING_NOTES.md
set LOGDIR=%REPO%\logs
set DEVLOG=%LOGDIR%\devserver.log
set DUMP=%REPO%\data\cadastre_dump.sql
set CONTAINER=cadastre-postgres
set DB=cadastre
set USER=cadastre

echo.
echo === Cadastre STAGING CODE + DB update ===
cd /d "%REPO%"

if not exist "%DUMP%" (
  echo ERROR: dump not found at %DUMP%
  pause
  exit /b 1
)

REM --- stop app on port 3000 ---
echo Stopping any process on port 3000...
for /f "tokens=5" %%p in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
  echo Killing PID %%p
  taskkill /F /PID %%p >nul 2>&1
)

REM --- CODE UPDATE ---
echo Pulling latest main...
git checkout main >nul 2>&1
git pull
if errorlevel 1 goto :fail

echo Installing deps...
call npm install
if errorlevel 1 goto :fail

echo Prisma generate...
call npx prisma generate
if errorlevel 1 goto :fail

REM --- DB UPDATE ---
echo Ensuring postgres role exists (for old dumps)...
docker exec -i %CONTAINER% psql -U %USER% -d %DB% -c ^
"DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='postgres') THEN CREATE ROLE postgres WITH LOGIN SUPERUSER; END IF; END $$;"

echo Dropping and recreating public schema...
docker exec -i %CONTAINER% psql -U %USER% -d %DB% -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
if errorlevel 1 goto :fail

echo Restoring dump...
docker exec -i %CONTAINER% psql -U %USER% -d %DB% < "%DUMP%"
if errorlevel 1 goto :fail

REM --- notes + log header ---
for /f %%s in ('git rev-parse --short HEAD') do set SHA=%%s
for /f %%t in ('powershell -NoProfile -Command "Get-Date -Format s"') do set TS=%%t
echo %TS%  code+db  sha=%SHA%  dump=%DUMP%>> "%NOTES%"

if not exist "%LOGDIR%" mkdir "%LOGDIR%"
echo.>> "%DEVLOG%"
echo ===== %DATE% %TIME% : code+db sha=%SHA% =====>> "%DEVLOG%"

REM --- restart dev server ---
echo.
echo Starting Next dev server...
echo (This window must stay open. Output -> %DEVLOG%)
echo.
call npm run dev > "%DEVLOG%" 2>&1

goto :eof

:fail
echo.
echo ERROR: code+db update failed. Check output above.
echo.
pause
endlocal
