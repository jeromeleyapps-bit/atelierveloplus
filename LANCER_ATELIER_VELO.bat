@echo off
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "start-atelier-velo.ps1"
pause
