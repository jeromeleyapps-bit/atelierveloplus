# ============================================================================
# ANALYSE ERREURS BUILD (VERSION CORRIGÉE)
# ============================================================================
# Objectif : Analyser les logs de build et classer les erreurs
# ============================================================================

param(
    [string]$LogFile = $null
)

$ErrorActionPreference = "Continue"

# Si pas de fichier spécifié, prendre le plus récent
if (-not $LogFile) {
    $latestLog = Get-ChildItem -Path . -Filter "build-complet-*.log" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($latestLog) {
        $LogFile = $latestLog.FullName
    } else {
        Write-Host "Aucun log de build trouve" -ForegroundColor Red
        exit 1
    }
}

if (-not (Test-Path $LogFile)) {
    Write-Host "Fichier log introuvable: $LogFile" -ForegroundColor Red
    exit 1
}

Write-Host "Analyse du fichier: $LogFile" -ForegroundColor Cyan
Write-Host ""

$content = Get-Content $LogFile -Raw
$errors = @()
$criticalErrors = @()

# Patterns d'erreurs
$errorPatterns = @(
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
    try {
        $matches = [regex]::Matches($content, $pattern.Pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
        if ($matches.Count -gt 0) {
            $errors += @{
                Type = $pattern.Type
                Count = $matches.Count
                Examples = $matches | Select-Object -First 3 | ForEach-Object { $_.Value }
            }
        }
    } catch {
        # Ignorer erreurs regex
    }
}

# Erreurs critiques spécifiques
$criticalPatterns = @(
    "BUILD_ID.*ENOENT",
    "Cannot spawn.*ENAMETOOLONG",
    "Module not found.*next",
    "Module not found.*prisma",
    "electron-builder.*failed",
    "Build.*failed"
)

foreach ($pattern in $criticalPatterns) {
    try {
        $matches = [regex]::Matches($content, $pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
        if ($matches.Count -gt 0) {
            $criticalErrors += @{
                Pattern = $pattern
                Count = $matches.Count
            }
        }
    } catch {
        # Ignorer erreurs regex
    }
}

# Générer rapport
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "ANALYSE ERREURS BUILD" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Fichier analyse : $LogFile" -ForegroundColor Gray
Write-Host "Date : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host ""

if ($errors.Count -eq 0 -and $criticalErrors.Count -eq 0) {
    Write-Host "Aucune erreur detectee" -ForegroundColor Green
    exit 0
}

Write-Host "ERREURS DETECTEES :" -ForegroundColor Yellow
Write-Host ""

foreach ($error in $errors) {
    Write-Host "[$($error.Type)] : $($error.Count) occurrence(s)" -ForegroundColor Yellow
    foreach ($example in $error.Examples) {
        Write-Host "  - $example" -ForegroundColor Gray
    }
    Write-Host ""
}

if ($criticalErrors.Count -gt 0) {
    Write-Host "ERREURS CRITIQUES :" -ForegroundColor Red
    Write-Host ""
    foreach ($error in $criticalErrors) {
        Write-Host "  - $($error.Pattern) : $($error.Count) occurrence(s)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan




