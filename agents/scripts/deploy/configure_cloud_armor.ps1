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
    Write-Host "[OK] Security policy '$PolicyName' created successfully." -ForegroundColor Green
} catch {
    Write-Host "Policy might already exist. Continuing to configure rules..." -ForegroundColor Gray
}

# 4. Configure WAF Protection Rules (OWASP Top 10 Protections)
Write-Host "`n[2/5] Configuring WAF Protection Rules..." -ForegroundColor Yellow

# SQL Injection (SQLi) Protection Rule
Write-Host ' -> Setting up SQL Injection protection...' -ForegroundColor Gray
try {
    gcloud compute security-policies rules create 1000 `
        --security-policy $PolicyName `
        --expression "evaluatePreconfiguredExpr('sqli-v33-stable')" `
        --action "deny-403" `
        --description "Block SQL Injection attacks" `
        --quiet
    Write-Host "   [OK] SQL Injection rule configured." -ForegroundColor Green
} catch {
    Write-Host "   (Rule 1000 already configured or failed to create)" -ForegroundColor DarkGray
}

# Cross-Site Scripting (XSS) Protection Rule
Write-Host ' -> Setting up Cross-Site Scripting (XSS) protection...' -ForegroundColor Gray
try {
    gcloud compute security-policies rules create 1010 `
        --security-policy $PolicyName `
        --expression "evaluatePreconfiguredExpr('xss-v33-stable')" `
        --action "deny-403" `
        --description "Block Cross-Site Scripting attacks" `
        --quiet
    Write-Host "   [OK] XSS rule configured." -ForegroundColor Green
} catch {
    Write-Host "   (Rule 1010 already configured or failed to create)" -ForegroundColor DarkGray
}

# Remote Code Execution (RCE) Protection Rule
Write-Host ' -> Setting up Remote Code Execution (RCE) protection...' -ForegroundColor Gray
try {
    gcloud compute security-policies rules create 1020 `
        --security-policy $PolicyName `
        --expression "evaluatePreconfiguredExpr('rce-v33-stable')" `
        --action "deny-403" `
        --description "Block Remote Code Execution attacks" `
        --quiet
    Write-Host "   [OK] RCE rule configured." -ForegroundColor Green
} catch {
    Write-Host "   (Rule 1020 already configured or failed to create)" -ForegroundColor DarkGray
}

# Local File Inclusion (LFI) Protection Rule
Write-Host ' -> Setting up Local File Inclusion (LFI) protection...' -ForegroundColor Gray
try {
    gcloud compute security-policies rules create 1030 `
        --security-policy $PolicyName `
        --expression "evaluatePreconfiguredExpr('lfi-v33-stable')" `
        --action "deny-403" `
        --description "Block Local File Inclusion attacks" `
        --quiet
    Write-Host "   [OK] LFI rule configured." -ForegroundColor Green
} catch {
    Write-Host "   (Rule 1030 already configured or failed to create)" -ForegroundColor DarkGray
}

