# Guide de Signature Commerciale - Atelier Vélo+

## Vue d'ensemble

Pour une distribution commerciale professionnelle, les applications doivent être **signées** :
- **Windows** : Certificat Code Signing (évite les alertes SmartScreen)
- **macOS** : Certificat Developer ID + Notarization Apple (obligatoire depuis Catalina)

---

## 1. Signature Windows

### Option A : Certificat EV (Extended Validation) - RECOMMANDÉ

**Avantages :**
- Réputation SmartScreen immédiate (pas d'alerte)
- Confiance maximale des utilisateurs
- Requis pour certains antivirus

**Fournisseurs :**
| Fournisseur | Prix/an | Délai |
|-------------|---------|-------|
| DigiCert | ~500€ | 1-3 jours |
| Sectigo | ~400€ | 1-3 jours |
| GlobalSign | ~450€ | 1-3 jours |

**Processus :**
1. Commander le certificat EV
2. Vérification d'identité entreprise (KBIS, etc.)
3. Recevoir le token USB (clé physique)
4. Configurer dans GitHub Secrets

### Option B : Certificat OV (Organization Validation)

**Avantages :**
- Moins cher (~200€/an)
- Pas de token USB

**Inconvénients :**
- SmartScreen peut bloquer les premières installations
- Réputation se construit avec le temps

### Configuration GitHub Secrets (Windows)

```
WIN_CSC_LINK: <certificat .pfx encodé en base64>
WIN_CSC_KEY_PASSWORD: <mot de passe du certificat>
```

**Encoder le certificat :**
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("certificat.pfx")) | Out-File cert-base64.txt
```

---

## 2. Signature macOS

### Prérequis : Apple Developer Account

**Coût :** 99$/an (≈90€/an)
**Inscription :** https://developer.apple.com/programs/enroll/

### Étape 1 : Créer le certificat

1. Aller sur https://developer.apple.com/account/resources/certificates
2. Cliquer "+" pour créer un nouveau certificat
3. Sélectionner **"Developer ID Application"**
4. Suivre les instructions pour créer une CSR (Certificate Signing Request)
5. Télécharger le certificat `.cer`
6. Double-cliquer pour l'installer dans Keychain Access

### Étape 2 : Exporter en .p12

1. Ouvrir **Keychain Access** sur Mac
2. Trouver le certificat "Developer ID Application: Votre Nom"
3. Clic droit > **Exporter**
4. Format: `.p12`
5. Définir un mot de passe fort

### Étape 3 : Créer un App-Specific Password

1. Aller sur https://appleid.apple.com/account/manage
2. Section "Sécurité" > "Mots de passe pour applications"
3. Générer un nouveau mot de passe
4. Nommer "Atelier Velo+ Notarization"
5. Copier le mot de passe (format: xxxx-xxxx-xxxx-xxxx)

### Étape 4 : Trouver le Team ID

1. Aller sur https://developer.apple.com/account
2. Section "Membership"
3. Copier le "Team ID" (10 caractères)

### Configuration GitHub Secrets (macOS)

```
MAC_CSC_LINK: <certificat .p12 encodé en base64>
MAC_CSC_KEY_PASSWORD: <mot de passe du .p12>
APPLE_ID: <votre email Apple Developer>
APPLE_APP_SPECIFIC_PASSWORD: <xxxx-xxxx-xxxx-xxxx>
APPLE_TEAM_ID: <XXXXXXXXXX>
```

**Encoder le certificat :**
```bash
base64 -i certificat.p12 -o cert-base64.txt
```

---

## 3. Configuration GitHub Secrets

### Accéder aux Secrets

1. Aller sur https://github.com/jeromeleyssard-pixel/atelier-velo-plus
2. **Settings** > **Secrets and variables** > **Actions**
3. Cliquer **"New repository secret"**

### Secrets Requis

| Secret | Description | Obligatoire |
|--------|-------------|-------------|
| `MAC_CSC_LINK` | Certificat .p12 en base64 | ✅ macOS |
| `MAC_CSC_KEY_PASSWORD` | Mot de passe .p12 | ✅ macOS |
| `APPLE_ID` | Email Apple Developer | ✅ macOS |
| `APPLE_APP_SPECIFIC_PASSWORD` | Mot de passe app | ✅ macOS |
| `APPLE_TEAM_ID` | Team ID (10 chars) | ✅ macOS |
| `WIN_CSC_LINK` | Certificat .pfx en base64 | ⚡ Windows (optionnel) |
| `WIN_CSC_KEY_PASSWORD` | Mot de passe .pfx | ⚡ Windows (optionnel) |

---

## 4. Lancer un Build

### Option A : Via Tag Git

```bash
# Créer et pousser un tag
git tag v1.2.0
git push origin v1.2.0
```

Le workflow se déclenche automatiquement et crée une Release GitHub.

### Option B : Manuellement

1. Aller sur GitHub > Actions > "Build & Release"
2. Cliquer "Run workflow"
3. Entrer la version
4. Cliquer "Run workflow"

---

## 5. Résultat Final

### Fichiers Générés

| Plateforme | Fichier | Description |
|------------|---------|-------------|
| Windows | `Atelier Velo+-1.2.0-win-x64.exe` | Installateur NSIS |
| Windows | `Atelier Velo+-1.2.0-win-x64.zip` | Version portable |
| macOS Intel | `Atelier Velo+-1.2.0-mac-x64.dmg` | Pour Mac Intel |
| macOS Silicon | `Atelier Velo+-1.2.0-mac-arm64.dmg` | Pour Mac M1/M2/M3 |

### Expérience Utilisateur

**Avec signature :**
- ✅ Windows : Pas d'alerte SmartScreen
- ✅ macOS : Installation directe, pas de contournement Gatekeeper

**Sans signature :**
- ⚠️ Windows : Alerte "Application non reconnue"
- ⚠️ macOS : "Application de développeur non identifié" (contournable)

---

## 6. Coûts Annuels

| Élément | Coût | Obligatoire |
|---------|------|-------------|
| Apple Developer Account | 99$/an | ✅ Pour macOS signé |
| Certificat Windows EV | ~400-500€/an | ⚡ Recommandé |
| Certificat Windows OV | ~200€/an | ⚡ Alternative |
| GitHub Actions | Gratuit* | ✅ |

*GitHub Actions : 2000 minutes/mois gratuites pour repos publics, 500 min pour privés.

---

## 7. Timeline Recommandée

| Jour | Action |
|------|--------|
| J+0 | Créer compte Apple Developer (99$) |
| J+1-3 | Vérification Apple (automatique pour individuel) |
| J+3 | Créer certificat Developer ID |
| J+3 | Configurer GitHub Secrets |
| J+3 | Lancer premier build signé |
| J+4 | Tester sur Mac client |
| J+7 | (Optionnel) Commander certificat Windows EV |
| J+10 | (Optionnel) Recevoir token USB Windows |

---

## 8. Support

### Problèmes Courants

**"The signature is invalid"**
- Vérifier que le certificat n'est pas expiré
- Vérifier le mot de passe du .p12

**"Notarization failed"**
- Vérifier APPLE_ID et APP_SPECIFIC_PASSWORD
- Vérifier que l'app ne contient pas de malware détecté

**"SmartScreen blocked"**
- Normal sans certificat EV
- La réputation se construit avec le temps (OV)

---

*Document créé le 7 décembre 2025*
