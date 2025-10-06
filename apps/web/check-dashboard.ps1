# Script pour vérifier les widgets du dashboard
Write-Host "=== Vérification Widgets Dashboard ===" -ForegroundColor Cyan
Write-Host ""

$psqlPath = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
$sqlFile = "VERIFICATION_WIDGETS_DASHBOARD.sql"

if (-not (Test-Path $sqlFile)) {
    Write-Host "ERREUR: Fichier $sqlFile non trouvé" -ForegroundColor Red
    exit 1
}

Write-Host "Exécution des requêtes de vérification..." -ForegroundColor Yellow
Write-Host ""

& $psqlPath -U postgres -d atelier_velo -f $sqlFile

Write-Host ""
Write-Host "=== Instructions ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Comparez les chiffres ci-dessus avec votre dashboard" -ForegroundColor White
Write-Host "2. Ouvrez http://localhost:3000/dashboard" -ForegroundColor White
Write-Host "3. Vérifiez que les widgets affichent les mêmes nombres" -ForegroundColor White
Write-Host ""
Write-Host "Si les chiffres ne correspondent pas:" -ForegroundColor Yellow
Write-Host "- Invalidez le cache: localStorage.removeItem('dashboard-stats')" -ForegroundColor Gray
Write-Host "- Rafraîchissez la page (F5)" -ForegroundColor Gray
Write-Host ""

Write-Host "Appuyez sur une touche pour continuer..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
