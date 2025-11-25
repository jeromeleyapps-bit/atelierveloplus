# Script pour créer une icône .ico à partir du logo

Write-Host "Création de l'icône pour le raccourci..." -ForegroundColor Cyan

# Charger l'image
Add-Type -AssemblyName System.Drawing

$pngPath = "apps\web\public\logo.png"
$icoPath = "atelier-velo-icon.ico"

try {
    # Charger le PNG
    $img = [System.Drawing.Image]::FromFile((Resolve-Path $pngPath))
    
    # Créer un bitmap de 256x256 (taille standard pour icône)
    $bitmap = New-Object System.Drawing.Bitmap(256, 256)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.DrawImage($img, 0, 0, 256, 256)
    
    # Sauvegarder comme ICO
    $icon = [System.Drawing.Icon]::FromHandle($bitmap.GetHicon())
    $fileStream = [System.IO.File]::Create($icoPath)
    $icon.Save($fileStream)
    $fileStream.Close()
    
    # Nettoyer
    $graphics.Dispose()
    $bitmap.Dispose()
    $img.Dispose()
    
    Write-Host "✓ Icône créée : $icoPath" -ForegroundColor Green
    
    # Mettre à jour le raccourci Bureau
    Write-Host ""
    Write-Host "Mise à jour du raccourci Bureau..." -ForegroundColor Yellow
    
    $WshShell = New-Object -ComObject WScript.Shell
    $shortcutPath = "$env:USERPROFILE\Desktop\Atelier Vélo+.lnk"
    
    if (Test-Path $shortcutPath) {
        $Shortcut = $WshShell.CreateShortcut($shortcutPath)
        $Shortcut.IconLocation = (Resolve-Path $icoPath).Path
        $Shortcut.Save()
        Write-Host "✓ Raccourci mis à jour avec la nouvelle icône" -ForegroundColor Green
    } else {
        Write-Host "⚠ Raccourci non trouvé sur le Bureau" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "✗ Erreur : $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Méthode alternative : Utilisation du PNG directement..." -ForegroundColor Yellow
    
    # Plan B : Utiliser le PNG directement (Windows 10+ le supporte)
    $WshShell = New-Object -ComObject WScript.Shell
    $shortcutPath = "$env:USERPROFILE\Desktop\Atelier Vélo+.lnk"
    
    if (Test-Path $shortcutPath) {
        $Shortcut = $WshShell.CreateShortcut($shortcutPath)
        $Shortcut.IconLocation = (Resolve-Path $pngPath).Path + ",0"
        $Shortcut.Save()
        Write-Host "✓ Raccourci mis à jour avec le logo PNG" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Terminé ! Rafraîchissez votre Bureau (F5) pour voir l'icône." -ForegroundColor Cyan
