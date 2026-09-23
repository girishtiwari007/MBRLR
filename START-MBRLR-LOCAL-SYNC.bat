@echo off
setlocal
cd /d "%~dp0"
set "PYTHONDONTWRITEBYTECODE=1"
set "MBRLR_GUI=tools\mbrlr_sync_gui.py"

if not exist "%MBRLR_GUI%" (
  echo MBRLR GUI file not found: %CD%\%MBRLR_GUI%
  echo Keep this launcher in the MBRLR repository root.
  pause
  exit /b 1
)

where pyw.exe >nul 2>nul
if %ERRORLEVEL%==0 (
  start "MBRLR Local Sync GUI" pyw "%MBRLR_GUI%"
  exit /b 0
)

where pythonw.exe >nul 2>nul
if %ERRORLEVEL%==0 (
  start "MBRLR Local Sync GUI" pythonw "%MBRLR_GUI%"
  exit /b 0
)

where python.exe >nul 2>nul
if %ERRORLEVEL%==0 (
  start "MBRLR Local Sync GUI" python "%MBRLR_GUI%"
  exit /b 0
)

echo Python was not found on PATH.
echo Install Python or run:
echo   python tools\mbrlr_sync_gui.py
pause
exit /b 1
