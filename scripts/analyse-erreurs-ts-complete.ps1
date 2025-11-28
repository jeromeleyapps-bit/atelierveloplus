# Script d'analyse complète des erreurs TypeScript
# Analyse méthodique par catégorie pour corrections progressives

Write-Host "🔍 ANALYSE COMPLÈTE DES ERREURS TYPESCRIPT" -ForegroundColor Cyan
Write-Host ""

# Capturer toutes les erreurs
$errors = npm run typecheck 2>&1 | Select-String "error TS"

$totalErrors = ($errors | Measure-Object).Count
Write-Host "📊 Total d'erreurs: $totalErrors" -ForegroundColor Yellow
Write-Host ""

# Analyser par code d'erreur
Write-Host "📋 Répartition par type d'erreur:" -ForegroundColor Cyan
$errors | ForEach-Object {
    if ($_ -match "error TS(\d+)") {
        $matches[1]
    }
} | Group-Object | Sort-Object Count -Descending | Select-Object -First 10 | ForEach-Object {
    Write-Host "  TS$($_.Name): $($_.Count) erreurs"
}
Write-Host ""

# Analyser les erreurs liées au logger
Write-Host "📋 Erreurs liées au logger:" -ForegroundColor Cyan
$loggerErrors = $errors | Where-Object { $_ -match "logger" }
Write-Host "  Total: $($loggerErrors.Count) erreurs"
if ($loggerErrors.Count -gt 0) {
    Write-Host "  Détails (premiers 10):"
    $loggerErrors | Select-Object -First 10 | ForEach-Object {
        if ($_ -match "src/([^:]+)") {
            Write-Host "    - $($matches[1])"
        }
    }
}
Write-Host ""

# Analyser par fichier
Write-Host "📁 Top 10 fichiers avec le plus d'erreurs:" -ForegroundColor Cyan
$errors | ForEach-Object {
    if ($_ -match "src/([^:]+)") {
        $matches[1]
    }
} | Group-Object | Sort-Object Count -Descending | Select-Object -First 10 | ForEach-Object {
    Write-Host "  $($_.Name): $($_.Count) erreurs"
}
Write-Host ""

# Analyser les erreurs TS2345 (Argument type not assignable) - souvent logger
Write-Host "📋 Erreurs TS2345 (Argument type) - Détails:" -ForegroundColor Cyan
$ts2345 = $errors | Where-Object { $_ -match "error TS2345" }
Write-Host "  Total: $($ts2345.Count) erreurs"
if ($ts2345.Count -gt 0) {
    Write-Host "  Premiers exemples:"
    $ts2345 | Select-Object -First 5 | ForEach-Object {
        Write-Host "    $_"
    }
}
Write-Host ""

# Sauvegarder l'analyse dans un fichier
$outputFile = "typecheck-errors-analysis-$(Get-Date -Format 'yyyyMMdd-HHmm').txt"
$errors | Out-File -FilePath $outputFile -Encoding UTF8
Write-Host "✅ Analyse complète sauvegardée dans: $outputFile" -ForegroundColor Green

