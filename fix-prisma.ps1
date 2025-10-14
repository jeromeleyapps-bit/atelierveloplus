###############################################################################
# Fix Prisma - Résolution des erreurs de migration
# Atelier Vélo+ - Jérôme Leyssard
###############################################################################

param(
    [switch]$Reset,
    [switch]$Baseline
)

$ErrorActionPreference = "Stop"

function Write-Step($msg) { Write-Host "`n>>> $msg..." -ForegroundColor Cyan }
function Write-Success($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Error($msg) { Write-Host "[ERREUR] $msg" -ForegroundColor Red }
function Write-Info($msg) { Write-Host "[INFO] $msg" -ForegroundColor Yellow }

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  FIX PRISMA - RÉSOLUTION ERREURS" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

# Vérifier les paramètres
if (-not $Reset -and -not $Baseline) {
    Write-Host "`nChoisissez une option:" -ForegroundColor Yellow
    Write-Host "  1. Reset (supprime les données) - Développement" -ForegroundColor White
    Write-Host "  2. Baseline (garde les données) - Production" -ForegroundColor White
    $choice = Read-Host "`nVotre choix (1 ou 2)"
    
    if ($choice -eq "1") {
        $Reset = $true
    } elseif ($choice -eq "2") {
        $Baseline = $true
    } else {
        Write-Error "Choix invalide"
        exit 1
    }
}

# Étape 1: Arrêter les processus
Write-Step "Arrêt des processus Node.js"
Get-Process | Where-Object {$_.ProcessName -like "*node*" -or $_.ProcessName -like "*next*"} | ForEach-Object {
    Write-Info "Arrêt: $($_.ProcessName) (PID: $($_.Id))"
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 2
Write-Success "Processus arrêtés"

# Étape 2: Naviguer vers apps/web
Set-Location "apps\web"

if ($Reset) {
    # OPTION 1: RESET
    Write-Step "Reset de la base de données"
    Write-Host "⚠️  ATTENTION: Toutes les données seront supprimées!" -ForegroundColor Red
    $confirm = Read-Host "Confirmer le reset? (oui/non)"
    
    if ($confirm -ne "oui") {
        Write-Info "Opération annulée"
        exit 0
    }
    
    Write-Info "Suppression de la base de données..."
    Remove-Item "data\atelier.db" -ErrorAction SilentlyContinue
    Remove-Item "data\atelier.db-journal" -ErrorAction SilentlyContinue
    Write-Success "Base supprimée"
    
    Write-Step "Création de la nouvelle base"
    npx prisma migrate reset --force --skip-seed
    if ($LASTEXITCODE -ne 0) { throw "Migrate reset échoué" }
    Write-Success "Base recréée"
    
} elseif ($Baseline) {
    # OPTION 2: BASELINE
    Write-Step "Baseline de la base de données"
    
    Write-Info "Création de la migration initiale..."
    npx prisma migrate dev --name init --create-only
    if ($LASTEXITCODE -ne 0) { throw "Création migration échouée" }
    
    Write-Info "Marquage de la migration comme appliquée..."
    npx prisma migrate resolve --applied init
    if ($LASTEXITCODE -ne 0) { throw "Resolve migration échouée" }
    Write-Success "Baseline créée"
    
    Write-Step "Ajout des nouveaux champs vélos"
    npx prisma migrate dev --name add_bike_specs
    if ($LASTEXITCODE -ne 0) { throw "Migration bike specs échouée" }
    Write-Success "Migration appliquée"
}

# Étape 3: Générer le client Prisma
Write-Step "Génération du client Prisma"
npx prisma generate
if ($LASTEXITCODE -ne 0) { throw "Prisma generate échoué" }
Write-Success "Client Prisma généré"

# Étape 4: Vérification
Write-Step "Vérification"
$dbPath = "data\atelier.db"
if (Test-Path $dbPath) {
    $size = (Get-Item $dbPath).Length
    Write-Success "Base de données OK ($([math]::Round($size/1KB, 2)) KB)"
} else {
    Write-Info "Base de données sera créée au premier démarrage"
}

# Vérifier que le client Prisma est bien généré
$prismaClientPath = "..\..\node_modules\.pnpm\@prisma+client@6.16.3_prism_5310e72477f1398b2a8f5aee2cb08572\node_modules\@prisma\client"
if (Test-Path $prismaClientPath) {
    Write-Success "Client Prisma OK"
} else {
    Write-Info "Client Prisma généré dans le store pnpm"
}

Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✅ PRISMA CORRIGÉ" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green

Write-Host "`n🚀 Vous pouvez maintenant:" -ForegroundColor Cyan
Write-Host "  1. Démarrer l'application: npm run dev" -ForegroundColor White
Write-Host "  2. Tester l'historique des vélos" -ForegroundColor White

Write-Host "`n"
