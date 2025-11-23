@echo off
setlocal

REM --- config ---
set REPO=E:\Repos\cadastre
set OUTDIR=%REPO%\data
set CONTAINER=cadastre-postgres
set DB=cadastre

if not exist "%OUTDIR%" mkdir "%OUTDIR%"

echo.
echo === Cadastre DEV: export database dump ===

REM --- quick check container exists/running ---
docker ps --format "{{.Names}}" | findstr /i "%CONTAINER%" >nul
if errorlevel 1 (
  echo ERROR: container "%CONTAINER%" not running.
  echo Start Docker Desktop and the container, then retry.
  pause
  exit /b 1
)

REM --- timestamped filename ---
for /f %%t in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set TS=%%t
set DUMPFILE=%OUTDIR%\cadastre_dump.sql
set ARCHIVE=%OUTDIR%\dumps\cadastre_%TS%.sql

if not exist "%OUTDIR%\dumps" mkdir "%OUTDIR%\dumps"

echo Dumping to %DUMPFILE% ...
REM Use postgres superuser, and NO OWNER/PRIVS to avoid role issues on restore
docker exec -t %CONTAINER% pg_dump -U postgres -d %DB% --no-owner --no-privileges > "%DUMPFILE%"
if errorlevel 1 goto :fail

REM --- also keep an archived copy ---
copy "%DUMPFILE%" "%ARCHIVE%" >nul

REM --- sanity check first line ---
for /f "usebackq delims=" %%l in ("%DUMPFILE%") do (
  echo First line: %%l
  goto :done
)

:done
echo.
echo OK: dump written.
echo   latest:  %DUMPFILE%
echo   archive: %ARCHIVE%
echo.
endlocal
exit /b 0

:fail
echo.
echo ERROR: pg_dump failed. Check Docker/DB.
echo.
pause
endlocal
exit /b 1
