# Deploy Fahem Next.js Web Frontend to Firebase App Hosting
# Usage: .\scripts\deploy\deploy_web.ps1 [-CommitMessage "Your commit message"]

param (
    [string]$CommitMessage = "Fix: Automated deployment update"
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "         FAHEM WEB INTERFACE PRODUCTION DEPLOY            " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$RootDir = Resolve-Path "$PSScriptRoot\..\.."

# 1. Check Git environment
Write-Host "`n[1/3] Verifying Git environment..." -ForegroundColor Yellow
try {
    $gitVersion = git --version
    Write-Host '✓ Git is installed.' -ForegroundColor Green
} catch {
    Write-Error 'Git is not installed or not in system PATH.'
    Exit 1
}

# Ensure Git author identity is correctly set to comply with project guidelines
Write-Host 'Configuring Git author identity to: hesham88 (hesham1988@gmail.com)...' -ForegroundColor Gray
git config user.name "hesham88"
git config user.email "hesham1988@gmail.com"

# 2. Stage and Commit changes
Write-Host "`n[2/3] Checking for modified files and committing..." -ForegroundColor Yellow
$status = git status --porcelain
if (-not $status) {
    Write-Host '✓ No changes to deploy. Git workspace is clean.' -ForegroundColor Green
} else {
    Write-Host 'Modified files detected:' -ForegroundColor Gray
    Write-Host $status -ForegroundColor DarkGray
    
    Write-Host "Staging and committing files with message: '$CommitMessage'..." -ForegroundColor Gray
    git add -A
    git commit -m $CommitMessage --author="hesham88 <hesham1988@gmail.com>"
    Write-Host '✓ Committed successfully.' -ForegroundColor Green
}

# 3. Push to GitHub to trigger Firebase App Hosting CI/CD
Write-Host "`n[3/3] Pushing changes to GitHub 'main' branch..." -ForegroundColor Yellow
try {
    # Get current branch
    $branch = git branch --show-current
    if ($branch -ne "main") {
        Write-Host "⚠️ Warning: You are on branch '$branch'. Merging and pushing to 'main' is recommended." -ForegroundColor Yellow
        $confirm = Read-Host "Do you want to force push '$branch' to GitHub 'main' branch? (y/N)"
        if ($confirm -eq "y" -or $confirm -eq "yes") {
            git push origin "${branch}:main"
        } else {
            Write-Host 'Deployment aborted.' -ForegroundColor Red
            Exit 0
        }
    } else {
        git push origin main
    }
    
    Write-Host "`n==========================================================" -ForegroundColor Green
    Write-Host '               PUSH COMPLETE AND DEPLOY TRIGGERED           ' -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host 'Your changes have been pushed to GitHub. This triggers the'
    Write-Host 'automated Firebase App Hosting build pipeline.'
    Write-Host "`nTrack build progress on the Firebase App Hosting Console:" -ForegroundColor Gray
    Write-Host 'https://console.firebase.google.com/project/fahem-88d40/apphosting' -ForegroundColor Cyan
    Write-Host "==========================================================" -ForegroundColor Green
} catch {
    Write-Error 'Git push failed. Please verify your internet connection and remote repository permissions.'
    Exit 1
}
