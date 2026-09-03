@echo off
setlocal
cd /d "%~dp0"
set "PYTHONDONTWRITEBYTECODE=1"
start "MBRLR Local Sync" /min pythonw tools\mbrlr_sync_gui.py
