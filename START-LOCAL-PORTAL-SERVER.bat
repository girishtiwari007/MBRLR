@echo off
setlocal
cd /d "%~dp0"
set "PORT=8010"
set "UPLOAD_DIR=%~dp0LOCAL-PORTAL-UPLOAD"
set "GITHUB_DIR=D:\github\MBRLR"

echo.
echo Revenue Liability Portal - Localhost Upload and Sync Server
echo.
echo Portal:
echo   http://127.0.0.1:%PORT%/index.html
echo.
echo Upload and Sync:
echo   http://127.0.0.1:%PORT%/local-sync
echo.
echo Upload folder:
echo   %UPLOAD_DIR%
echo.
echo GitHub Desktop repo:
echo   %GITHUB_DIR%
echo.

start "" "http://127.0.0.1:%PORT%/local-sync"
python tools\local_portal_server.py --port %PORT% --upload-dir "%UPLOAD_DIR%" --github "%GITHUB_DIR%"

echo.
echo Local server stopped.
pause
