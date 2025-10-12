# Script de Test - Lancement Atelier Vélo+ avec Capture de Logs
# Usage: .\test-exe-with-logs.ps1 [chemin-vers-exe]

param(
    [string]$ExePath = ""
)

# Configuration
$logDir = "$env:TEMP\atelier-velo-debug"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$debugLog = "$logDir\debug-$timestamp.log"
$nextServerLog = "$env:APPDATA\atelier-velo-desktop\logs\next-server.log"

# Créer le dossier de logs
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Atelier Vélo+ - Test avec Logs       " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Déterminer le chemin de l'exe
if ($ExePath -eq "") {
    # Chercher l'exe dans les emplacements courants
    $possiblePaths = @(
        ".\apps\desktop\dist\win-unpacked\Atelier Vélo+.exe",
        ".\dist\win-unpacked\Atelier Vélo+.exe",
        "C:\AtelierVelo\Atelier Vélo+.exe"
    )
    
    foreach ($path in $possiblePaths) {
        if (Test-Path $path) {
            $ExePath = (Resolve-Path $path).Path
            break
        }
    }
    
    if ($ExePath -eq "") {
        Write-Host "❌ Impossible de trouver l'exe automatiquement." -ForegroundColor Red
        Write-Host ""
        Write-Host "Veuillez spécifier le chemin :" -ForegroundColor Yellow
        Write-Host "  .\test-exe-with-logs.ps1 'C:\chemin\vers\Atelier Vélo+.exe'"
        exit 1
    }
}

# Vérifier que l'exe existe
if (-not (Test-Path $ExePath)) {
    Write-Host "❌ Fichier introuvable: $ExePath" -ForegroundColor Red
    exit 1
}

Write-Host "📍 Exe à tester : $ExePath" -ForegroundColor Green
Write-Host "📝 Logs sauvegardés dans : $debugLog" -ForegroundColor Green
Write-Host ""

# Nettoyer le log next-server.log précédent
if (Test-Path $nextServerLog) {
    Write-Host "🧹 Nettoyage de l'ancien log next-server..." -ForegroundColor Yellow
    Remove-Item $nextServerLog -Force -ErrorAction SilentlyContinue
}

# Fonction pour capturer les logs en temps réel
function Monitor-Logs {
    param([string]$Process)
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Logs en temps réel                    " -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Attendre que le fichier log soit créé
    $maxWait = 30
    $waited = 0
    while (-not (Test-Path $nextServerLog) -and $waited -lt $maxWait) {
        Write-Host "⏳ Attente de la création du log... ($waited/$maxWait secondes)" -ForegroundColor Yellow
        Start-Sleep -Seconds 1
        $waited++
    }
    
    if (-not (Test-Path $nextServerLog)) {
        Write-Host "⚠️  Le fichier next-server.log n'a pas été créé." -ForegroundColor Red
        Write-Host "    L'application n'a peut-être pas démarré correctement." -ForegroundColor Red
        return
    }
    
    Write-Host "✅ Fichier log détecté : $nextServerLog" -ForegroundColor Green
    Write-Host ""
    Write-Host "--- Contenu du log next-server.log ---" -ForegroundColor Cyan
    
    # Afficher le contenu initial
    Get-Content $nextServerLog | ForEach-Object {
        $line = $_
        Write-Host $line
        Add-Content -Path $debugLog -Value $line
    }
    
    # Surveiller les nouveaux ajouts
    Get-Content $nextServerLog -Wait -Tail 0 | ForEach-Object {
        $line = $_
        
        # Colorier selon le type de message
        if ($line -match "\[ERROR\]|\[STDERR\]|Error:|error:") {
            Write-Host $line -ForegroundColor Red
        } elseif ($line -match "\[WARN\]|Warning:|warning:") {
            Write-Host $line -ForegroundColor Yellow
        } elseif ($line -match "Ready on|started|listening") {
            Write-Host $line -ForegroundColor Green
        } else {
            Write-Host $line
        }
        
        Add-Content -Path $debugLog -Value $line
    }
}

# Informations système
Write-Host "--- Informations Système ---" -ForegroundColor Cyan
$nodeVersion = & node --version 2>$null
$npmVersion = & npm --version 2>$null
Write-Host "Node.js    : $nodeVersion"
Write-Host "npm        : $npmVersion"
Write-Host "Windows    : $([Environment]::OSVersion.Version)"
Write-Host "PowerShell : $($PSVersionTable.PSVersion)"
Write-Host ""

# Sauvegarder les infos système dans le log
@"
========================================
Atelier Vélo+ - Debug Session
========================================
Date: $(Get-Date)
Exe: $ExePath
Node.js: $nodeVersion
npm: $npmVersion
Windows: $([Environment]::OSVersion.Version)
PowerShell: $($PSVersionTable.PSVersion)
========================================

"@ | Out-File -FilePath $debugLog -Encoding UTF8

# Lancer l'exe
Write-Host "🚀 Lancement de l'application..." -ForegroundColor Green
Write-Host "   Appuyez sur Ctrl+C pour arrêter le monitoring" -ForegroundColor Yellow
Write-Host ""

try {
    # Démarrer l'exe en arrière-plan
    $process = Start-Process -FilePath $ExePath -PassThru -WindowStyle Normal
    
    Write-Host "✅ Application lancée (PID: $($process.Id))" -ForegroundColor Green
    
    # Surveiller les logs
    Monitor-Logs -Process $process
    
} catch {
    Write-Host ""
    Write-Host "❌ Erreur lors du lancement:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Add-Content -Path $debugLog -Value "ERROR: $($_.Exception.Message)"
} finally {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Fin du monitoring                     " -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📝 Logs complets sauvegardés dans :" -ForegroundColor Green
    Write-Host "   $debugLog" -ForegroundColor White
    Write-Host ""
    Write-Host "📝 Logs next-server.log :" -ForegroundColor Green
    Write-Host "   $nextServerLog" -ForegroundColor White
    Write-Host ""
    
    # Afficher un résumé des erreurs
    if (Test-Path $nextServerLog) {
        $errors = Get-Content $nextServerLog | Select-String -Pattern "Error:|error:|ERROR|STDERR" | Select-Object -Last 10
        if ($errors) {
            Write-Host "⚠️  Erreurs détectées (10 dernières) :" -ForegroundColor Red
            $errors | ForEach-Object { Write-Host "   $_" -ForegroundColor Red }
        } else {
            Write-Host "✅ Aucune erreur détectée dans les logs" -ForegroundColor Green
        }
    }
    
    Write-Host ""
    Write-Host "💡 Pour consulter les logs complets :" -ForegroundColor Cyan
    Write-Host "   Get-Content '$debugLog'" -ForegroundColor White
    Write-Host "   Get-Content '$nextServerLog'" -ForegroundColor White
}
