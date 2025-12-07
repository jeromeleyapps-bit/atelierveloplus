# ============================================================================
# SCRIPT DE VÉRIFICATION COMPLÈTE BUILD + LANCEMENT
# ============================================================================
# Objectif : Capturer TOUTES les erreurs et informations critiques
# Usage : .\scripts\verification-build-complete.ps1
# ============================================================================

param(
    [switch]$PreBuild,
    [switch]$PostBuild,
    [switch]$PreLaunch,
    [switch]$PostLaunch,
    [string]$LogDir = "logs-verification"
)

$ErrorActionPreference = "Continue"
$ProgressPreference = "SilentlyContinue"

# Créer dossier logs
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logFile = Join-Path $LogDir "verification-$timestamp.log"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    Add-Content -Path $logFile -Value $logMessage
    Write-Host $logMessage -ForegroundColor $(switch ($Level) {
        "ERROR" { "Red" }
        "WARN" { "Yellow" }
        "SUCCESS" { "Green" }
        default { "White" }
    })
}

function Test-FileExists {
    param([string]$Path, [string]$Description)
    if (Test-Path $Path) {
        $file = Get-Item $Path
        Write-Log "[OK] $Description : $Path ($([math]::Round($file.Length/1KB, 2)) KB)" "SUCCESS"
        return $true
    } else {
        Write-Log "[ERROR] $Description MANQUANT : $Path" "ERROR"
        return $false
    }
}

