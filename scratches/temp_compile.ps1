# Configure Google Cloud Armor WAF & Rate Limiting for Fahem Backend API
# Usage: .\scripts\deploy\configure_cloud_armor.ps1

Write-Host '==========================================================' -ForegroundColor Cyan
Write-Host '         FAHEM CLOUD ARMOR & LOAD BALANCER CONFIG         ' -ForegroundColor Cyan
Write-Host '==========================================================' -ForegroundColor Cyan

$RootDir = Resolve-Path "$PSScriptRoot\..\.."
$ProjectName = "fahem-88d40"
$PolicyName = "fahem-armor-policy"
$Region = "us-east4"
$Service = "fahem-agent"

# 1. Verify gcloud installation
Write-Host 'Verifying GCP CLI installation...' -ForegroundColor Yellow
try {
    $gcloudVersion = gcloud --version
    Write-Host '[OK] gcloud CLI is installed.' -ForegroundColor Green
} catch {
    Write-Error 'gcloud CLI is not installed or not in system PATH. Please install Google Cloud SDK.'
    Exit 1
}

# 2. Verify active project
Write-Host 'Checking active Google Cloud project...' -ForegroundColor Yellow
$project = (gcloud config get-value project) 2>$null
if (-not $project) {
    Write-Error 'No active GCP project configured. Please run "gcloud auth login" and "gcloud config set project fahem-88d40" first.'
    Exit 1
}
Write-Host "Active project: $project" -ForegroundColor Green

if ($project -ne $ProjectName) {
    Write-Host "WARNING: Your active project is '$project' instead of '$ProjectName'." -ForegroundColor Yellow
    $confirm = Read-Host "Do you want to continue configuring Cloud Armor in project '$project'? (y/N)"
    if ($confirm -ne 'y' -and $confirm -ne 'yes') {
        Write-Host 'Configuration aborted.' -ForegroundColor Red
        Exit 0
    }
}

# 3. Create Cloud Armor Security Policy
Write-Host "`n[1/5] Creating Cloud Armor Security Policy: $PolicyName..." -ForegroundColor Yellow
try {
    gcloud compute security-policies create $PolicyName `
        --description "Cloud Armor WAF and rate limiting policy for Fahem Backend API" `
        --quiet
    Write-Host "✓ Security policy '$PolicyName' created successfully." -ForegroundColor Green

}