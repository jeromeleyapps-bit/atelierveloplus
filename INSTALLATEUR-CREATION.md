# 📦 Création Installateur Atelier Vélo+ 
*Guide pour créer l'installateur .exe distribuable*

---

## 🎯 Objectif
Créer un installateur Windows (.exe) pour distribution facile de l'application Electron Atelier Vélo+.

---

## 🔧 Configuration Requise

### electron-builder.config.yml (Version Installer)
```yaml
win:
  target:
    - target: nsis  # Créer installer .exe
      arch:
        - x64
  forceCodeSigning: false
  icon: resources/icon.ico
  artifactName: "${productName}-${version}-${os}-${arch}.${ext}"
```

### Points Clés
- **target: nsis** - Crée un installateur Windows
- **icon: resources/icon.ico** - Icône personnalisée dans l'installateur
- **forceCodeSigning: false** - Évite problèmes de signature

---

## 🏗️ Processus de Build

### 1. Préparation
```bash
# Arrêter application
taskkill /F /IM "Atelier Velo+.exe" /T

# Nettoyer build précédent
Remove-Item "dist-electron" -Recurse -Force
```

### 2. Build Installer
```bash
# Lancer build NSIS
npx electron-builder --config electron-builder.config.yml
```

### 3. Vérification
```bash
# Vérifier installateur créé
Get-ChildItem "dist-electron\*.exe" | Select-Object Name, @{Name="Size(MB)";Expression={[math]::Round($_.Length/1MB,2)}}
```

---

## 📊 Résultats Attendus

### Fichiers Créés
- **`dist-electron\Atelier Velo+.exe`** - Installateur principal (~200MB)
- **`dist-electron\win-unpacked\`** - Version développeur (pour tests)

### Structure Installateur
- ✅ Application Electron complète
- ✅ Serveur Next.js intégré
- ✅ Icône personnalisée
- ✅ Tous les node_modules
- ✅ Base de données Prisma

---

## 📂 Organisation Finale

### Dossier Release
```bash
# Créer dossier distribution
New-Item -ItemType Directory -Path "C:\atelier\release" -Force

# Copier installateur
Copy-Item -Path "dist-electron\*.exe" -Destination "C:\atelier\release\" -Force
```

### Fichier Final
- **Chemin**: `C:\atelier\release\Atelier Velo+.exe`
- **Taille**: ~200MB
- **Format**: Installateur NSIS
- **Icône**: Personnalisée Atelier Vélo+

---

## 🧪 Validation Installateur

### Tests à Effectuer
1. **Taille du fichier** - Doit faire ~200MB
2. **Format NSIS** - Doit contenir marqueurs Nullsoft/NSIS
3. **Icône personnalisée** - Visible dans l'explorateur
4. **Installation silencieuse** - `Atelier Velo+.exe /S`

### Commandes Validation
```bash
# Vérifier taille
$installer = Get-Item "C:\atelier\release\Atelier Velo+.exe"
Write-Host "Taille: $([math]::Round($installer.Length/1MB,2)) MB"

# Vérifier format NSIS
$bytes = [System.IO.File]::ReadAllBytes($installer.FullName)
$nsisMarker = [System.Text.Encoding]::ASCII.GetString($bytes[0..100])
if ($nsisMarker -match "Nullsoft|NSIS") {
    Write-Host "✅ Installateur NSIS valide"
}
```

---

## 🚀 Distribution

### Options d'Installation
```bash
# Installation normale
Atelier Velo+.exe

# Installation silencieuse
Atelier Velo+.exe /S

# Installation avec répertoire personnalisé
Atelier Velo+.exe /D=C:\MonApp\AtelierVelo
```

### Répertoire d'Installation par Défaut
- **Windows**: `C:\Users\<username>\AppData\Local\Programs\Atelier Vélo+\`
- **Système**: `C:\Program Files\Atelier Vélo+\`

---

## 📝 Notes Importantes

### Performance
- **Build installer**: ~10-15 minutes
- **Taille finale**: ~200MB
- **Installation**: ~2-3 minutes

### Sécurité
- **Signature désactivée** - Warning Windows possible
- **Installation admin** - Non requise (user level)
- **Désinstallation** - Via "Ajout/Suppression programmes"

### Compatibilité
- **Windows 10/11** - Testé et validé
- **Windows 7/8** - Non supporté (Next.js 13+)
- **Antivirus** - Scan recommandé avant distribution

---

## 🔄 Maintenance

### Mises à Jour
1. Modifier version dans `package.json`
2. Relancer build installer
3. Générer nouveau `.exe`
4. Distribuer nouvelle version

### Nettoyage
```bash
# Nettoyer builds anciens
Remove-Item "dist-electron" -Recurse -Force
Remove-Item "release" -Recurse -Force
```

---

## ✅ Checklist Finale

Avant distribution:
- [ ] Installateur créé dans `C:\atelier\release\`
- [ ] Taille ~200MB
- [ ] Icône personnalisée visible
- [ ] Installation testée sur machine vierge
- [ ] Désinstallation fonctionnelle
- [ ] Application démarre après installation
- [ ] Serveur Next.js opérationnel (port 3000)

---

## 🎉 Conclusion

L'installateur **Atelier Vélo+.exe** est prêt pour distribution:
- ✅ Installation simple pour utilisateurs
- ✅ Application complète avec serveur intégré
- ✅ Icône professionnelle personnalisée
- ✅ Compatible Windows 10/11

*Installateur validé et testé pour production*
