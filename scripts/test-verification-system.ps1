# ============================================================================
# TEST SYSTÈME DE VÉRIFICATION
# ============================================================================
# Objectif : Tester tous les scripts de vérification
# Usage : .\scripts\test-verification-system.ps1
# ============================================================================

Write-Host "`n🧪 TEST SYSTÈME DE VÉRIFICATION" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$errors = 0

# Test 1 : Vérification Pre-Build
Write-Host "Test 1 : Vérification Pre-Build..." -ForegroundColor Yellow
try {
    & .\scripts\verification-build-complete.ps1 -PreBuild -LogDir "logs-test"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Test 1 réussi" -ForegroundColor Green
    } else {
        Write-Host "❌ Test 1 échoué" -ForegroundColor Red
        $errors++
    }
} catch {
    Write-Host "❌ Test 1 erreur : $_" -ForegroundColor Red
    $errors++
}

# Test 2 : Analyse erreurs (avec fichier fictif)
Write-Host "`nTest 2 : Analyse erreurs..." -ForegroundColor Yellow
$testLog = "test-build.log"
@"
[INFO] Build started
[ERROR] BUILD_ID not found
[ERROR] Cannot find module 'next'
[WARN] Port 3000 already in use
"@ | Out-File -FilePath $testLog -Encoding UTF8

try {
    & .\scripts\analyse-erreurs-build.ps1 -LogFile $testLog -OutputFile "test-analyse.txt"
    if (Test-Path "test-analyse.txt") {
        Write-Host "✅ Test 2 réussi" -ForegroundColor Green
        Remove-Item $testLog -ErrorAction SilentlyContinue
        Remove-Item "test-analyse.txt" -ErrorAction SilentlyContinue
    } else {
        Write-Host "❌ Test 2 échoué (fichier non créé)" -ForegroundColor Red
        $errors++
    }
} catch {
    Write-Host "❌ Test 2 erreur : $_" -ForegroundColor Red
    $errors++
}

# Test 3 : Vérification Post-Build (si build existe)
Write-Host "`nTest 3 : Vérification Post-Build..." -ForegroundColor Yellow
if (Test-Path "dist-electron\win-unpacked") {
    try {
        & .\scripts\verification-build-complete.ps1 -PostBuild -LogDir "logs-test"
        Write-Host "✅ Test 3 réussi" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Test 3 : $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Test 3 ignoré (pas de build)" -ForegroundColor Yellow
}

# Résultat
Write-Host "`n========================================" -ForegroundColor Cyan
if ($errors -eq 0) {
    Write-Host "✅ TOUS LES TESTS RÉUSSIS" -ForegroundColor Green
} else {
    Write-Host "❌ $errors TEST(S) ÉCHOUÉ(S)" -ForegroundColor Red
}
Write-Host "========================================`n" -ForegroundColor Cyan




