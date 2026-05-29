# Deploy Both Agent and Web Frontend to Production
# Usage: .\scripts\deploy\deploy_all.ps1 [-CommitMessage "Your commit message"]

param (
    [string]$CommitMessage = "Fix: Automated deployment update"
)

Write-Host "==========================================================" -ForegroundColor Magenta
Write-Host "             FAHEM FULL PRODUCTION DEPLOYMENT             " -ForegroundColor Magenta
Write-Host "==========================================================" -ForegroundColor Magenta

$ScriptDir = $PSScriptRoot

# 1. Run Agent deployment first
Write-Host "`n>>> [STEP 1/2] Deploying Agent Microservice to Cloud Run..." -ForegroundColor Cyan
& (Join-Path $ScriptDir "deploy_agent.ps1")
if ($LASTEXITCODE -ne 0) {
    Write-Error "Deployment stopped because Agent deployment failed."
    Exit 1
}

# 2. Run Web deployment second
Write-Host "`n>>> [STEP 2/2] Deploying Web Frontend to App Hosting..." -ForegroundColor Cyan
& (Join-Path $ScriptDir "deploy_web.ps1") -CommitMessage $CommitMessage
if ($LASTEXITCODE -ne 0) {
    Write-Error "Deployment stopped because Web deployment failed."
    Exit 1
}

Write-Host "`n==========================================================" -ForegroundColor Magenta
Write-Host "             FULL PRODUCTION DEPLOYMENT TRIGGERED         " -ForegroundColor Magenta
Write-Host "==========================================================" -ForegroundColor Magenta
