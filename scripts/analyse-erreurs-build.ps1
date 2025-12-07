# ============================================================================
# ANALYSE ERREURS BUILD
# ============================================================================
# Objectif : Analyser les logs de build et identifier les erreurs
# Usage : .\scripts\analyse-erreurs-build.ps1 -LogFile "build.log"
# ============================================================================

param(
    [string]$LogFile,
    [string]$OutputFile = "analyse-erreurs-build.txt"
)

if (-not $LogFile -or -not (Test-Path $LogFile)) {
    Write-Host "❌ Fichier log introuvable : $LogFile" -ForegroundColor Red
    exit 1
}

Write-Host "`n🔍 Analyse des erreurs de build..." -ForegroundColor Cyan
Write-Host "Fichier : $LogFile`n" -ForegroundColor Gray

$content = Get-Content $LogFile -Raw
$errors = @()
$warnings = @()
$criticalErrors = @()

# Patterns d'erreurs
$errorPatterns = @(
    @{Pattern="error|Error|ERROR"; Type="Général"},
    @{Pattern="fail|Fail|FAIL|failed|Failed"; Type="Échec"},
    @{Pattern="ENOENT|no such file|file not found"; Type="Fichier manquant"},
    @{Pattern="ENAMETOOLONG|path too long"; Type="Chemin trop long"},
    @{Pattern="Cannot find module|Module not found"; Type="Module manquant"},
    @{Pattern="Cannot spawn|spawn.*failed"; Type="Processus"},
    @{Pattern="BUILD_ID.*not found|BUILD_ID.*missing"; Type="BUILD_ID"},
    @{Pattern="Prisma.*error|prisma.*client"; Type="Prisma"},
    @{Pattern="electron-builder.*error"; Type="Electron Builder"},
    @{Pattern="npm.*error|npm ERR"; Type="NPM"}
)

# Analyser chaque pattern
foreach ($pattern in $errorPatterns) {
    $matches = [regex]::Matches($content, $pattern.Pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    if ($matches.Count -gt 0) {
        $errors += @{
            Type = $pattern.Type
            Count = $matches.Count
            Examples = $matches | Select-Object -First 3 | ForEach-Object { $_.Value }
        }
    }
}

# Erreurs critiques spécifiques
$criticalPatterns = @(
    "BUILD_ID.*ENOENT",
    "Cannot spawn.*ENAMETOOLONG",
    "Module not found.*next",
    "Module not found.*@prisma",
    "electron-builder.*failed",
    "Build.*failed"
)

foreach ($pattern in $criticalPatterns) {
    $matches = [regex]::Matches($content, $pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    if ($matches.Count -gt 0) {
        $criticalErrors += @{
            Pattern = $pattern
            Count = $matches.Count
            Context = ($content | Select-String -Pattern $pattern -Context 2 | Select-Object -First 3)
        }
    }
}

# Générer rapport
$report = @"
========================================
ANALYSE ERREURS BUILD
========================================
Fichier analysé : $LogFile
Date : $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

RÉSUMÉ
----------------------------------------
Erreurs totales : $($errors.Count) types
Erreurs critiques : $($criticalErrors.Count)

DÉTAIL PAR TYPE
----------------------------------------
"@

foreach ($error in $errors) {
    $report += "`n[$($error.Type)] : $($error.Count) occurrence(s)`n"
    foreach ($example in $error.Examples) {
        $report += "  - $example`n"
    }
}

if ($criticalErrors.Count -gt 0) {
    $report += "`nERREURS CRITIQUES`n"
    $report += "----------------------------------------`n"
    foreach ($critical in $criticalErrors) {
        $report += "`n[$($critical.Pattern)] : $($critical.Count) occurrence(s)`n"
        $report += "Contexte :`n"
        $report += $critical.Context | Out-String
    }
}

# Recommandations
$report += "`nRECOMMANDATIONS`n"
$report += "----------------------------------------`n"

if ($errors | Where-Object { $_.Type -eq "BUILD_ID" }) {
    $report += "❌ BUILD_ID manquant : Créer .next/BUILD_ID manuellement`n"
}

if ($errors | Where-Object { $_.Type -eq "Chemin trop long" }) {
    $report += "❌ ENAMETOOLONG : Utiliser build portable ou réduire fichiers`n"
}

if ($errors | Where-Object { $_.Type -eq "Module manquant" }) {
    $report += "❌ Modules manquants : Vérifier npm_modules copié correctement`n"
}

if ($errors | Where-Object { $_.Type -eq "Prisma" }) {
    $report += "❌ Erreur Prisma : Vérifier symlink node_modules → npm_modules`n"
}

$report | Out-File -FilePath $OutputFile -Encoding UTF8

Write-Host $report
Write-Host "`n📄 Rapport sauvegardé : $OutputFile" -ForegroundColor Green
