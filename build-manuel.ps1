# Build manuel pour contourner le blocage
Write-Host "🚀 Début build manuel..." -ForegroundColor Green

# Nettoyer
Remove-Item "dist-electron" -Recurse -Force -ErrorAction SilentlyContinue

# Build avec logs détaillés
Write-Host "📦 Lancement electron-builder avec logs..." -ForegroundColor Yellow
$result = npx electron-builder --config electron-builder.config.yml --publish=never

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build réussi!" -ForegroundColor Green
    
    # Vérifier l'exécutable
    $exePath = "dist-electron\win-unpacked\Atelier Velo+.exe"
    if (Test-Path $exePath) {
        Write-Host "🎯 Exécutable trouvé: $exePath" -ForegroundColor Green
        Get-Item $exePath | Select-Object Name, Length, LastWriteTime
        
        # Lancer avec logs
        Write-Host "🔍 Lancement application avec logs..." -ForegroundColor Yellow
        Start-Process -FilePath $exePath -ArgumentList "--enable-logging --log-level=debug --v=1"
        
    } else {
        Write-Host "❌ Exécutable non trouvé!" -ForegroundColor Red
        Get-ChildItem "dist-electron\win-unpacked" | Format-Table
    }
} else {
    Write-Host "❌ Build échoué avec code: $LASTEXITCODE" -ForegroundColor Red
}