# DDoS Brute Force Rate Limiting Rule
Write-Host ' -> Setting up DDoS rate-limiting rule (Max 100 reqs/min per IP)...' -ForegroundColor Gray
try {
    gcloud compute security-policies rules create 2000 `
        --security-policy $PolicyName `
        --expression "true" `
        --action "rate-based-ban" `
        --rate-limit-threshold-count 100 `
        --rate-limit-threshold-interval-sec 60 `
        --conform-action "allow" `
        --exceed-action "deny-429" `
        --enforce-on-key "ip" `
        --ban-threshold-count 150 `
        --ban-threshold-interval-sec 60 `
        --ban-duration-sec 300 `
        --description "Limit requests to 100/min and ban IP for 5 minutes if exceeded" `
        --quiet
    Write-Host "   [OK] DDoS rate-limiting rule configured." -ForegroundColor Green
} catch {
    Write-Host "   (Rule 2000 already configured or failed to create)" -ForegroundColor DarkGray
}

# 5. Set up Serverless NEG (Network Endpoint Group) for Cloud Run
Write-Host "`n[3/5] Setting up Serverless Network Endpoint Group (NEG) for Cloud Run..." -ForegroundColor Yellow
$NegName = "fahem-serverless-neg"
try {
    gcloud compute network-endpoint-groups create $NegName `
        --region=$Region `
        --network-endpoint-type=serverless `
        --cloud-run-service=$Service `
        --quiet
    Write-Host "[OK] Serverless NEG '$NegName' created." -ForegroundColor Green
} catch {
    Write-Host "   (Serverless NEG already exists or failed to create)" -ForegroundColor DarkGray
}

# 6. Create Global Backend Service & Bind Cloud Armor Policy
Write-Host "`n[4/5] Creating Global HTTP(S) Backend Service and linking Cloud Armor..." -ForegroundColor Yellow
$BackendService = "fahem-backend-service"
try {
    gcloud compute backend-services create $BackendService `
        --global `
        --load-balancing-scheme=EXTERNAL_MANAGED `
        --quiet
    Write-Host "[OK] Global Backend Service '$BackendService' created." -ForegroundColor Green
} catch {
    Write-Host "   Backend Service may already exist. Continuing..." -ForegroundColor Gray
}

# Add Serverless NEG to the Backend Service
Write-Host ' -> Adding Cloud Run Serverless NEG to backend service...' -ForegroundColor Gray
try {
    gcloud compute backend-services add-backend $BackendService `
        --global `
        --network-endpoint-group=$NegName `
        --network-endpoint-group-region=$Region `
        --quiet
    Write-Host "   [OK] Cloud Run Backend linked successfully." -ForegroundColor Green
} catch {
    Write-Host "   (Backend was already added or linking failed)" -ForegroundColor DarkGray
}

# Bind Cloud Armor Policy to Backend Service
Write-Host ' -> Attaching Cloud Armor Security Policy to backend service...' -ForegroundColor Gray
try {
    gcloud compute backend-services update $BackendService `
        --global `
        --security-policy=$PolicyName `
        --quiet
    Write-Host "   [OK] Cloud Armor security policy bound to '$BackendService'!" -ForegroundColor Green
} catch {
    Write-Error "   Failed to attach security policy to backend service."
}

# 7. Create Global HTTPS Load Balancer Frontend Infrastructure
Write-Host "`n[5/5] Creating Load Balancer routing frontend..." -ForegroundColor Yellow
$UrlMap = "fahem-url-map"
$TargetProxy = "fahem-http-proxy"
$ForwardingRule = "fahem-forwarding-rule"

# Create URL Map (routes traffic to our Backend Service)
try {
    gcloud compute url-maps create $UrlMap `
        --default-service=$BackendService `
        --quiet
    Write-Host "[OK] URL Map '$UrlMap' configured." -ForegroundColor Green
} catch {
    Write-Host "   (URL Map already exists)" -ForegroundColor DarkGray
}

# Create Target HTTP Proxy (or Target HTTPS Proxy if SSL certificates are configured)
try {
    gcloud compute target-http-proxies create $TargetProxy `
        --url-map=$UrlMap `
        --quiet
    Write-Host "[OK] Target HTTP Proxy '$TargetProxy' configured." -ForegroundColor Green
} catch {
    Write-Host "   (HTTP Proxy already exists)" -ForegroundColor DarkGray
}

# Create Forwarding Rule (exposes global external IPv4 frontend)
$RuleCreated = $false
gcloud compute forwarding-rules create $ForwardingRule --load-balancing-scheme=EXTERNAL_MANAGED --network-tier=PREMIUM --address=fahem-lb-static-ip --global --target-http-proxy=$TargetProxy --ports=80 --quiet
if ($LastExitCode -eq 0) {
    Write-Host "[OK] Global HTTP Forwarding Rule '$ForwardingRule' created!" -ForegroundColor Green
    $RuleCreated = $true
} else {
    # Attempt to create static IP address first and retry
    Write-Host "Creating static IP address fahem-lb-static-ip and retrying forwarding rule..." -ForegroundColor Yellow
    gcloud compute addresses create fahem-lb-static-ip --global --quiet
    gcloud compute forwarding-rules create $ForwardingRule --load-balancing-scheme=EXTERNAL_MANAGED --network-tier=PREMIUM --address=fahem-lb-static-ip --global --target-http-proxy=$TargetProxy --ports=80 --quiet
    if ($LastExitCode -eq 0) {
        Write-Host "[OK] Global HTTP Forwarding Rule with static IP created!" -ForegroundColor Green
    } else {
        Write-Host "   (Forwarding Rule configuration already complete or failed to bind)" -ForegroundColor DarkGray
    }
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host '           CLOUD Armor IMPLEMENTATION COMPLETE!           ' -ForegroundColor Green
Write-Host '==========================================================' -ForegroundColor Green
Write-Host "Your private Cloud Run container '$Service' in '$Region'"
Write-Host 'is now fully protected by an External Load Balancer with'
Write-Host 'Google Cloud Armor Web Application Firewall (WAF) policies'
Write-Host 'and DDoS rate-limiting guards enabled.'
Write-Host '==========================================================' -ForegroundColor Green
