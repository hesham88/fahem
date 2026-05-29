# Deploy Fahem Python Agent Microservice to GCP Cloud Run
# Usage: .\scripts\deploy\deploy_agent.ps1

Write-Host '==========================================================' -ForegroundColor Cyan
Write-Host '          FAHEM AGENT CLOUD RUN PRODUCTION DEPLOY         ' -ForegroundColor Cyan
Write-Host '==========================================================' -ForegroundColor Cyan

$RootDir = Resolve-Path "$PSScriptRoot\..\.."
$AgentsDir = Join-Path $RootDir 'agents'

# 1. Check if gcloud is installed
Write-Host 'Verifying GCP CLI installation...' -ForegroundColor Yellow
try {
    $gcloudVersion = gcloud --version
    Write-Host '[OK] gcloud CLI is installed.' -ForegroundColor Green
} catch {
    Write-Error 'gcloud CLI is not installed or not in system PATH. Please install Google Cloud SDK.'
    Exit 1
}

# 2. Check current active project
Write-Host 'Checking active Google Cloud project...' -ForegroundColor Yellow
$project = (gcloud config get-value project) 2>$null
if (-not $project) {
    Write-Error 'No active GCP project configured. Please run "gcloud auth login" and "gcloud config set project fahem-88d40" first.'
    Exit 1
}
Write-Host "Active project: $project" -ForegroundColor Green

if ($project -ne 'fahem-88d40') {
    Write-Host "WARNING: Your active project is '$project' instead of 'fahem-88d40'." -ForegroundColor Yellow
    $confirm = Read-Host 'Do you want to continue deploying to this project? (y/N)'
    if ($confirm -ne 'y' -and $confirm -ne 'yes') {
        Write-Host 'Deployment aborted.' -ForegroundColor Red
        Exit 0
    }
}

# 3. Deploy to Cloud Run
Write-Host 'Deploying agent microservice to Cloud Run...' -ForegroundColor Yellow
Write-Host "Source directory: $AgentsDir" -ForegroundColor Gray

try {
    # Execute the gcloud deploy in a single, robust line with no backticks, using correct --vpc-egress argument
    gcloud run deploy fahem-agent --source $AgentsDir --region us-east4 --vpc-connector fahem-connector --vpc-egress all-traffic --set-secrets='GEMINI_API_KEY=fahem_gemini_api_key:latest,MONGODB_URI=fahem_mongodb_uri:latest' --quiet
        
    Write-Host '==========================================================' -ForegroundColor Green
    Write-Host '                 DEPLOYMENT SUCCESSFUL!                   ' -ForegroundColor Green
    Write-Host '==========================================================' -ForegroundColor Green
    
    # Get and print service URL
    $serviceUrl = gcloud run services describe fahem-agent --region us-east4 --format='value(status.url)'
    Write-Host 'Service URL: ' -NoNewline
    Write-Host $serviceUrl -ForegroundColor Cyan
    Write-Host '==========================================================' -ForegroundColor Green
} catch {
    Write-Error 'Cloud Run deployment failed. Please check the error log above.'
    Exit 1
}
