# ✨ AMÉLIORATIONS GÉNÉRATEUR LICENCES - OPTIONS DATE

## 🎯 NOUVELLES FONCTIONNALITÉS

### Option 1: Date Automatique (+365 jours)
**Pour**: Basique et Pro  
**Fonctionnement**: Ajoute automatiquement 365 jours à la date actuelle

**Avantages**:
- ✅ Rapide et simple
- ✅ Pas de calcul manuel
- ✅ Toujours valide 1 an

### Option 2: Date Personnalisée Complète
**Pour**: Basique et Pro  
**Fonctionnement**: Choisir jour, mois et année précis

**Avantages**:
- ✅ Contrôle total
- ✅ Date exacte souhaitée
- ✅ Flexible pour offres spéciales

### Pro Lifetime
**Fonctionnement**: Aucune date d'expiration (0000 dans la clé)

---

## 📝 UTILISATION CLI

### Option 1: Date Automatique
```bash
# Basique - expire dans 365 jours
node generate-license.js basique auto

# Pro - expire dans 365 jours
node generate-license.js pro auto
```

**Exemple de sortie**:
```
============================================================
  CLÉ DE LICENCE GÉNÉRÉE
============================================================

  Clé:     AVBS-A3F2-1126-4B7C
  Tier:    Basique
  Prix:    199€/an
  Features: 30 emails/mois, PDF création
  Expire:  16/11/2026 (dans 365 jours)

============================================================
```

---

### Option 2: Date Personnalisée
```bash
# Basique - expire le 31 décembre 2025
node generate-license.js basique 31 12 2025

# Pro - expire le 15 juin 2026
node generate-license.js pro 15 06 2026
```

**Exemple de sortie**:
```
============================================================
  CLÉ DE LICENCE GÉNÉRÉE
============================================================

  Clé:     AVPR-C4E9-0626-1F5D
  Tier:    Pro
  Prix:    359€/an
  Features: Illimité, PDF envoi direct
  Expire:  15/06/2026 (dans 211 jours)

============================================================
```

---

### Trial et Pro Lifetime
```bash
# Trial - expire automatiquement dans 14 jours
node generate-license.js trial

# Pro Lifetime - jamais d'expiration
node generate-license.js pro_lifetime
```

---

## 🖥️ UTILISATION INTERFACE GRAPHIQUE

### 1. Ouvrir le Générateur
```
Ouvrir: license-generator/generate-license-gui.html
```

### 2. Sélectionner Type de Licence
- Trial (14 jours gratuit)
- Basique (199€/an)
- Pro (359€/an)
- Pro Lifetime (599€ à vie)

### 3. Choisir Mode de Date (pour Basique/Pro)

#### Option A: Date Automatique
1. Sélectionner radio button **"📅 Automatique (+365 jours)"**
2. Cliquer "Générer la Clé"
3. ✅ Clé valide 1 an depuis aujourd'hui

#### Option B: Date Personnalisée
1. Sélectionner radio button **"🗓️ Date personnalisée"**
2. Renseigner:
   - **Jour**: 1-31
   - **Mois**: 1-12
   - **Année**: 2025-2035
3. Cliquer "Générer la Clé"
4. ✅ Clé valide jusqu'à la date choisie

### 4. Copier la Clé
- Cliquer **"📋 Copier la Clé"**
- ✅ Feedback visuel "Copié !"
- Clé dans le presse-papiers

---

## 📊 EXEMPLES CONCRETS

### Cas 1: Vente Standard Basique
**Besoin**: Licence valide 1 an  
**Solution**: `node generate-license.js basique auto`  
**Résultat**: `AVBS-XXXX-1126-XXXX` (expire 16/11/2026)

---

### Cas 2: Offre Spéciale Noël
**Besoin**: Licence Pro jusqu'au 31/12/2025  
**Solution**: `node generate-license.js pro 31 12 2025`  
**Résultat**: `AVPR-XXXX-1225-XXXX` (expire 31/12/2025)

---

### Cas 3: Trial Gratuit
**Besoin**: Essai 14 jours  
**Solution**: `node generate-license.js trial`  
**Résultat**: `AVTR-XXXX-MMYY-XXXX` (expire dans 14 jours)

---

