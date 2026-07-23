@echo off
setlocal
cd /d "%~dp0"
set "LOCAL_UPLOAD=%~dp0LOCAL-PORTAL-UPLOAD"
set "DOWNLOAD_UPLOAD=C:\Users\HP\Downloads\PORTAL DATA"
set "SOURCE_FOLDER=%LOCAL_UPLOAD%"
dir /b "%LOCAL_UPLOAD%\*.xls" "%LOCAL_UPLOAD%\*.xlsx" >nul 2>nul
if errorlevel 1 set "SOURCE_FOLDER=%DOWNLOAD_UPLOAD%"

echo.
echo Revenue Liability Portal - Local Data Sync
echo.
echo Put the latest six IPAS/MB source files in:
echo   %LOCAL_UPLOAD%
echo.
echo File names can vary. The sync detects files from sheet columns.
echo Current source folder:
echo   %SOURCE_FOLDER%
echo.
set /p "CUSTOM_SOURCE=Press ENTER to continue, or paste another source folder path: "
if not "%CUSTOM_SOURCE%"=="" set "SOURCE_FOLDER=%CUSTOM_SOURCE%"

python tools\local_portal_sync.py --source "%SOURCE_FOLDER%" --github "C:\Users\HP\OneDrive\Documents\GitHub\MBRLR"
if errorlevel 1 (
  echo.
  echo Sync failed. Check the message above.
  pause
  exit /b 1
)
echo.
echo Sync completed. Open http://127.0.0.1:8010/index.html?fresh=latest and hard refresh if needed.
pause
