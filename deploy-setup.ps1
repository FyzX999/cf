# Deployment Setup Script for cheapfollower.shop
# This script helps you prepare for GitHub + Vercel deployment

Write-Host "=== cheapfollower.shop Deployment Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if Git is installed
Write-Host "Checking for Git..." -ForegroundColor Yellow
$gitInstalled = Get-Command git -ErrorAction SilentlyContinue

if (-not $gitInstalled) {
    Write-Host "❌ Git is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Git first:" -ForegroundColor Yellow
    Write-Host "1. Download from: https://git-scm.com/download/win" -ForegroundColor White
    Write-Host "2. Run the installer (use default settings)" -ForegroundColor White
    Write-Host "3. Restart PowerShell and run this script again" -ForegroundColor White
    Write-Host ""
    Write-Host "Press any key to open Git download page..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    Start-Process "https://git-scm.com/download/win"
    exit
}

Write-Host "✓ Git is installed" -ForegroundColor Green
Write-Host ""

# Check for .env.local file
Write-Host "Checking for environment variables..." -ForegroundColor Yellow
if (Test-Path ".env.local") {
    Write-Host "✓ .env.local file found" -ForegroundColor Green
    Write-Host "⚠️  Remember: Do NOT commit .env.local to GitHub!" -ForegroundColor Yellow
    Write-Host "   (It's already in .gitignore)" -ForegroundColor Gray
} else {
    Write-Host "⚠️  .env.local file not found" -ForegroundColor Yellow
    Write-Host "   You'll need to configure environment variables in Vercel later" -ForegroundColor Gray
}
Write-Host ""

# Check if git repo exists
Write-Host "Checking Git repository status..." -ForegroundColor Yellow
$gitInitialized = Test-Path ".git"

if (-not $gitInitialized) {
    Write-Host "Initializing Git repository..." -ForegroundColor Cyan
    git init
    Write-Host "✓ Git repository initialized" -ForegroundColor Green
} else {
    Write-Host "✓ Git repository already initialized" -ForegroundColor Green
}
Write-Host ""

# Stage all files
Write-Host "Staging files for commit..." -ForegroundColor Cyan
git add .
Write-Host "✓ Files staged" -ForegroundColor Green
Write-Host ""

# Show what will be committed
Write-Host "Files ready to commit:" -ForegroundColor Yellow
git status --short
Write-Host ""

# Create initial commit
Write-Host "Creating initial commit..." -ForegroundColor Cyan
$commitExists = git log --oneline 2>$null

if (-not $commitExists) {
    git commit -m "Initial commit: cheapfollower.shop SMM panel"
    Write-Host "✓ Initial commit created" -ForegroundColor Green
} else {
    Write-Host "Commits already exist. Creating new commit with recent changes..." -ForegroundColor Yellow
    git commit -m "Update: Latest changes before deployment" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ New commit created" -ForegroundColor Green
    } else {
        Write-Host "ℹ️  No changes to commit" -ForegroundColor Gray
    }
}
Write-Host ""

# Next steps
Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. CREATE GITHUB REPOSITORY" -ForegroundColor Yellow
Write-Host "   • Go to: https://github.com/new" -ForegroundColor White
Write-Host "   • Name: cheapfollower-shop (or your choice)" -ForegroundColor White
Write-Host "   • Visibility: Private (recommended)" -ForegroundColor White
Write-Host "   • Do NOT initialize with README/license" -ForegroundColor White
Write-Host ""

Write-Host "2. PUSH TO GITHUB" -ForegroundColor Yellow
Write-Host "   After creating the repo, run these commands:" -ForegroundColor White
Write-Host ""
Write-Host "   git remote add origin https://github.com/YOUR_USERNAME/cheapfollower-shop.git" -ForegroundColor Cyan
Write-Host "   git branch -M main" -ForegroundColor Cyan
Write-Host "   git push -u origin main" -ForegroundColor Cyan
Write-Host ""
Write-Host "   (Replace YOUR_USERNAME with your GitHub username)" -ForegroundColor Gray
Write-Host ""

Write-Host "3. DEPLOY TO VERCEL" -ForegroundColor Yellow
Write-Host "   • Go to: https://vercel.com/new" -ForegroundColor White
Write-Host "   • Sign in with GitHub" -ForegroundColor White
Write-Host "   • Import your repository" -ForegroundColor White
Write-Host "   • Add environment variables" -ForegroundColor White
Write-Host "   • Deploy!" -ForegroundColor White
Write-Host ""

Write-Host "📖 See DEPLOYMENT.md for detailed instructions" -ForegroundColor Cyan
Write-Host ""

Write-Host "Press any key to open GitHub new repo page..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
Start-Process "https://github.com/new"
