# Build UPS IMS into a single executable using PyInstaller.
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir
$VenvPy = Join-Path $ScriptDir "..\.venv\Scripts\python.exe"

Remove-Item -Recurse -Force .\dist, .\build -ErrorAction SilentlyContinue
Remove-Item -Force .\app.spec -ErrorAction SilentlyContinue

& $VenvPy -m PyInstaller --onefile --windowed --name "UPS IMS" --add-data "templates;templates" --add-data "static;static" app.py

if ($LASTEXITCODE -eq 0) {
    Write-Output "Build successful! The executable is in dist\UPS IMS.exe"
} else {
    Write-Output "Build failed. Check the PyInstaller output for errors."
}
