# 🔧 Commandes de Test - Atelier Vélo+ Exe

## 🚀 Test avec Monitoring Complet (Recommandé)

### Lancer le script de test automatique
```powershell
# Le script trouve automatiquement l'exe
.\test-exe-with-logs.ps1

# Ou spécifier le chemin manuellement
.\test-exe-with-logs.ps1 "C:\Users\j_ley\Atelier-velo+\apps\desktop\dist\win-unpacked\Atelier Vélo+.exe"
```

**Ce que fait ce script** :
- ✅ Lance l'application
- ✅ Affiche les logs en temps réel avec couleurs
- ✅ Sauvegarde tous les logs dans un fichier daté
- ✅ Détecte et affiche les erreurs
- ✅ Donne un résumé à la fin

---

## 🏃 Tests Rapides (One-liners)

### Test de l'exe unpacked avec logs
```powershell
# Lancer et surveiller les logs
Start-Process ".\apps\desktop\dist\win-unpacked\Atelier Vélo+.exe"; Start-Sleep -Seconds 5; Get-Content "$env:APPDATA\atelier-velo-desktop\logs\next-server.log" -Wait -Tail 50
```

### Test de l'exe installateur
```powershell
# Lancer et surveiller les logs
Start-Process ".\apps\desktop\dist\Atelier Vélo+ Setup.exe"; Start-Sleep -Seconds 5; Get-Content "$env:APPDATA\atelier-velo-desktop\logs\next-server.log" -Wait -Tail 50
```

### Afficher les 50 dernières lignes du log
```powershell
Get-Content "$env:APPDATA\atelier-velo-desktop\logs\next-server.log" -Tail 50
```

### Afficher uniquement les erreurs
```powershell
Get-Content "$env:APPDATA\atelier-velo-desktop\logs\next-server.log" | Select-String -Pattern "Error|ERROR|error|STDERR"
```

### Surveiller le log en temps réel
```powershell
Get-Content "$env:APPDATA\atelier-velo-desktop\logs\next-server.log" -Wait
```

---

## 🔍 Diagnostic Complet

### Vérifier que tous les fichiers nécessaires sont présents
```powershell
# Vérifier server.js
Test-Path ".\apps\desktop\dist\win-unpacked\resources\web\server.js"

# Vérifier styled-jsx
Test-Path ".\apps\desktop\dist\win-unpacked\resources\web\node_modules\styled-jsx"

# Vérifier @swc/helpers
Test-Path ".\apps\desktop\dist\win-unpacked\resources\web\node_modules\@swc\helpers"

# Vérifier .env
Test-Path ".\apps\desktop\dist\win-unpacked\resources\web\.env"

# Vérifier Node.js système
Test-Path "C:\Program Files\nodejs\node.exe"
```

**Tous doivent retourner `True`.**

### Comparer unpacked vs installateur
```powershell
# Taille unpacked
(Get-ChildItem ".\apps\desktop\dist\win-unpacked" -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB

# Taille installateur
(Get-Item ".\apps\desktop\dist\Atelier Vélo+ Setup.exe").Length / 1MB

# Nombre de fichiers unpacked
(Get-ChildItem ".\apps\desktop\dist\win-unpacked" -Recurse -File).Count

# Liste des fichiers resources/web/node_modules
Get-ChildItem ".\apps\desktop\dist\win-unpacked\resources\web\node_modules" -Directory | Select-Object Name
```

---

## 🧹 Nettoyage et Réinitialisation

### Supprimer les données utilisateur (réinitialisation complète)
```powershell
# Arrêter tous les processus
Get-Process | Where-Object {$_.ProcessName -like "*Atelier*"} | Stop-Process -Force
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force

# Supprimer les données
Remove-Item "$env:APPDATA\atelier-velo-desktop" -Recurse -Force -ErrorAction SilentlyContinue

# Relancer l'exe
& ".\apps\desktop\dist\win-unpacked\Atelier Vélo+.exe"
```

### Nettoyer uniquement les logs
```powershell
Remove-Item "$env:APPDATA\atelier-velo-desktop\logs\*" -Force
```

### Nettoyer uniquement la base de données
```powershell
Remove-Item "$env:APPDATA\atelier-velo-desktop\data\atelier.db" -Force
```