function Test-DirectoryExists {
    param([string]$Path, [string]$Description)
    if (Test-Path $Path) {
        $count = (Get-ChildItem $Path -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
        Write-Log "[OK] $Description : $Path ($count fichiers)" "SUCCESS"
        return $true
    } else {
        Write-Log "[ERROR] $Description MANQUANT : $Path" "ERROR"
        return $false
    }
}

function Get-FileHash {
    param([string]$Path)
    if (Test-Path $Path) {
        try {
            $hash = Get-FileHash -Path $Path -Algorithm SHA256
            return $hash.Hash
        } catch {
            return "ERROR"
        }
    }
    return "MISSING"
}

# ============================================================================
# VÉRIFICATIONS PRE-BUILD
# ============================================================================
if ($PreBuild) {
    Write-Log "========================================" "INFO"
    Write-Log "VERIFICATIONS PRE-BUILD" "INFO"
    Write-Log "========================================" "INFO"
    
    $preBuildErrors = 0
    
    # 1. Fichiers sources critiques
    Write-Log "`n1. Verification fichiers sources..." "INFO"
    $criticalFiles = @(
        @{Path="package.json"; Desc="Package.json"},
        @{Path="next.config.js"; Desc="Next.js config"},
        @{Path="electron-builder.config.yml"; Desc="Electron builder config"},
        @{Path="electron/main.js"; Desc="Electron main process"},
        @{Path="resources/icon.ico"; Desc="Icone application"},
        @{Path="prepare-build-optimized.js"; Desc="Script prebuild"}
    )
    
    foreach ($file in $criticalFiles) {
        if (-not (Test-FileExists $file.Path $file.Desc)) {
            $preBuildErrors++
        }
    }
    
    # 2. Dossiers sources
    Write-Log "`n2. Verification dossiers sources..." "INFO"
    $criticalDirs = @(
        @{Path="src"; Desc="Source code"},
        @{Path="electron"; Desc="Electron code"},
        @{Path="public"; Desc="Public assets"},
        @{Path="prisma"; Desc="Prisma schema"}
    )
    
    foreach ($dir in $criticalDirs) {
        if (-not (Test-DirectoryExists $dir.Path $dir.Desc)) {
            $preBuildErrors++
        }
    }
    
    # 3. Dépendances Node.js
    Write-Log "`n3. Verification dependances..." "INFO"
    if (Test-Path "node_modules") {
        $moduleCount = (Get-ChildItem "node_modules" -Directory -ErrorAction SilentlyContinue | Measure-Object).Count
        Write-Log "[OK] node_modules present ($moduleCount modules)" "SUCCESS"
        
        # Vérifier modules critiques
        $criticalModules = @("next", "react", "electron", "@prisma/client", "electron-builder")
        foreach ($module in $criticalModules) {
            $modulePath = "node_modules\$module"
            if (Test-Path $modulePath) {
                Write-Log "[OK] Module $module present" "SUCCESS"
            } else {
                Write-Log "[ERROR] Module $module MANQUANT" "ERROR"
                $preBuildErrors++
            }
        }
    } else {
        Write-Log "[ERROR] node_modules MANQUANT" "ERROR"
        $preBuildErrors++
    }
    
    # 4. Variables d'environnement
    Write-Log "`n4. Verification variables environnement..." "INFO"
    $requiredEnvVars = @("NODE_ENV")
    foreach ($var in $requiredEnvVars) {
        $envValue = (Get-Item "Env:$var" -ErrorAction SilentlyContinue).Value
        if ($envValue) {
            Write-Log "[OK] $var = $envValue" "SUCCESS"
        } else {
            Write-Log "[WARN] $var non definie" "WARN"
        }
    }
    
    # 5. Espace disque
    Write-Log "`n5. Verification espace disque..." "INFO"
    $drive = (Get-Location).Drive.Name
    $disk = Get-PSDrive $drive
    $freeGB = [math]::Round($disk.Free / 1GB, 2)
    if ($freeGB -gt 5) {
        Write-Log "[OK] Espace disque disponible : $freeGB GB" "SUCCESS"
    } else {
        Write-Log "[WARN] Espace disque faible : $freeGB GB" "WARN"
    }
    
    Write-Log "`n========================================" "INFO"
    Write-Log "RESULTAT PRE-BUILD : $preBuildErrors erreur(s)" $(if($preBuildErrors -eq 0){"SUCCESS"}else{"ERROR"})
    Write-Log "========================================`n" "INFO"
    
    if ($preBuildErrors -gt 0) {
        exit 1
    } else {
        exit 0
    }
}

# ============================================================================
# VÉRIFICATIONS POST-BUILD
# ============================================================================
if ($PostBuild) {
    Write-Log "========================================" "INFO"
    Write-Log "VERIFICATIONS POST-BUILD" "INFO"
    Write-Log "========================================" "INFO"
    
    $postBuildErrors = 0
    
    # 1. Build Next.js
    Write-Log "`n1. Verification build Next.js..." "INFO"
    if (Test-Path ".next") {
        $nextFiles = (Get-ChildItem ".next" -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
        Write-Log "[OK] .next/ present ($nextFiles fichiers)" "SUCCESS"
        
        # Vérifier BUILD_ID
        if (Test-Path ".next\BUILD_ID") {
            $buildId = Get-Content ".next\BUILD_ID" -Raw
            Write-Log "[OK] BUILD_ID present : $($buildId.Trim())" "SUCCESS"
        } else {
            Write-Log "[ERROR] BUILD_ID MANQUANT" "ERROR"
            $postBuildErrors++
        }
        
        # Vérifier .next/server
        if (Test-Path ".next\server") {
            $serverFiles = (Get-ChildItem ".next\server" -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
            Write-Log "[OK] .next/server present ($serverFiles fichiers)" "SUCCESS"
            if ($serverFiles -lt 300) {
                Write-Log "[WARN] Nombre de fichiers serveur suspect ($serverFiles < 300)" "WARN"
            }
        } else {
            Write-Log "[ERROR] .next/server MANQUANT" "ERROR"
            $postBuildErrors++
        }
        
        # Vérifier .next/static
        if (Test-Path ".next\static") {
            $staticFiles = (Get-ChildItem ".next\static" -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
            Write-Log "[OK] .next/static present ($staticFiles fichiers)" "SUCCESS"
        } else {
            Write-Log "[WARN] .next/static MANQUANT (peut etre normal)" "WARN"
        }
    } else {
        Write-Log "[ERROR] .next/ MANQUANT - Build Next.js echoue" "ERROR"
        $postBuildErrors++
    }
    
    # 2. Electron resources
    Write-Log "`n2. Verification electron-resources..." "INFO"
    if (Test-Path "electron-resources\web") {
        Write-Log "[OK] electron-resources/web present" "SUCCESS"
        
        # Vérifier structure
        $requiredResources = @(
            @{Path="electron-resources\web\.next"; Desc=".next copie"},
            @{Path="electron-resources\web\.next\BUILD_ID"; Desc="BUILD_ID copie"},
            @{Path="electron-resources\web\.next\server"; Desc=".next/server copie"},
            @{Path="electron-resources\web\npm_modules"; Desc="npm_modules copie"},
            @{Path="electron-resources\web\server.js"; Desc="server.js"},
            @{Path="electron-resources\web\public"; Desc="public copie"}
        )
        
        foreach ($resource in $requiredResources) {
            if (-not (Test-Path $resource.Path)) {
                Write-Log "[ERROR] $($resource.Desc) MANQUANT : $($resource.Path)" "ERROR"
                $postBuildErrors++
            } else {
                Write-Log "[OK] $($resource.Desc) present" "SUCCESS"
            }
        }
        
        # Vérifier taille npm_modules
        if (Test-Path "electron-resources\web\npm_modules") {
            $npmCount = (Get-ChildItem "electron-resources\web\npm_modules" -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count
            Write-Log "[OK] npm_modules : $npmCount fichiers" "SUCCESS"
            if ($npmCount -lt 1000) {
                Write-Log "[WARN] Nombre de fichiers npm_modules suspect ($npmCount < 1000)" "WARN"
            }
        }
    } else {
        Write-Log "[ERROR] electron-resources/web MANQUANT - Prebuild echoue" "ERROR"
        $postBuildErrors++
    }
    
    # 3. Build Electron
    Write-Log "`n3. Verification build Electron..." "INFO"
    if (Test-Path "dist-electron\win-unpacked") {
        Write-Log "[OK] dist-electron/win-unpacked present" "SUCCESS"
        
        # Vérifier exécutable
        $exePath = "dist-electron\win-unpacked\Atelier Velo+.exe"
        if (Test-Path $exePath) {
            $exe = Get-Item $exePath
            $exeSizeMB = [math]::Round($exe.Length / 1MB, 2)
            Write-Log "[OK] Executable present : $exeSizeMB MB" "SUCCESS"
            
            if ($exeSizeMB -lt 50) {
                Write-Log "[WARN] Taille executable suspecte ($exeSizeMB MB < 50 MB)" "WARN"
            }
            
            # Hash pour détecter changements
            $exeHash = Get-FileHash $exePath
            Write-Log "[INFO] Hash executable : $($exeHash.Hash.Substring(0, 16))..." "INFO"
        } else {
            Write-Log "[ERROR] Executable MANQUANT" "ERROR"
            $postBuildErrors++
        }
        
        # Vérifier structure ressources
        $requiredBuildFiles = @(
            @{Path="dist-electron\win-unpacked\resources\web\.next"; Desc=".next dans build"},
            @{Path="dist-electron\win-unpacked\resources\web\.next\BUILD_ID"; Desc="BUILD_ID dans build"},
            @{Path="dist-electron\win-unpacked\resources\web\.next\server"; Desc=".next/server dans build"},
            @{Path="dist-electron\win-unpacked\resources\web\npm_modules"; Desc="npm_modules dans build"},
            @{Path="dist-electron\win-unpacked\resources\web\server.js"; Desc="server.js dans build"}
        )
        
        foreach ($file in $requiredBuildFiles) {
            if (-not (Test-Path $file.Path)) {
                Write-Log "[ERROR] $($file.Desc) MANQUANT : $($file.Path)" "ERROR"
                $postBuildErrors++
            } else {
                Write-Log "[OK] $($file.Desc) present" "SUCCESS"
            }
        }
    } else {
        Write-Log "[ERROR] dist-electron/win-unpacked MANQUANT - Build Electron echoue" "ERROR"
        $postBuildErrors++
    }
    
    # 4. Vérifier icône
    Write-Log "`n4. Verification icone..." "INFO"
    if (Test-Path "resources\icon.ico") {
        $icon = Get-Item "resources\icon.ico"
        $iconSizeKB = [math]::Round($icon.Length / 1KB, 2)
        Write-Log "[OK] Icone source presente : $iconSizeKB KB" "SUCCESS"
        
        # Note: L'intégration dans l'exe ne peut pas être vérifiée facilement
        Write-Log "[INFO] Integration icone dans exe : A verifier visuellement" "INFO"
    } else {
        Write-Log "[ERROR] Icone source MANQUANTE" "ERROR"
        $postBuildErrors++
    }
    
    Write-Log "`n========================================" "INFO"
    Write-Log "RESULTAT POST-BUILD : $postBuildErrors erreur(s)" $(if($postBuildErrors -eq 0){"SUCCESS"}else{"ERROR"})
    Write-Log "========================================`n" "INFO"
}

# ============================================================================
# VÉRIFICATIONS PRE-LANCEMENT
# ============================================================================
if ($PreLaunch) {
    Write-Log "========================================" "INFO"
    Write-Log "VERIFICATIONS PRE-LANCEMENT" "INFO"
    Write-Log "========================================" "INFO"
    
    $preLaunchErrors = 0
    
    # 1. Vérifier exécutable
    $exePath = "dist-electron\win-unpacked\Atelier Velo+.exe"
    if (-not (Test-Path $exePath)) {
        Write-Log "[ERROR] Executable introuvable : $exePath" "ERROR"
        $preLaunchErrors++
        exit 1
    }
    
    # 2. Vérifier processus existants
    Write-Log "`n1. Verification processus existants..." "INFO"
    $existingProcesses = Get-Process -Name "Atelier Velo+" -ErrorAction SilentlyContinue
    if ($existingProcesses) {
        Write-Log "[WARN] Processus existants detectes : $($existingProcesses.Count)" "WARN"
        foreach ($proc in $existingProcesses) {
            Write-Log "   PID: $($proc.Id) - Demarrage: $($proc.StartTime)" "INFO"
        }
    } else {
        Write-Log "[OK] Aucun processus existant" "SUCCESS"
    }
    
    # 3. Vérifier port 3000
    Write-Log "`n2. Verification port 3000..." "INFO"
    $port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
    if ($port3000) {
        Write-Log "[WARN] Port 3000 deja utilise" "WARN"
        Write-Log "   PID: $($port3000.OwningProcess)" "INFO"
    } else {
        Write-Log "[OK] Port 3000 disponible" "SUCCESS"
    }
    
    # 4. Vérifier fichiers critiques
    Write-Log "`n3. Verification fichiers critiques..." "INFO"
    $criticalLaunchFiles = @(
        @{Path="dist-electron\win-unpacked\resources\web\.next\BUILD_ID"; Desc="BUILD_ID"},
        @{Path="dist-electron\win-unpacked\resources\web\.next\server"; Desc=".next/server"},
        @{Path="dist-electron\win-unpacked\resources\web\npm_modules\next"; Desc="Next.js"},
        @{Path="dist-electron\win-unpacked\resources\web\npm_modules\@prisma\client"; Desc="Prisma client"},
        @{Path="dist-electron\win-unpacked\resources\web\server.js"; Desc="server.js"}
    )
    
    foreach ($file in $criticalLaunchFiles) {
        if (-not (Test-Path $file.Path)) {
            Write-Log "[ERROR] $($file.Desc) MANQUANT : $($file.Path)" "ERROR"
            $preLaunchErrors++
        } else {
            Write-Log "[OK] $($file.Desc) present" "SUCCESS"
        }
    }
    
    Write-Log "`n========================================" "INFO"
    Write-Log "RESULTAT PRE-LANCEMENT : $preLaunchErrors erreur(s)" $(if($preLaunchErrors -eq 0){"SUCCESS"}else{"ERROR"})
    Write-Log "========================================`n" "INFO"
    
    if ($preLaunchErrors -gt 0) {
        exit 1
    } else {
        exit 0
    }
}

# ============================================================================
# VÉRIFICATIONS POST-LANCEMENT
# ============================================================================
if ($PostLaunch) {
    Write-Log "========================================" "INFO"
    Write-Log "VERIFICATIONS POST-LANCEMENT" "INFO"
    Write-Log "========================================" "INFO"
    
    Start-Sleep -Seconds 5  # Attendre démarrage
    
    # 1. Vérifier processus
    Write-Log "`n1. Verification processus..." "INFO"
    $processes = Get-Process -Name "Atelier Velo+" -ErrorAction SilentlyContinue
    if ($processes) {
        Write-Log "[OK] Processus detecte : $($processes.Count)" "SUCCESS"
        foreach ($proc in $processes) {
            Write-Log "   PID: $($proc.Id) - CPU: $($proc.CPU)s - Memoire: $([math]::Round($proc.WS/1MB, 2)) MB" "INFO"
        }
    } else {
        Write-Log "[ERROR] Processus non detecte - Application crash" "ERROR"
    }
    
    # 2. Vérifier port 3000
    Write-Log "`n2. Verification serveur Next.js..." "INFO"
    $port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
    if ($port3000) {
        Write-Log "[OK] Port 3000 actif - Serveur Next.js demarre" "SUCCESS"
        Write-Log "   PID: $($port3000.OwningProcess)" "INFO"
    } else {
        Write-Log "[ERROR] Port 3000 inactif - Serveur Next.js non demarre" "ERROR"
    }
    
    # 3. Vérifier logs Electron
    Write-Log "`n3. Analyse logs Electron..." "INFO"
    $logDir = "$env:APPDATA\Atelier Velo+\logs"
    if (Test-Path $logDir) {
        $latestLog = Get-ChildItem "$logDir\*.log" -ErrorAction SilentlyContinue | 
            Sort-Object LastWriteTime -Descending | Select-Object -First 1
        
        if ($latestLog) {
            Write-Log "[OK] Log trouve : $($latestLog.Name)" "SUCCESS"
            
            # Analyser erreurs
            $logContent = Get-Content $latestLog.FullName -Tail 50
            $errors = $logContent | Select-String -Pattern "error|Error|ERROR|fail|Fail|FAIL|exception|Exception" -CaseSensitive:$false
            
            if ($errors) {
                Write-Log "[WARN] Erreurs detectees dans logs :" "WARN"
                $errors | Select-Object -First 10 | ForEach-Object {
                    Write-Log "   $_" "WARN"
                }
            } else {
                Write-Log "[OK] Aucune erreur dans les dernieres 50 lignes" "SUCCESS"
            }
            
            # Vérifier démarrage serveur
            $serverReady = $logContent | Select-String -Pattern "Ready|ready|Server started|serveur.*demarre" -CaseSensitive:$false
            if ($serverReady) {
                Write-Log "[OK] Serveur Next.js demarre (detecte dans logs)" "SUCCESS"
            } else {
                Write-Log "[WARN] Serveur Next.js non detecte dans logs" "WARN"
            }
        } else {
            Write-Log "[WARN] Aucun log trouve" "WARN"
        }
    } else {
        Write-Log "[WARN] Dossier logs non trouve : $logDir" "WARN"
    }
    
    # 4. Test HTTP
    Write-Log "`n4. Test connexion HTTP..." "INFO"
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:3000" -TimeoutSec 5 -ErrorAction Stop
        Write-Log "[OK] Serveur HTTP repond : Status $($response.StatusCode)" "SUCCESS"
    } catch {
        Write-Log "[ERROR] Serveur HTTP ne repond pas : $($_.Exception.Message)" "ERROR"
    }
    
    Write-Log "`n========================================" "INFO"
    Write-Log "VERIFICATIONS POST-LANCEMENT TERMINEES" "INFO"
    Write-Log "========================================`n" "INFO"
}

Write-Log "`n[INFO] Log complet : $logFile" "INFO"