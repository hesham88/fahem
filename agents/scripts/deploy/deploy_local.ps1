# Setup and Start Local Development Environment for Fahem
# Usage: .\scripts\deploy\deploy_local.ps1

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "          FAHEM LOCAL DEVELOPMENT SETUP & START           " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$RootDir = Resolve-Path "$PSScriptRoot\..\.."

# 1. Check Prerequisites
Write-Host "`n[1/4] Checking prerequisites..." -ForegroundColor Yellow

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js is installed ($nodeVersion)" -ForegroundColor Green
} catch {
    Write-Error "Node.js is not installed. Please install Node.js (v18+) to run the web frontend."
    Exit 1
}

# Check Python
try {
    $pythonVersion = python --version
    Write-Host "✓ Python is installed ($pythonVersion)" -ForegroundColor Green
} catch {
    Write-Error "Python is not installed. Please install Python 3.10+ to run the agents."
    Exit 1
}

# 2. Setup Python Virtual Environment and dependencies
Write-Host "`n[2/4] Setting up Python virtual environment for agents..." -ForegroundColor Yellow
$AgentsDir = Join-Path $RootDir "agents"
$VenvDir = Join-Path $AgentsDir "venv"

if (-not (Test-Path $VenvDir)) {
    Write-Host "Creating python virtual environment at $VenvDir..." -ForegroundColor Gray
    python -m venv $VenvDir
}

# Determine correct activate script path
$VenvActivate = Join-Path $VenvDir "Scripts\Activate.ps1"
if (-not (Test-Path $VenvActivate)) {
    $VenvActivate = Join-Path $VenvDir "bin/activate"
}

# Activate and install dependencies
Write-Host "Installing/updating Python dependencies..." -ForegroundColor Gray
& $VenvDir\Scripts\pip.exe install --upgrade pip
& $VenvDir\Scripts\pip.exe install -r "$AgentsDir\requirements.txt"
Write-Host "✓ Python environment is ready." -ForegroundColor Green

# 3. Setup Node dependencies
Write-Host "`n[3/4] Installing web frontend dependencies..." -ForegroundColor Yellow
$WebDir = Join-Path $RootDir "web"

Push-Location $WebDir
try {
    npm install
    Write-Host "✓ Web dependencies are installed." -ForegroundColor Green
} catch {
    Write-Error "Failed to install web dependencies."
    Pop-Location
    Exit 1
}
Pop-Location

# 4. Check configuration files
Write-Host "`n[4/4] Verifying configuration files..." -ForegroundColor Yellow
$EnvLocalPath = Join-Path $WebDir ".env.local"
if (-not (Test-Path $EnvLocalPath)) {
    Write-Host "⚠️ Warning: .env.local was not found at $EnvLocalPath." -ForegroundColor Yellow
    Write-Host "Please create a .env.local file with the following keys for local development:" -ForegroundColor Yellow
    Write-Host "  MONGODB_URI=<your_mongodb_connection_string>"
    Write-Host "  GEMINI_API_KEY=<your_gemini_api_key>"
} else {
    Write-Host "✓ .env.local configuration file detected." -ForegroundColor Green
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "                     SETUP COMPLETE!                      " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "`nTo run the application locally:"
Write-Host "1. To start the Python ADK Agents API Server:" -ForegroundColor Cyan
Write-Host "   & '$VenvDir\Scripts\python.exe' -m google.adk.cli api_server --host 0.0.0.0 --port 8080 --auto_create_session '$AgentsDir'"
Write-Host "`n2. To start the Next.js Frontend Dev Server:" -ForegroundColor Cyan
Write-Host "   cd web"
Write-Host "   npm run dev"
Write-Host "`n3. Open your browser and navigate to: http://localhost:3000"
Write-Host "==========================================================" -ForegroundColor Green
