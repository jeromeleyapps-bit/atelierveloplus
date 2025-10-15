# Script de diagnostic Cloudflare Tunnel
# Vérifie la configuration et identifie les problèmes

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Diagnostic Tunnel Cloudflare" -ForegroundColor Cyan
Write-Host "  rdv.upgradedbikes.com" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$allOk = $true

# 1. Vérifier cloudflared.exe
Write-Host "1. Verification cloudflared.exe..." -ForegroundColor Yellow
if (Test-Path "C:\cloudflared\cloudflared.exe") {
    Write-Host "   ✅ cloudflared.exe trouve" -ForegroundColor Green
    try {
        $version = & "C:\cloudflared\cloudflared.exe" --version 2>&1
        Write-Host "   Version: $version" -ForegroundColor White
    } catch {
        Write-Host "   ⚠️  Erreur lors de la verification de version" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ❌ cloudflared.exe MANQUANT" -ForegroundColor Red
    Write-Host "   Emplacement attendu: C:\cloudflared\cloudflared.exe" -ForegroundColor White
    Write-Host ""
    Write-Host "   Solution:" -ForegroundColor Yellow
    Write-Host "   1. Telecharger: https://github.com/cloudflare/cloudflared/releases" -ForegroundColor White
    Write-Host "   2. Placer dans: C:\cloudflared\" -ForegroundColor White
    Write-Host "   3. Executer: cloudflared login" -ForegroundColor White
    $allOk = $false
}

Write-Host ""

# 2. Vérifier config.yml
Write-Host "2. Verification config.yml..." -ForegroundColor Yellow
if (Test-Path "C:\cloudflared\config.yml") {
    Write-Host "   ✅ config.yml trouve" -ForegroundColor Green
    Write-Host "   Contenu:" -ForegroundColor White
    Get-Content "C:\cloudflared\config.yml" | ForEach-Object { 
        Write-Host "   $_" -ForegroundColor Gray
    }
} else {
    Write-Host "   ❌ config.yml MANQUANT" -ForegroundColor Red
    Write-Host "   Emplacement attendu: C:\cloudflared\config.yml" -ForegroundColor White
    Write-Host ""
    Write-Host "   Solution: Creer le fichier avec ce contenu:" -ForegroundColor Yellow
    Write-Host "   ---" -ForegroundColor Gray
    Write-Host "   tunnel: atelier-velo" -ForegroundColor Gray
    Write-Host "   credentials-file: C:\cloudflared\atelier-velo.json" -ForegroundColor Gray
    Write-Host "   ingress:" -ForegroundColor Gray
    Write-Host "     - hostname: rdv.upgradedbikes.com" -ForegroundColor Gray
    Write-Host "       service: http://localhost:3000" -ForegroundColor Gray
    Write-Host "     - service: http_status:404" -ForegroundColor Gray
    Write-Host "   ---" -ForegroundColor Gray
    $allOk = $false
}

Write-Host ""

# 3. Vérifier credentials
Write-Host "3. Verification fichier credentials..." -ForegroundColor Yellow
$credFiles = Get-ChildItem "C:\cloudflared\*.json" -ErrorAction SilentlyContinue
if ($credFiles) {
    Write-Host "   ✅ Fichier(s) credentials trouve(s):" -ForegroundColor Green
    $credFiles | ForEach-Object { 
        Write-Host "   - $($_.Name)" -ForegroundColor White
    }
} else {
    Write-Host "   ❌ Fichier credentials MANQUANT" -ForegroundColor Red
    Write-Host "   Emplacement attendu: C:\cloudflared\*.json" -ForegroundColor White
    Write-Host ""
    Write-Host "   Solution:" -ForegroundColor Yellow
    Write-Host "   1. Executer: cloudflared login" -ForegroundColor White
    Write-Host "   2. Se connecter au dashboard Cloudflare" -ForegroundColor White
    Write-Host "   3. Creer un tunnel nomme 'atelier-velo'" -ForegroundColor White
    $allOk = $false
}

Write-Host ""

# 4. Vérifier dossier cloudflared
Write-Host "4. Verification dossier C:\cloudflared..." -ForegroundColor Yellow
if (Test-Path "C:\cloudflared") {
    Write-Host "   ✅ Dossier existe" -ForegroundColor Green
    $files = Get-ChildItem "C:\cloudflared" -ErrorAction SilentlyContinue
    Write-Host "   Contenu:" -ForegroundColor White
    $files | ForEach-Object { 
        Write-Host "   - $($_.Name)" -ForegroundColor Gray
    }
} else {
    Write-Host "   ❌ Dossier C:\cloudflared MANQUANT" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Solution:" -ForegroundColor Yellow
    Write-Host "   1. Creer le dossier: mkdir C:\cloudflared" -ForegroundColor White
    Write-Host "   2. Telecharger cloudflared.exe dedans" -ForegroundColor White
    $allOk = $false
}

Write-Host ""

# 5. Tester connexion localhost
Write-Host "5. Test connexion Next.js (localhost:3000)..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host "   ✅ Next.js accessible (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Next.js NON accessible" -ForegroundColor Red
    Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor White
    Write-Host ""
    Write-Host "   Solution:" -ForegroundColor Yellow
    Write-Host "   1. Demarrer Next.js: npm run dev" -ForegroundColor White
    Write-Host "   2. Attendre que le serveur demarre" -ForegroundColor White
    Write-Host "   3. Relancer ce diagnostic" -ForegroundColor White
    $allOk = $false
}

Write-Host ""

# 6. Vérifier processus cloudflared
Write-Host "6. Verification processus cloudflared actif..." -ForegroundColor Yellow
$cloudflaredProcess = Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue
if ($cloudflaredProcess) {
    Write-Host "   ✅ Processus cloudflared en cours d'execution" -ForegroundColor Green
    Write-Host "   PID: $($cloudflaredProcess.Id)" -ForegroundColor White
} else {
    Write-Host "   ⚠️  Aucun processus cloudflared actif" -ForegroundColor Yellow
    Write-Host "   (Normal si le tunnel n'est pas demarre)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

# Résumé
Write-Host ""
if ($allOk) {
    Write-Host "✅ DIAGNOSTIC REUSSI" -ForegroundColor Green
    Write-Host ""
    Write-Host "Configuration OK. Pour demarrer le tunnel:" -ForegroundColor White
    Write-Host "  npm run dev:tunnel" -ForegroundColor Cyan
} else {
    Write-Host "❌ PROBLEMES DETECTES" -ForegroundColor Red
    Write-Host ""
    Write-Host "Suivez les solutions indiquees ci-dessus." -ForegroundColor White
    Write-Host ""
    Write-Host "Alternatives rapides:" -ForegroundColor Yellow
    Write-Host "  1. Localhost:     npm run dev" -ForegroundColor White
    Write-Host "                    http://localhost:3000/rdv" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  2. Ngrok:         ngrok http 3000" -ForegroundColor White
    Write-Host "                    (apres avoir demarre npm run dev)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Documentation complete: TUNNEL_RDV_DIAGNOSTIC.md" -ForegroundColor Gray
Write-Host ""
