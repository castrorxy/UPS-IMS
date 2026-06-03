@echo off
REM Double-click this file to start the UPS IMS Flask app.
REM It runs the PowerShell runner with ExecutionPolicy Bypass so non-technical users don't need to change settings.

SET SCRIPT_DIR=%~dp0
PUSHD "%SCRIPT_DIR%"

REM Run the PowerShell script with bypass (opens a new PowerShell window)
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%run_server.ps1"' -Verb RunAs"

nPAUSE