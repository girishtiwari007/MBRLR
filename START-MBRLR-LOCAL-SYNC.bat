@echo off
setlocal
cd /d "%~dp0"
start "MBRLR Local Sync" /min pythonw tools\mbrlr_sync_gui.py
