# Generateur de secrets aleatoires
# Usage: .\generate-secret.ps1

function Generate-Secret {
    param(
        [int]$Length = 64
    )
    
    $chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    $secret = -join ((1..$Length) | ForEach-Object { $chars[(Get-Random -Maximum $chars.Length)] })
    return $secret
}

Write-Host "Generateur de secrets" -ForegroundColor Cyan
Write-Host ""

$secret1 = Generate-Secret
$secret2 = Generate-Secret

Write-Host "Secret 1 (NEXTAUTH_SECRET):" -ForegroundColor Green
Write-Host $secret1
Write-Host ""

Write-Host "Secret 2 (AUTH_SECRET):" -ForegroundColor Green
Write-Host $secret2
Write-Host ""

Write-Host "Copiez ces secrets dans votre .env" -ForegroundColor Yellow