### Cas 4: Achat Lifetime
**Besoin**: Licence à vie  
**Solution**: `node generate-license.js pro_lifetime`  
**Résultat**: `AVPL-XXXX-0000-XXXX` (jamais d'expiration)

---

## 🔍 DÉTAILS TECHNIQUES

### Format Date dans la Clé

**Segment MMYY**:
- `MM`: Mois (01-12)
- `YY`: Année (2 derniers chiffres)
- `0000`: Pas d'expiration (Lifetime)

**Exemples**:
```
1225 → Expire 31/12/2025
0626 → Expire 30/06/2026
1126 → Expire 30/11/2026
0000 → Jamais (Lifetime)
```

### Calcul Date Automatique

**Algorithme**:
```javascript
const expiryDate = new Date();
expiryDate.setDate(expiryDate.getDate() + 365);
```

**Résultat**:
- Aujourd'hui: 16/11/2025
- +365 jours: 16/11/2026

### Validation Date Personnalisée

**Vérifications**:
- ✅ Jour valide (1-31)
- ✅ Mois valide (1-12)
- ✅ Année valide (2025-2035)
- ✅ Date cohérente (ex: pas 31/02)

---

## 📋 COMPARAISON OPTIONS

| Aspect | Date Auto | Date Personnalisée |
|--------|-----------|-------------------|
| **Rapidité** | ⚡ Instantané | 🕐 Quelques secondes |
| **Précision** | 📅 Exactement 1 an | 🎯 Date exacte |
| **Usage** | Ventes standard | Offres spéciales |
| **Complexité** | ✅ Simple | ⚙️ Nécessite calcul |
| **Erreurs** | ❌ Aucune | ⚠️ Possible (date invalide) |

---

## 🎨 INTERFACE GRAPHIQUE - CAPTURES

### Écran Principal
```
┌─────────────────────────────────────────┐
│  🔑 Générateur de Licences              │
│  Atelier Vélo+ - Système de Licences   │
├─────────────────────────────────────────┤
│  Type de Licence: [Basique ▼]          │
│  ✅ Basique - 199€/an                   │
│  ✅ 30 emails/mois                      │
│  ✅ Création PDF                        │
├─────────────────────────────────────────┤
│  Date d'Expiration                      │
│  ○ 📅 Automatique (+365 jours)         │
│  ● 🗓️ Date personnalisée               │
│                                         │
│  [Jour: 31] [Mois: 12] [Année: 2025]  │
├─────────────────────────────────────────┤
│         [✨ Générer la Clé]            │
└─────────────────────────────────────────┘
```

### Résultat Affiché
```
┌─────────────────────────────────────────┐
│  AVBS-A3F2-1225-4B7C                   │
├─────────────────────────────────────────┤
│  Type: Basique                          │
│  Prix: 199€/an                          │
│  Expire: 31/12/2025 (dans 45 jours)   │
│  Mode: Date personnalisée               │
│  Généré: 16/11/2025 00:30:00           │
├─────────────────────────────────────────┤
│         [📋 Copier la Clé]             │
└─────────────────────────────────────────┘
```

---

## ✅ AVANTAGES AMÉLIORATIONS

### Pour l'Administrateur
1. ✅ **Flexibilité**: 2 modes selon besoin
2. ✅ **Rapidité**: Mode auto pour ventes standard
3. ✅ **Précision**: Mode custom pour cas spéciaux
4. ✅ **Visibilité**: Jours restants affichés

### Pour le Client
1. ✅ **Clarté**: Date d'expiration explicite
2. ✅ **Transparence**: Durée visible dans clé
3. ✅ **Confiance**: Pas de surprise

---

## 🧪 TESTS RECOMMANDÉS

### Test 1: Date Auto Basique
```bash
node generate-license.js basique auto
```
**Vérifier**:
- ✅ Clé format AVBS-XXXX-MMYY-XXXX
- ✅ Date = aujourd'hui + 365 jours
- ✅ Fichier .txt créé

### Test 2: Date Custom Pro
```bash
node generate-license.js pro 31 12 2025
```
**Vérifier**:
- ✅ Clé format AVPR-XXXX-1225-XXXX
- ✅ Date = 31/12/2025
- ✅ Jours restants calculés

### Test 3: GUI Mode Auto
1. Ouvrir HTML
2. Sélectionner "Basique"
3. Laisser "Automatique" coché
4. Générer
**Vérifier**:
- ✅ Clé générée
- ✅ Date +365 jours
- ✅ Mode affiché

### Test 4: GUI Mode Custom
1. Ouvrir HTML
2. Sélectionner "Pro"
3. Cocher "Date personnalisée"
4. Renseigner 15/06/2026
5. Générer
**Vérifier**:
- ✅ Clé générée
- ✅ Date = 15/06/2026
- ✅ Mode affiché

---

## 📝 NOTES IMPORTANTES

### Compatibilité
- ✅ Ancien format (mois année) toujours supporté
- ✅ Nouvelles options ajoutées sans casser l'existant
- ✅ Validation renforcée

### Sécurité
- ✅ Checksum CRC8 inchangé
- ✅ Format clé identique
- ✅ Validation côté app identique

### Performance
- ✅ Génération instantanée
- ✅ Pas de dépendances externes
- ✅ Fonctionne hors ligne

---

**Date**: 16 novembre 2025 00:35  
**Version**: 2.0  
**Améliorations**: 2 options date  
**Compatibilité**: 100% rétrocompatible  
**Status**: ✅ PRÊT POUR PRODUCTION
