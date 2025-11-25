# Script de demarrage Atelier Velo+
# Lance l'application en mode production locale

Write-Host "=== Demarrage Atelier Velo+ ===" -ForegroundColor Cyan
Write-Host ""

# Arreter les anciennes instances sur le port 3000
Write-Host "0. Verification port 3000..." -ForegroundColor Yellow
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($port3000) {
    Write-Host "   [!] Port 3000 deja utilise. Arret de l'ancienne instance..." -ForegroundColor Yellow
    $processId = $port3000.OwningProcess
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "   [OK] Port 3000 libere" -ForegroundColor Green
} else {
    Write-Host "   [OK] Port 3000 disponible" -ForegroundColor Green
}

Write-Host ""
# Verifier que PostgreSQL est demarre
Write-Host "1. Verification PostgreSQL..." -ForegroundColor Yellow
$pgService = Get-Service -Name "postgresql-x64-18" -ErrorAction SilentlyContinue
if ($pgService -and $pgService.Status -eq "Running") {
    Write-Host "   [OK] PostgreSQL est demarre" -ForegroundColor Green
} else {
    Write-Host "   [X] PostgreSQL n'est pas demarre" -ForegroundColor Red
    Write-Host "   Tentative de demarrage..." -ForegroundColor Yellow
    Start-Service -Name "postgresql-x64-18"
    Start-Sleep -Seconds 3
    Write-Host "   [OK] PostgreSQL demarre" -ForegroundColor Green
}

# Aller dans le dossier web
Set-Location "apps\web"

# Verifier que .env.local existe
Write-Host ""
Write-Host "2. Verification configuration..." -ForegroundColor Yellow
if (Test-Path ".env.local") {
    Write-Host "   [OK] Fichier .env.local trouve" -ForegroundColor Green
} else {
    Write-Host "   [X] Fichier .env.local manquant !" -ForegroundColor Red
    Write-Host "   Creez le fichier .env.local avec DATABASE_URL" -ForegroundColor Yellow
    exit 1
}

# Verifier que node_modules existe
Write-Host ""
Write-Host "3. Verification dependances..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "   [OK] Dependances installees" -ForegroundColor Green
} else {
    Write-Host "   Installation des dependances..." -ForegroundColor Yellow
    pnpm install
    Write-Host "   [OK] Dependances installees" -ForegroundColor Green
}

# Lancer l'application
Write-Host ""
Write-Host "4. Demarrage de l'application..." -ForegroundColor Yellow
Write-Host ""
Write-Host "=== Application Atelier Velo+ ===" -ForegroundColor Green
Write-Host "URL: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Dashboard: http://localhost:3000/dashboard" -ForegroundColor Cyan
Write-Host ""
Write-Host "Appuyez sur Ctrl+C pour arreter" -ForegroundColor Yellow
Write-Host ""

# Ouvrir le navigateur apres 5 secondes (le temps que Next.js demarre)
Start-Job -ScriptBlock {
    Start-Sleep -Seconds 5
    Start-Process "http://localhost:3000/dashboard"
} | Out-Null

# Lancer Next.js
npm run dev
