# Automated build script for Atelier Velo+
# Run in PowerShell as Administrator

param(
    [switch]$SkipNodeCheck,
    [switch]$SkipClean
)

$ErrorActionPreference = 'Stop'

function Write-Step { param([string]$Message) Write-Host "`n>>> $Message" -ForegroundColor Yellow }
function Write-Ok   { param([string]$Message) Write-Host "[OK] $Message" -ForegroundColor Green }
function Write-Fail { param([string]$Message) Write-Host "[ERR] $Message" -ForegroundColor Red }

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Automated Build - Atelier Velo+       " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

try {
    # Step 1: Node.js version check
    if (-not $SkipNodeCheck) {
        Write-Step "Checking Node.js version..."
        $nodeVersion = node -v
        Write-Host "Current Node: $nodeVersion"
        $requiredVersion = "v20.18.0"

        if ($nodeVersion -ne $requiredVersion) {
            Write-Host "Wrong Node version. Required: $requiredVersion" -ForegroundColor Yellow
            $nvmAvailable = Get-Command nvm -ErrorAction SilentlyContinue
            if ($nvmAvailable) {
                Write-Host "Installing Node $requiredVersion via nvm..." -ForegroundColor Yellow
                nvm install 20.18.0 | Out-Null
                nvm use 20.18.0 | Out-Null
                $nodeVersion = node -v
                if ($nodeVersion -ne $requiredVersion) { throw "Could not switch to $requiredVersion (now $nodeVersion)" }
                Write-Ok "Node $requiredVersion active"
            } else {
                Write-Fail "nvm not found. Please install Node $requiredVersion manually: https://nodejs.org/"
                exit 1
            }
        } else {
            Write-Ok "Node version OK: $nodeVersion"
        }
    }

    # Step 2: Stop running processes
    Write-Step "Stopping running Electron/Node processes..."
    Get-Process | Where-Object { $_.ProcessName -like "*Atelier*" } | Stop-Process -Force -ErrorAction SilentlyContinue
    Get-Process | Where-Object { $_.ProcessName -eq "node" } | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
    Write-Ok "Processes stopped"

    # Step 3: Clean web workspace
    if (-not $SkipClean) {
        Write-Step "Cleaning apps/web..."
        Set-Location "C:\Users\j_ley\Atelier-velo+\apps\web"
        Remove-Item node_modules -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item nm_old -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item package-lock.json -Force -ErrorAction SilentlyContinue
        Remove-Item pnpm-lock.yaml -Force -ErrorAction SilentlyContinue
        Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
        try { pnpm store prune } catch {}
        Write-Ok "Clean done"
    }

    # Step 4: Install deps
    Write-Step "Installing dependencies (pnpm install)..."
    Set-Location "C:\Users\j_ley\Atelier-velo+\apps\web"
    pnpm install --force
    if ($LASTEXITCODE -ne 0) { throw "Dependency installation failed" }
    Write-Ok "Dependencies installed"

    # Step 5: Prisma generate
    Write-Step "Prisma generate..."
    pnpm prisma generate
    if ($LASTEXITCODE -ne 0) { throw "Prisma generate failed" }
    Write-Ok "Prisma client generated"

    # Step 5b: Create migration in dev (optional; safe even if already applied)
    Write-Step "Creating migration in dev (make_workorderid_optional)..."
    try {
        npx prisma migrate dev --name make_workorderid_optional --skip-seed
        Write-Ok "Migration (dev) completed"
    } catch {
        Write-Host "Migration dev skipped or failed (continuing): $($_.Exception.Message)" -ForegroundColor Yellow
    }

    # Step 6: Next.js build
    Write-Step "Next.js build..."
    pnpm build
    if ($LASTEXITCODE -ne 0) { throw "Next.js build failed" }
    Write-Ok "Next.js build done"
    
    # Step 6a: Verify styled-jsx was copied
    Write-Step "Verifying styled-jsx in standalone..."
    $styledJsxPath = ".next\standalone\apps\web\node_modules\styled-jsx"
    if (Test-Path $styledJsxPath) {
        Write-Ok "styled-jsx present in standalone"
    } else {
        Write-Host "styled-jsx NOT found in standalone - this will cause white screen!" -ForegroundColor Red
        throw "styled-jsx missing from standalone build"
    }

    # Step 6b: Check START_TUNNEL in apps/web/.env
    Write-Step "Checking START_TUNNEL in apps/web/.env"
    $envPath = "C:\Users\j_ley\Atelier-velo+\apps\web\.env"
    if (Test-Path $envPath) {
        $startTunnel = (Select-String -Path $envPath -Pattern '^START_TUNNEL=' -SimpleMatch | ForEach-Object { $_.Line })
        if ($null -ne $startTunnel -and $startTunnel -ne '') {
            Write-Host "  $startTunnel"
        } else {
            Write-Host "  START_TUNNEL not set in .env" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  .env introuvable: $envPath" -ForegroundColor Yellow
    }

    # Step 7: Verify standalone build
    Write-Step "Verifying standalone output..."
    $standalone = ".next\standalone\apps\web\server.js"
    if (-not (Test-Path $standalone)) { throw "Standalone server.js not found at $standalone" }
    Write-Ok "Standalone OK"

    # Step 8: Electron build
    Write-Step "Electron build..."
    Set-Location "C:\Users\j_ley\Atelier-velo+\apps\desktop"
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "Electron build failed" }
    Write-Ok "Electron build done"

    # Step 8b: Ensure prisma migrations are included in packaged resources
    Write-Step "Copying prisma directory into packaged resources..."
    $packWebPath = "C:\Users\j_ley\Atelier-velo+\apps\desktop\dist\win-unpacked\resources\web"
    if (Test-Path $packWebPath) {
        Copy-Item "C:\Users\j_ley\Atelier-velo+\apps\web\prisma" -Destination $packWebPath -Recurse -Force -ErrorAction SilentlyContinue
        Write-Ok "Prisma directory copied"
    } else {
        Write-Host "Packaged web path not found: $packWebPath" -ForegroundColor Yellow
    }

    # Step 8c: Optionally reset packaged DB
    Write-Step "Reset packaged DB (optional)"
    $ans = Read-Host "Do you want to delete packaged DB? (O/N)"
    if ($ans -match '^(O|o|Y|y)$') {
        $dbPath = "$env:APPDATA\atelier-velo-desktop\data\atelier.db"
        Remove-Item $dbPath -Force -ErrorAction SilentlyContinue
        Write-Ok "Packaged DB deleted"
    } else {
        Write-Host "DB keep selected" -ForegroundColor Yellow
    }

    # Step 8d: Apply migrations inside packaged app (only if Prisma CLI present)
    Write-Step "Applying migrations in packaged app (conditional)..."
    if (Test-Path $packWebPath) {
        Push-Location $packWebPath
        $env:DATABASE_URL = "file:$env:APPDATA\atelier-velo-desktop\data\atelier.db"
        $hasPrismaBin = Test-Path ".\node_modules\.bin\prisma"
        $hasPrismaEngines = Test-Path ".\node_modules\@prisma\engines"
        if ($hasPrismaBin -or $hasPrismaEngines) {
            $migrated = $false
            try {
                npx prisma migrate deploy
                if ($LASTEXITCODE -eq 0) { $migrated = $true }
            } catch {}
            if (-not $migrated) {
                try {
                    node node_modules\.pnpm\prisma@6.16.3*\node_modules\prisma\build\index.js migrate deploy
                    if ($LASTEXITCODE -eq 0) { $migrated = $true }
                } catch {}
            }
            if ($migrated) { Write-Ok "Packaged migrations applied" } else { Write-Host "Packaged migrations could not be applied" -ForegroundColor Yellow }
        } else {
            Write-Host "Prisma CLI not present in packaged resources, skipping migrate deploy" -ForegroundColor Yellow
        }
        Pop-Location
    }

    # Step 9: Verify exe (accent-safe wildcard)
    Write-Step "Verifying executable..."
    $exePath = Get-ChildItem "dist\win-unpacked" -Filter "Atelier*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $exePath) {
        Write-Host "Executable not found in dist\win-unpacked" -ForegroundColor Yellow
    } else {
        Write-Ok "Executable generated: $($exePath.Name)"
    }

    # Summary
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  BUILD COMPLETED SUCCESSFULLY          " -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "To launch the app:" -ForegroundColor Cyan
    Write-Host "  cd C:\Users\j_ley\Atelier-velo+\apps\desktop\dist\win-unpacked"
    Write-Host "  .\Atelier Velo+.exe  (or use the exact filename shown above)"

} catch {
    Write-Host "`n========================================" -ForegroundColor Red
    Write-Host "  BUILD FAILED                          " -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Fail $_.Exception.Message
    Write-Host ""
    Write-Host "See BUILD_PROCEDURE.md for details." -ForegroundColor Yellow
    exit 1
}