# ============================================================================
# MONITORING LANCEMENT APPLICATION
# ============================================================================
# Objectif : Surveiller le lancement et capturer toutes les erreurs
# Usage : .\scripts\monitoring-lancement.ps1 -ExePath "dist-electron\win-unpacked\Atelier Velo+.exe"
# ============================================================================

param(
    [string]$ExePath = "dist-electron\win-unpacked\Atelier Velo+.exe",
    [int]$TimeoutSeconds = 60,
    [string]$LogDir = "logs-monitoring"
)

$ErrorActionPreference = "Continue"

# Créer dossier logs
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$monitoringLog = Join-Path $LogDir "monitoring-$timestamp.log"
$errorLog = Join-Path $LogDir "errors-$timestamp.log"

function Write-MonitorLog {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss.fff"
    $logMessage = "[$timestamp] [$Level] $Message"
    Add-Content -Path $monitoringLog -Value $logMessage
    
    if ($Level -eq "ERROR") {
        Add-Content -Path $errorLog -Value $logMessage
    }
    
    Write-Host $logMessage -ForegroundColor $(switch ($Level) {
        "ERROR" { "Red" }
        "WARN" { "Yellow" }
        "SUCCESS" { "Green" }
        default { "White" }
    })
}

Write-MonitorLog "========================================" "INFO"
Write-MonitorLog "MONITORING LANCEMENT APPLICATION" "INFO"
Write-MonitorLog "========================================" "INFO"
Write-MonitorLog "Exécutable : $ExePath" "INFO"
Write-MonitorLog "Timeout : $TimeoutSeconds secondes" "INFO"

# Vérifier exécutable
if (-not (Test-Path $ExePath)) {
    Write-MonitorLog "❌ Exécutable introuvable : $ExePath" "ERROR"
    exit 1
}

# Nettoyer processus existants
Write-MonitorLog "`n1. Nettoyage processus existants..." "INFO"
$existing = Get-Process -Name "Atelier Velo+" -ErrorAction SilentlyContinue
if ($existing) {
    Write-MonitorLog "   Arrêt de $($existing.Count) processus existant(s)" "WARN"
    $existing | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# Vérifier port 3000
Write-MonitorLog "`n2. Vérification port 3000..." "INFO"
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($port3000) {
    Write-MonitorLog "   Port 3000 occupé par PID $($port3000.OwningProcess)" "WARN"
    Stop-Process -Id $port3000.OwningProcess -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# Lancer application
Write-MonitorLog "`n3. Lancement application..." "INFO"
$startTime = Get-Date
$process = Start-Process -FilePath $ExePath -PassThru -WindowStyle Normal

if (-not $process) {
    Write-MonitorLog "❌ Échec lancement application" "ERROR"
    exit 1
}

Write-MonitorLog "✅ Processus lancé : PID $($process.Id)" "SUCCESS"

# Monitoring en temps réel
Write-MonitorLog "`n4. Monitoring en cours..." "INFO"
$elapsed = 0
$serverReady = $false
$windowVisible = $false
$errorsDetected = 0

$logDir = "$env:APPDATA\Atelier Velo+\logs"

while ($elapsed -lt $TimeoutSeconds) {
    Start-Sleep -Seconds 2
    $elapsed += 2
    
    # Vérifier processus
    $currentProcess = Get-Process -Id $process.Id -ErrorAction SilentlyContinue
    if (-not $currentProcess) {
        Write-MonitorLog "❌ Processus terminé après $elapsed secondes" "ERROR"
        break
    }
    
    # Vérifier port 3000
    $portCheck = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
    if ($portCheck -and -not $serverReady) {
        $serverReady = $true
        Write-MonitorLog "✅ Serveur Next.js démarré (port 3000 actif)" "SUCCESS"
    }
    
    # Vérifier logs pour erreurs
    if (Test-Path $logDir) {
        $latestLog = Get-ChildItem "$logDir\*.log" -ErrorAction SilentlyContinue | 
            Sort-Object LastWriteTime -Descending | Select-Object -First 1
        
        if ($latestLog) {
            $logContent = Get-Content $latestLog.FullName -Tail 10 -ErrorAction SilentlyContinue
            $newErrors = $logContent | Select-String -Pattern "error|Error|ERROR|fail|Fail|FAIL|exception|Exception|ENOENT|Cannot|Missing" -CaseSensitive:$false
            
            if ($newErrors) {
                foreach ($error in $newErrors) {
                    if ($error -notmatch "already exists|already running") {
                        Write-MonitorLog "⚠️  Erreur détectée : $($error.Line.Trim())" "WARN"
                        $errorsDetected++
                    }
                }
            }
        }
    }
    
    # Afficher progression
    if ($elapsed % 10 -eq 0) {
        $cpu = if ($currentProcess) { [math]::Round($currentProcess.CPU, 2) } else { 0 }
        $mem = if ($currentProcess) { [math]::Round($currentProcess.WS / 1MB, 2) } else { 0 }
        Write-MonitorLog "   [$elapsed/$TimeoutSeconds] CPU: ${cpu}s | Mémoire: ${mem}MB | Port 3000: $(if($serverReady){'✅'}else{'❌'})" "INFO"
    }
}

# Rapport final
Write-MonitorLog "`n========================================" "INFO"
Write-MonitorLog "RAPPORT FINAL" "INFO"
Write-MonitorLog "========================================" "INFO"

$finalProcess = Get-Process -Id $process.Id -ErrorAction SilentlyContinue
if ($finalProcess) {
    Write-MonitorLog "✅ Application en cours d'exécution" "SUCCESS"
    Write-MonitorLog "   PID: $($finalProcess.Id)" "INFO"
    Write-MonitorLog "   CPU: $([math]::Round($finalProcess.CPU, 2))s" "INFO"
    Write-MonitorLog "   Mémoire: $([math]::Round($finalProcess.WS / 1MB, 2)) MB" "INFO"
} else {
    Write-MonitorLog "❌ Application terminée/crashée" "ERROR"
}

$finalPort = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($finalPort) {
    Write-MonitorLog "✅ Serveur Next.js actif" "SUCCESS"
} else {
    Write-MonitorLog "❌ Serveur Next.js inactif" "ERROR"
}

Write-MonitorLog "   Erreurs détectées : $errorsDetected" $(if($errorsDetected -eq 0){"SUCCESS"}else{"ERROR"})

# Test HTTP final
Write-MonitorLog "`n5. Test HTTP final..." "INFO"
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:3000" -TimeoutSec 5 -ErrorAction Stop
    Write-MonitorLog "✅ Serveur HTTP répond : Status $($response.StatusCode)" "SUCCESS"
} catch {
    Write-MonitorLog "❌ Serveur HTTP ne répond pas : $($_.Exception.Message)" "ERROR"
}

Write-MonitorLog "`n📄 Logs :" "INFO"
Write-MonitorLog "   Monitoring : $monitoringLog" "INFO"
Write-MonitorLog "   Erreurs : $errorLog" "INFO"
Write-MonitorLog "   Electron : $logDir" "INFO"




