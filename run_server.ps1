# One-click runner for UPS IMS Flask app
# Usage: Open PowerShell as the user and run: .\run_server.ps1

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# Create venv if missing
if (-not (Test-Path ".venv")) {
    Write-Output "Creating virtual environment..."
    python -m venv .venv
}

# Activate venv
Write-Output "Activating virtual environment..."
$activate = Join-Path $ScriptDir ".venv\Scripts\Activate.ps1"
if (Test-Path $activate) {
    & $activate
} else {
    Write-Warning "Activation script not found. Ensure Python is installed and venv created.";
}

# Install requirements if file exists
if (Test-Path "requirements.txt") {
    Write-Output "Installing requirements (may ask for permission)..."
    pip install --upgrade pip
    pip install -r requirements.txt
}

# Add firewall rule if not present
$ruleName = 'UPS IMS HTTP 5000'
if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
    Write-Output "Adding firewall rule to allow inbound TCP 5000..."
    try {
        New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow | Out-Null
    } catch {
        Write-Warning "Failed to add firewall rule (you may need to run PowerShell as Administrator)."
    }
} else {
    Write-Output "Firewall rule already present."
}

# Start the Flask app in a new PowerShell window (background)
Write-Output "Starting Flask app in background (http://0.0.0.0:5000)..."
$pythonExe = "$(Get-Command python -ErrorAction SilentlyContinue).Source"
if (-not $pythonExe) { $pythonExe = "python" }

$startInfo = "-NoProfile -ExecutionPolicy Bypass -Command & { cd '$ScriptDir'; $env:PYTHONUNBUFFERED=1; & $pythonExe app.py }"
Start-Process -FilePath powershell -ArgumentList $startInfo -WindowStyle Normal

# Wait until server responds, then open default browser to login page
$url = 'http://127.0.0.1:5000/login'
Write-Output "Waiting for server to become available..."
$maxAttempts = 20
$attempt = 0
while ($attempt -lt $maxAttempts) {
    try {
        Start-Sleep -Milliseconds 500
        $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { break }
    } catch { }
    $attempt++
}

if ($attempt -lt $maxAttempts) {
    Write-Output "Opening Chrome (app mode) to $url if available, otherwise default browser."
    # Try to locate Chrome
    $chromeCmd = Get-Command chrome -ErrorAction SilentlyContinue
    $chromePath = $null
    if ($chromeCmd) { $chromePath = $chromeCmd.Source }
    else {
        $possible = @("", "$env:ProgramFiles(x86)\Google\Chrome\Application\chrome.exe", "$env:ProgramFiles\Google\Chrome\Application\chrome.exe")
        foreach ($p in $possible) { if ($p -and (Test-Path $p)) { $chromePath = $p; break } }
    }

    if ($chromePath) {
        Write-Output "Launching Chrome: $chromePath"
        Start-Process -FilePath $chromePath -ArgumentList "--app=$url" -WindowStyle Normal
    } else {
        Start-Process $url
    }
} else {
    Write-Warning "Server did not become available in time. Open http://127.0.0.1:5000/login manually when ready."
}
