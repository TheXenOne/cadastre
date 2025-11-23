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
echo === Cadastre STAGING DB update ===
cd /d "%REPO%"

if not exist "%DUMP%" (
  echo ERROR: dump not found at %DUMP%
  pause
  exit /b 1
)

REM --- stop app on port 3000 (safer during restore) ---
echo Stopping any process on port 3000...
for /f "tokens=5" %%p in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
  echo Killing PID %%p
  taskkill /F /PID %%p >nul 2>&1
)

REM --- ensure postgres role exists (harmless if already there) ---
echo Ensuring postgres role exists (for old dumps)...
docker exec -i %CONTAINER% psql -U %USER% -d %DB% -c ^
"DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='postgres') THEN CREATE ROLE postgres WITH LOGIN SUPERUSER; END IF; END $$;"

REM --- wipe schema ---
echo Dropping and recreating public schema...
docker exec -i %CONTAINER% psql -U %USER% -d %DB% -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
if errorlevel 1 goto :fail

REM --- restore dump ---
echo Restoring dump...
docker exec -i %CONTAINER% psql -U %USER% -d %DB% < "%DUMP%"
if errorlevel 1 goto :fail

REM --- prisma generate (safe) ---
echo Prisma generate...
call npx prisma generate
if errorlevel 1 goto :fail

REM --- update staging notes ---
for /f %%t in ('powershell -NoProfile -Command "Get-Date -Format s"') do set TS=%%t
echo %TS%  db-only  dump=%DUMP%>> "%NOTES%"

REM --- log header ---
if not exist "%LOGDIR%" mkdir "%LOGDIR%"
echo.>> "%DEVLOG%"
echo ===== %DATE% %TIME% : db-only restore =====>> "%DEVLOG%"

REM --- restart dev server ---
echo.
echo Starting Next dev server...
echo (This window must stay open. Output -> %DEVLOG%)
echo.
call npm run dev > "%DEVLOG%" 2>&1

goto :eof

:fail
echo.
echo ERROR: DB update failed. Check output above.
echo.
pause
endlocal
