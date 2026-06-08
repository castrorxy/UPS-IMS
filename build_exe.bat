@echo off
REM Build UPS IMS into a single executable using PyInstaller.
SET SCRIPT_DIR=%~dp0
PUSHD "%SCRIPT_DIR%"
SET VENV_PY=%SCRIPT_DIR%..\.venv\Scripts\python.exe

REM Ensure build directories do not contain stale artifacts.
if exist dist\app.exe del /q /f dist\app.exe 2>nul
if exist "dist\UPS IMS.exe" del /q /f "dist\UPS IMS.exe" 2>nul
if exist build rmdir /s /q build 2>nul
if exist app.spec del /q app.spec 2>nul

REM Build a single-file Windows executable.
"%VENV_PY%" -m PyInstaller --onefile --windowed --name "UPS IMS" --add-data "templates;templates" --add-data "static;static" app.py

IF %ERRORLEVEL% EQU 0 (
    echo.
    echo Build successful! The executable is in dist\"UPS IMS.exe"
) ELSE (
    echo.
    echo Build failed. Check the PyInstaller output for errors.
)
pause
