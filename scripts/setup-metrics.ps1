<#
.SYNOPSIS
    Configure Supabase pour la surveillance des métriques
.DESCRIPTION
    Ce script configure une base de données Supabase pour stocker les métriques de performance.
    Il crée les tables nécessaires et configure les politiques de sécurité.
.PARAMETER SupabaseUrl
    URL de votre instance Supabase
.PARAMETER ServiceKey
    Clé de service Supabase (avec les droits d'administration)
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$SupabaseUrl,
    
    [Parameter(Mandatory=$true)]
    [string]$ServiceKey
)

# Vérifier si les outils nécessaires sont installés
$requiredTools = @('psql', 'jq')
foreach ($tool in $requiredTools) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
        Write-Error "$tool n'est pas installé. Veuillez l'installer avant de continuer."
        exit 1
    }
}

# Vérifier la connexion à Supabase
$healthCheck = Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/" -Method Get -ErrorAction SilentlyContinue
if (-not $healthCheck) {
    Write-Error "Impossible de se connecter à Supabase. Vérifiez l'URL et votre connexion Internet."
    exit 1
}

# Créer un client Supabase temporaire
$headers = @{
    "apikey" = $ServiceKey
    "Authorization" = "Bearer $ServiceKey"
    "Content-Type" = "application/json"
}

# Vérifier si la table metrics existe déjà
$tables = Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/" -Headers $headers -Method Get
$metricsTableExists = $tables.definitions.PSObject.Properties['metrics'] -ne $null

if ($metricsTableExists) {
    Write-Host "La table 'metrics' existe déjà. Voulez-vous la réinitialiser? (O/N)" -ForegroundColor Yellow
    $response = Read-Host
    
    if ($response -eq 'O' -or $response -eq 'o') {
        Write-Host "Suppression de la table existante..." -ForegroundColor Cyan
        Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/rpc/drop_metrics_table" -Headers $headers -Method Post -Body '{}' | Out-Null
        $metricsTableExists = $false
    } else {
        Write-Host "Configuration annulée par l'utilisateur." -ForegroundColor Yellow
        exit 0
    }
}

# Appliquer la migration SQL
if (-not $metricsTableExists) {
    Write-Host "Création de la table 'metrics'..." -ForegroundColor Cyan
    $sqlPath = Join-Path $PSScriptRoot "..\supabase\migrations\20230927000000_create_metrics_table.sql"
    $sqlContent = Get-Content -Path $sqlPath -Raw
    
    # Exécuter le script SQL via l'API REST
    $body = @{
        query = $sqlContent
    } | ConvertTo-Json
    
    try {
        Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/rpc/execute_sql" -Headers $headers -Method Post -Body $body | Out-Null
        Write-Host "Table 'metrics' créée avec succès!" -ForegroundColor Green
    } catch {
        Write-Error "Erreur lors de la création de la table: $_"
        exit 1
    }
}

# Configurer les variables d'environnement pour le frontend
$envContent = @"
# Configuration Supabase
NEXT_PUBLIC_SUPABASE_URL=$SupabaseUrl
NEXT_PUBLIC_SUPABASE_ANON_KEY=$(Invoke-RestMethod -Uri "$SupabaseUrl/auth/v1/settings" -Headers $headers | Select-Object -ExpandProperty anon_key)
SUPABASE_SERVICE_KEY=$ServiceKey

# Activation des métriques
NEXT_PUBLIC_METRICS_ENABLED=true
"@

# Écrire dans le fichier .env.local
$envPath = Join-Path $PSScriptRoot "..\apps\web\.env.local"
$envContent | Out-File -FilePath $envPath -Encoding utf8

Write-Host ""
Write-Host "Configuration terminée avec succès!" -ForegroundColor Green
Write-Host "Les variables d'environnement ont été enregistrées dans: $envPath"
Write-Host ""
Write-Host "Prochaines étapes:" -ForegroundColor Cyan
Write-Host "1. Redémarrez votre serveur de développement"
Write-Host "2. Accédez au tableau de bord des métriques: http://localhost:3000/admin/metrics"
Write-Host "3. Consultez la documentation dans METRICS.md pour plus d'informations"

# Fonction pour nettoyer en cas d'erreur
trap {
    Write-Error "Une erreur est survenue: $_"
    exit 1
}
