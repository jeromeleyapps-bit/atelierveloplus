# Script de vérification DNS pour Resend
# Usage: .\check-dns.ps1

$domain = "atelier-velo.fr"  # Change si nécessaire

Write-Host "`n🔍 VERIFICATION DNS RESEND pour $domain`n" -ForegroundColor Cyan
Write-Host "=" * 60

# Vérifier DKIM
Write-Host "`n📧 DKIM (resend._domainkey.$domain):" -ForegroundColor Yellow
try {
    $dkim = Resolve-DnsName -Name "resend._domainkey.$domain" -Type TXT -ErrorAction Stop
    Write-Host "✅ DKIM trouvé:" -ForegroundColor Green
    $dkim | ForEach-Object { Write-Host "   $($_.Strings)" }
} catch {
    Write-Host "❌ DKIM non trouvé" -ForegroundColor Red
}

# Vérifier SPF
Write-Host "`n🛡️ SPF ($domain):" -ForegroundColor Yellow
try {
    $spf = Resolve-DnsName -Name $domain -Type TXT -ErrorAction Stop | Where-Object { $_.Strings -like "*v=spf1*" }
    if ($spf) {
        Write-Host "✅ SPF trouvé:" -ForegroundColor Green
        $spf | ForEach-Object { Write-Host "   $($_.Strings)" }
        
        if ($spf.Strings -like "*include:resend.com*") {
            Write-Host "   ✅ Resend inclus" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️ Resend NON inclus - Ajoute 'include:resend.com'" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ SPF non trouvé" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Erreur lors de la vérification SPF" -ForegroundColor Red
}

# Vérifier DMARC
Write-Host "`n📋 DMARC (_dmarc.$domain):" -ForegroundColor Yellow
try {
    $dmarc = Resolve-DnsName -Name "_dmarc.$domain" -Type TXT -ErrorAction Stop
    Write-Host "✅ DMARC trouvé:" -ForegroundColor Green
    $dmarc | ForEach-Object { Write-Host "   $($_.Strings)" }
} catch {
    Write-Host "❌ DMARC non trouvé" -ForegroundColor Red
}

Write-Host "`n" + ("=" * 60)
Write-Host "`n💡 Note: La propagation DNS peut prendre 5-30 minutes`n" -ForegroundColor Cyan