---

## 📊 Vérifications Post-Lancement

### Vérifier que le serveur Node démarre
```powershell
# Attendre 10 secondes après le lancement
Start-Sleep -Seconds 10

# Vérifier le processus Node
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Select-Object Id, ProcessName, StartTime

# Vérifier que le port 3000 est en écoute
netstat -ano | Select-String ":3000"
```

### Tester l'accès HTTP
```powershell
# Tester si le serveur répond
Start-Sleep -Seconds 15
Invoke-WebRequest -Uri "http://127.0.0.1:3000" -UseBasicParsing -TimeoutSec 5
```

Si le serveur répond, vous devriez voir :
```
StatusCode        : 200
StatusDescription : OK
```

---

## 🐛 Cas d'Usage : Debug Page Blanche

### Scénario : L'exe dans unpacked fonctionne, mais l'installateur non

**Étape 1 : Comparer les fichiers**
```powershell
# Vérifier la présence de styled-jsx dans les deux
Test-Path ".\apps\desktop\dist\win-unpacked\resources\web\node_modules\styled-jsx"
Test-Path "C:\AtelierVelo\resources\web\node_modules\styled-jsx"  # Si installé
```

**Étape 2 : Comparer les .env**
```powershell
# Unpacked
Get-Content ".\apps\desktop\dist\win-unpacked\resources\web\.env" | Select-String "NEXTAUTH_SECRET|AUTH_SECRET"

# Installé
Get-Content "C:\AtelierVelo\resources\web\.env" | Select-String "NEXTAUTH_SECRET|AUTH_SECRET"
```

**Étape 3 : Vérifier les permissions**
```powershell
# L'installateur crée-t-il les fichiers avec les bonnes permissions ?
Get-Acl "C:\AtelierVelo\resources\web\.env" | Format-List
```

**Étape 4 : Comparer les logs**
```powershell
# Lancer unpacked et voir le log
& ".\apps\desktop\dist\win-unpacked\Atelier Vélo+.exe"
Start-Sleep -Seconds 10
$log1 = Get-Content "$env:APPDATA\atelier-velo-desktop\logs\next-server.log"

# Tuer et nettoyer
Get-Process | Where-Object {$_.ProcessName -like "*Atelier*"} | Stop-Process -Force
Remove-Item "$env:APPDATA\atelier-velo-desktop\logs\*" -Force

# Lancer l'installé et voir le log
& "C:\AtelierVelo\Atelier Vélo+.exe"
Start-Sleep -Seconds 10
$log2 = Get-Content "$env:APPDATA\atelier-velo-desktop\logs\next-server.log"

# Comparer
Compare-Object $log1 $log2
```

---

## 📝 Exemple de Sortie Attendue (Succès)

```
✅ Application lancée (PID: 12345)
✅ Fichier log détecté

--- Contenu du log next-server.log ---
[Electron] Starting Next.js server...
[Electron] Server path: C:\...\resources\web\server.js
[Electron] Starting server with AUTH_TRUST_HOST: true
[Next.js] Ready on http://127.0.0.1:3000

✅ Aucune erreur détectée dans les logs
```

## ❌ Exemple de Sortie (Erreur)

```
✅ Application lancée (PID: 12345)
✅ Fichier log détecté

--- Contenu du log next-server.log ---
[STDERR] Error: Cannot find module 'styled-jsx'
[STDERR]     at Module._resolveFilename
[STDERR]     at Module._load

⚠️  Erreurs détectées (10 dernières) :
   [STDERR] Error: Cannot find module 'styled-jsx'
```

**→ Dans ce cas, styled-jsx manque dans le build.**

---

## 💡 Conseil : Créer un Alias PowerShell

Ajoutez ceci à votre profil PowerShell pour faciliter les tests :

```powershell
# Ouvrir le profil
notepad $PROFILE

# Ajouter cette fonction
function Test-AtelierVelo {
    & "C:\Users\j_ley\Atelier-velo+\test-exe-with-logs.ps1"
}

# Sauvegarder et recharger
. $PROFILE

# Utiliser
Test-AtelierVelo
```

---

**Ces commandes vous permettent de diagnostiquer précisément pourquoi l'exe du dossier dist ne fonctionne pas alors que unpacked fonctionne.**
