# Script de configuration de la base de données PostgreSQL/Supabase
# Usage: .\setup-db.ps1

Write-Host "🔧 Configuration de la base de données Atelier Vélo+" -ForegroundColor Cyan
Write-Host ""

# Vérifier si .env existe
if (-not (Test-Path ".env") -and -not (Test-Path ".env.local")) {
    Write-Host "⚠️  Aucun fichier .env ou .env.local trouvé!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Créez un fichier .env avec votre DATABASE_URL:" -ForegroundColor Yellow
    Write-Host 'DATABASE_URL="postgresql://USER:PASSWORD@HOST:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=1"' -ForegroundColor Gray
    Write-Host ""
    $create = Read-Host "Voulez-vous créer un fichier .env maintenant? (o/n)"
    
    if ($create -eq "o" -or $create -eq "O") {
        $dbUrl = Read-Host "Entrez votre DATABASE_URL Supabase"
        Set-Content -Path ".env" -Value "DATABASE_URL=`"$dbUrl`""
        Write-Host "✅ Fichier .env créé!" -ForegroundColor Green
    } else {
        Write-Host "❌ Configuration annulée. Créez un fichier .env manuellement." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "📦 Étape 1: Génération du client Prisma..." -ForegroundColor Cyan
npx prisma generate

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de la génération du client Prisma" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Client Prisma généré!" -ForegroundColor Green
Write-Host ""

Write-Host "🗄️  Étape 2: Migration de la base de données..." -ForegroundColor Cyan
Write-Host "Choisissez une option:" -ForegroundColor Yellow
Write-Host "  1. migrate deploy (production - applique les migrations existantes)" -ForegroundColor Gray
Write-Host "  2. migrate dev (développement - crée une nouvelle migration si nécessaire)" -ForegroundColor Gray
Write-Host "  3. db push (développement - synchronise le schéma sans migration)" -ForegroundColor Gray
Write-Host "  4. Passer cette étape" -ForegroundColor Gray

$choice = Read-Host "Votre choix (1-4)"

switch ($choice) {
    "1" {
        npx prisma migrate deploy
    }
    "2" {
        npx prisma migrate dev --name init
    }
    "3" {
        npx prisma db push
    }
    "4" {
        Write-Host "⏭️  Migration ignorée" -ForegroundColor Yellow
    }
    default {
        Write-Host "❌ Choix invalide" -ForegroundColor Red
        exit 1
    }
}

if ($LASTEXITCODE -ne 0 -and $choice -ne "4") {
    Write-Host "❌ Erreur lors de la migration" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Conseils:" -ForegroundColor Yellow
    Write-Host "  - Vérifiez que votre DATABASE_URL est correcte" -ForegroundColor Gray
    Write-Host "  - Assurez-vous que votre IP est autorisée dans Supabase" -ForegroundColor Gray
    Write-Host "  - Pour Vercel, utilisez le port 6543 (connection pooling)" -ForegroundColor Gray
    exit 1
}

Write-Host ""
Write-Host "🧪 Étape 3: Test de connexion..." -ForegroundColor Cyan
npx ts-node scripts/check-db.ts

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Le test de connexion a échoué, mais la configuration est terminée" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "🎉 Configuration terminée avec succès!" -ForegroundColor Green
}

Write-Host ""
Write-Host "▶️  Pour démarrer l'application: npm run dev" -ForegroundColor Cyan
