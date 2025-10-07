# 👤 Intégration Profil Utilisateur → PDF

## ✅ Modifications effectuées

### **1. Schéma Prisma mis à jour**
Ajout de 5 nouveaux champs dans `AppSetting` :
- ✅ `siret` - SIRET (14 chiffres)
- ✅ `tva` - N° TVA Intracommunautaire  
- ✅ `rcs` - Registre du Commerce et des Sociétés
- ✅ `capital` - Capital social
- ✅ `insurance` - Assurance RC Professionnelle

### **2. Page Paramètres améliorée** (`/settings`)
- ✅ Section "Informations légales" ajoutée
- ✅ Champs obligatoires marqués avec `required`
- ✅ Helpers textuels pour guider la saisie
- ✅ Sauvegarde dans la base de données

### **3. Génération PDF mise à jour**
- ✅ Priorité : **Profil utilisateur** > Variables d'environnement > Valeurs par défaut
- ✅ Les informations légales s'affichent automatiquement sur tous les PDF
- ✅ Pas besoin de redéployer pour changer les informations

## 🔄 Ordre de priorité des données

```
1. Base de données (AppSetting) ← PRIORITÉ
   ↓ Si vide
2. Variables d'environnement (.env.local)
   ↓ Si vide
3. Valeurs par défaut (fallback)
```

## 📋 Migration requise

### **Option 1 : Script automatique (Windows)**
```powershell
cd apps/web
.\migrate-legal-info.ps1
```

### **Option 2 : Commandes manuelles**
```bash
cd apps/web

# Générer et appliquer la migration
npx prisma migrate dev --name add_legal_info_to_app_settings

# Régénérer le client Prisma
npx prisma generate

# Redémarrer le serveur
npm run dev
```

## 🎯 Workflow utilisateur

### **Première utilisation**
1. L'utilisateur se connecte
2. Va sur `/settings`
3. Remplit les informations de l'atelier :
   - Nom, adresse, téléphone, email
   - **SIRET** (obligatoire)
   - **N° TVA** (obligatoire)
   - RCS
   - Capital social
   - **Assurance RC Pro** (obligatoire)
4. Clique sur "Enregistrer"

### **Génération de PDF**
1. Les informations sont **automatiquement récupérées** du profil
2. Affichées sur tous les documents (factures, devis, avoirs)
3. Conformes aux exigences légales françaises

## 🔧 Avantages

### **Pour l'utilisateur** :
- ✅ Saisie unique des informations
- ✅ Modification facile depuis l'interface
- ✅ Pas besoin de toucher au code ou aux variables d'environnement
- ✅ Multi-utilisateurs : chaque utilisateur a ses propres informations

### **Pour le développeur** :
- ✅ Données centralisées dans la base
- ✅ Pas de redéploiement pour changer les infos
- ✅ Fallback sur les variables d'environnement si besoin
- ✅ Type-safe avec Prisma

## 📝 Champs du profil utilisateur

### **Informations de base**
| Champ | Type | Obligatoire | Exemple |
|-------|------|-------------|---------|
| shopName | String | Oui | Atelier Vélo+ |
| address1 | String | Oui | 17 Rue Danton |
| zip | String | Oui | 84000 |
| city | String | Oui | Avignon |
| shopPhone | String | Oui | 04 XX XX XX XX |
| shopEmail | String | Oui | contact@atelier-velo.fr |

### **Informations légales**
| Champ | Type | Obligatoire | Exemple |
|-------|------|-------------|---------|
| siret | String | Oui | 123 456 789 00012 |
| tva | String | Oui | FR12345678901 |
| rcs | String | Non | Avignon B 123 456 789 |
| capital | String | Non | 10 000 € |
| insurance | String | Oui | Allianz Police n° 123456789 |

### **Personnalisation**
| Champ | Type | Obligatoire | Usage |
|-------|------|-------------|-------|
| legalFooter | String | Non | Remplace les mentions légales par défaut |
| pdfPrimary | String | Non | Couleur primaire des PDF (hex) |

## 🧪 Test

1. **Migrer la base** : `.\migrate-legal-info.ps1`
2. **Redémarrer** : `npm run dev`
3. **Configurer** : Aller sur `/settings` et remplir les champs
4. **Tester** : Exporter un PDF depuis une facture
5. **Vérifier** : Les informations légales doivent apparaître

## ⚠️ Notes importantes

- Les erreurs TypeScript disparaîtront après `npx prisma generate`
- Les champs sont optionnels en base mais marqués "required" dans l'UI
- Les variables d'environnement restent disponibles comme fallback
- Chaque utilisateur peut avoir ses propres informations (multi-tenant ready)

## 🔐 Conformité légale

Tous les champs obligatoires pour la conformité française sont présents :
- ✅ Raison sociale (shopName)
- ✅ Adresse complète (address1, zip, city)
- ✅ SIRET
- ✅ N° TVA Intracommunautaire
- ✅ RCS
- ✅ Capital social
- ✅ Assurance RC Professionnelle
