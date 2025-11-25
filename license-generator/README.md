# 🔑 GÉNÉRATEUR DE LICENCES - ATELIER VÉLO+

## 📋 DESCRIPTION

Outil de génération de clés de licence pour Atelier Vélo+ avec support des 4 tiers:
- **Trial**: 14 jours gratuit (version PRO complète)
- **Basique**: 199€/an (30 emails/mois, PDF création)
- **Pro**: 359€/an (illimité, PDF envoi direct)
- **Pro Lifetime**: 599€ à vie (maintenance 3 ans)

---

## 🚀 UTILISATION

### Option 1: Interface Graphique (Recommandé)

1. **Ouvrir** `generate-license-gui.html` dans un navigateur
2. **Sélectionner** le type de licence
3. **Renseigner** la date d'expiration (si applicable)
4. **Cliquer** "Générer la Clé"
5. **Copier** la clé générée

**Avantages**:
- Interface intuitive
- Pas d'installation requise
- Fonctionne hors ligne
- Copie en un clic

---

### Option 2: Ligne de Commande

#### Installation
```bash
# Aucune installation requise (Node.js natif)
cd license-generator
```

#### Commandes

**Trial (14 jours)**:
```bash
node generate-license.js trial
```

**Basique (199€/an)**:
```bash
node generate-license.js basique 12 2025
# Format: basique [mois] [année]
```

**Pro (359€/an)**:
```bash
node generate-license.js pro 11 2026
# Format: pro [mois] [année]
```

**Pro Lifetime (599€)**:
```bash
node generate-license.js pro_lifetime
```

#### Aide
```bash
node generate-license.js --help
```

---

## 📊 FORMAT DES CLÉS

### Structure
```
AVXX-YYYY-MMYY-ZZZZ
│    │    │    └─ Checksum (CRC8 + random)
│    │    └────── Expiration (mois + année)
│    └─────────── Segment aléatoire
└──────────────── Préfixe tier
```

### Préfixes
- `AVTR`: Trial
- `AVBS`: Basique
- `AVPR`: Pro
- `AVPL`: Pro Lifetime

### Exemples
```
AVTR-A3F2-1225-4B7C  → Trial expire 25/12/2025
AVBS-B8D1-1126-9E2A  → Basique expire 30/11/2026
AVPR-C4E9-0327-1F5D  → Pro expire 31/03/2027
AVPL-D7A3-0000-8C4B  → Pro Lifetime (jamais)
```

---

## 🔒 SÉCURITÉ

### Validation
- ✅ Format vérifié (regex)
- ✅ Checksum CRC8
- ✅ Préfixe tier validé
- ✅ Date expiration encodée
- ✅ Hardware ID binding (anti-partage)

### Anti-Fraude
- Clé unique par génération
- Hardware ID vérifié à chaque démarrage
- Expiration automatique
- Logs de vérification

---

## 📁 FICHIERS GÉNÉRÉS

Chaque génération crée un fichier:
```
license-[tier]-[timestamp].txt
```

**Contenu**:
- Clé de licence
- Type et prix
- Features incluses
- Date de génération
- Instructions

**Exemple**:
```
license-pro-2025-11-16T00-30-00.txt
```

---

## 🎯 ACTIVATION DANS L'APP

### Étape 1: Copier la Clé
Depuis le générateur ou le fichier `.txt`

### Étape 2: Ouvrir l'App
Atelier Vélo+ → Admin → Licences

### Étape 3: Activer
1. Coller la clé
2. Renseigner email et nom
3. Cliquer "Activer"

### Étape 4: Vérification
- Status: Active ✅
- Tier affiché
- Features débloquées

---

## 🧪 TESTS

### Test Clé Trial
```bash
node generate-license.js trial
# Résultat: AVTR-XXXX-MMYY-XXXX
# Expire: Dans 14 jours
```

### Test Clé Basique
```bash
node generate-license.js basique 12 2025
# Résultat: AVBS-XXXX-1225-XXXX
# Expire: 31/12/2025
```

### Test Clé Pro
```bash
node generate-license.js pro 6 2026
# Résultat: AVPR-XXXX-0626-XXXX
# Expire: 30/06/2026
```

### Test Clé Lifetime
```bash
node generate-license.js pro_lifetime
# Résultat: AVPL-XXXX-0000-XXXX
# Expire: Jamais
```

---

## 📊 TIERS & FEATURES

| Tier | Prix | Emails/Mois | PDF Direct | Marketing | Stats | Booking |
|------|------|-------------|------------|-----------|-------|---------|
| Trial | Gratuit | Illimité | ✅ | ✅ | ✅ | ✅ |
| Basique | 199€/an | 30 | ❌ | ❌ | ❌ | ❌ |
| Pro | 359€/an | Illimité | ✅ | ✅ | ✅ | ✅ |
| Pro Lifetime | 599€ | Illimité | ✅ | ✅ | ✅ | ✅ |

---

## 🛠️ DÉPANNAGE

### Erreur: "Tier invalide"
**Cause**: Tier non reconnu  
**Solution**: Utiliser `trial`, `basique`, `pro`, ou `pro_lifetime`

### Erreur: "Mois et année requis"
**Cause**: Date manquante pour Basique/Pro  
**Solution**: Ajouter mois et année: `node generate-license.js pro 12 2025`

### Clé Non Acceptée dans l'App
**Cause**: Format invalide ou checksum incorrect  
**Solution**: Régénérer une nouvelle clé

---

## 📝 NOTES TECHNIQUES

### Algorithme CRC8
- Polynôme: 0x8C
- Longueur: 8 bits
- Collision: <0.4%

### Cryptographie
- Random: `crypto.randomBytes()`
- Checksum: CRC8 custom
- Encoding: Hexadécimal uppercase

### Compatibilité
- Node.js: ≥14.0.0
- Navigateurs: Tous modernes (Crypto API)
- OS: Windows, macOS, Linux

---

## 🔄 WORKFLOW COMPLET

```
1. Génération Clé
   ↓
2. Sauvegarde Fichier .txt
   ↓
3. Envoi Client (email/Stripe)
   ↓
4. Client Active dans App
   ↓
5. Vérification Hardware ID
   ↓
6. Features Débloquées
```

---

## 📞 SUPPORT

**Email**: jeromeley.apps@gmail.com  
**Documentation**: Voir `src/lib/license-manager.ts`  
**API**: `/api/admin/license/activate`

---

**Date**: 16 novembre 2025  
**Version**: 1.0.0  
**Auteur**: Jérôme Leyssard - Upgraded Bikes
