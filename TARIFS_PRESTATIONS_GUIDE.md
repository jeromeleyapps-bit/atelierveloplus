# Guide: Tarifs et Prestations

**Date**: 14 octobre 2025  
**Fonctionnalité**: Gestion centralisée des prestations

---

## 🎯 Objectif

Créer une grille tarifaire centralisée pour:
- ✅ Standardiser les tarifs des prestations
- ✅ Accélérer la création de devis
- ✅ Suivre l'évolution des prix
- ✅ Importer/exporter facilement

---

## 📊 Modèle de Données

### Table `ServiceRate`

| Champ | Type | Description |
|-------|------|-------------|
| `id` | String | Identifiant unique |
| `name` | String | Nom de la prestation (ex: "Révision complète") |
| `description` | String? | Description détaillée |
| `priceHT` | Float | Prix HT en euros |
| `bikeType` | String? | Type de vélo (VTT, Route, Ville, Électrique, null = tous) |
| `category` | String? | Catégorie (Entretien, Réparation, Diagnostic, etc.) |
| `duration` | Int? | Durée estimée en minutes |
| `active` | Boolean | Prestation active ou non |
| `createdAt` | DateTime | Date de création |
| `updatedAt` | DateTime | Date de dernière modification |

---

## 🔧 Migration Prisma

### 1. Appliquer la Migration

```powershell
cd apps\web
npx prisma db push
```

**OU**

```powershell
npx prisma migrate dev --name add_service_rates
```

### 2. Générer le Client

```powershell
npx prisma generate
```

---

## 📋 Utilisation

### Accéder à la Page

1. Menu → **"Tarifs & Prestations"** (dans le dropdown)
2. OU directement: `/admin/service-rates`

### Créer une Prestation

1. Cliquer **"Nouvelle prestation"**
2. Remplir:
   - **Nom**: Ex: "Révision complète"
   - **Description**: Ex: "Révision complète avec nettoyage et réglages"
   - **Tarif HT**: Ex: 60.00
   - **Type de vélo**: Ex: "VTT" (ou laisser vide pour tous)
   - **Catégorie**: Ex: "Entretien"
   - **Durée estimée**: Ex: 90 (minutes)
   - **Actif**: Coché
3. Cliquer **"Créer"**

### Modifier une Prestation

1. Cliquer sur l'icône **✏️** (Edit)
2. Modifier les champs
3. Cliquer **"Mettre à jour"**

### Supprimer une Prestation

1. Cliquer sur l'icône **🗑️** (Delete)
2. Confirmer la suppression

---

## 📥 Import CSV

### Format du Fichier CSV

**En-têtes** (première ligne):
```csv
prestation,tarif,type_velo,categorie,duree,description
```

**Exemple de données**:
```csv
prestation,tarif,type_velo,categorie,duree,description
Révision complète,60.00,VTT,Entretien,90,Révision complète avec nettoyage
Changement câbles freins,25.00,,Réparation,30,Remplacement câbles et gaines
Diagnostic électrique,35.00,Électrique,Diagnostic,45,Diagnostic complet système électrique
Réglage dérailleur,15.00,,Entretien,20,Réglage précis du dérailleur
Changement pneus,30.00,Route,Réparation,25,Pose de pneus neufs
```

### Importer le Fichier

1. Cliquer **"Importer CSV"**
2. Sélectionner le fichier `.csv`
3. Attendre la confirmation
4. Vérifier les prestations importées

**Notes**:
- Les champs vides sont autorisés (sauf `prestation` et `tarif`)
- Si une prestation existe déjà (même nom + type vélo), elle sera mise à jour
- Les erreurs d'import sont affichées dans la console

---

## 📤 Export CSV

1. Cliquer **"Exporter CSV"**
2. Le fichier `prestations_YYYY-MM-DD.csv` est téléchargé
3. Utilisable pour:
   - Sauvegarde
   - Modification en masse (Excel, LibreOffice)
   - Import dans une autre instance

---

## 🎨 Catégories Prédéfinies

- **Entretien**: Révisions, nettoyages, réglages
- **Réparation**: Changements de pièces, réparations
- **Diagnostic**: Diagnostics, expertises
- **Personnalisation**: Customisation, upgrades
- **Autre**: Autres prestations

---

## 🚴 Types de Vélo Prédéfinis

- **VTT**: Vélo Tout-Terrain
- **Route**: Vélo de route
- **Ville**: Vélo de ville, urbain
- **Électrique**: VAE (Vélo à Assistance Électrique)
- **Gravel**: Vélo gravel
- **BMX**: BMX

**Note**: Laisser vide = prestation applicable à tous les types

---

## 📊 Suivi des Mises à Jour

### Sur la Page Tarifs

En haut de la page:
```
Tarifs et Prestations
Mis à jour il y a X mois
```

### Sur le Dashboard Admin (À venir)

Widget affichant:
```
📋 Grille Tarifaire
Dernière mise à jour: il y a X mois
⚠️ Pensez à vérifier vos tarifs régulièrement
```

---

## 🔗 Intégration avec les Tickets

### Utilisation dans un Ticket (À implémenter)

1. Ouvrir un ticket
2. Section **"Prestations"**
3. Cliquer **"Ajouter une prestation"**
4. Sélectionner dans la liste OU saisir manuellement
5. La durée et le prix sont pré-remplis
6. Modifier si nécessaire
7. Enregistrer

### Saisie Manuelle

Si la prestation n'est pas dans la liste:
1. Cliquer **"Saisie manuelle"**
2. Remplir:
   - Nom de la prestation
   - Prix HT
   - Durée (optionnel)
3. Enregistrer

**Note**: Les prestations saisies manuellement ne sont PAS ajoutées à la grille tarifaire automatiquement.

---

## 💡 Exemples de Prestations

### Entretien

| Prestation | Tarif HT | Type | Durée |
|------------|----------|------|-------|
| Révision complète | 60 € | VTT | 90 min |
| Révision complète | 70 € | Électrique | 120 min |
| Nettoyage complet | 25 € | Tous | 45 min |
| Graissage chaîne | 10 € | Tous | 15 min |
| Réglage freins | 15 € | Tous | 20 min |
| Réglage dérailleurs | 15 € | Tous | 20 min |

### Réparation

| Prestation | Tarif HT | Type | Durée |
|------------|----------|------|-------|
| Changement câbles freins | 25 € | Tous | 30 min |
| Changement câbles dérailleurs | 25 € | Tous | 30 min |
| Changement pneus | 30 € | Route | 25 min |
| Changement chambre à air | 15 € | Tous | 20 min |
| Changement chaîne | 20 € | Tous | 25 min |
| Changement cassette | 30 € | Tous | 30 min |

### Diagnostic

| Prestation | Tarif HT | Type | Durée |
|------------|----------|------|-------|
| Diagnostic général | 25 € | Tous | 30 min |
| Diagnostic électrique | 35 € | Électrique | 45 min |
| Expertise cadre | 40 € | Tous | 60 min |

---

## 🔄 Workflow Complet

```
1. CRÉER GRILLE TARIFAIRE
   ↓
2. IMPORTER CSV (optionnel)
   ↓
3. CLIENT APPELLE
   ↓
4. CRÉER TICKET
   ↓
5. AJOUTER PRESTATIONS (depuis grille)
   ↓
6. DURÉE ET PRIX PRÉ-REMPLIS
   ↓
7. AJUSTER SI NÉCESSAIRE
   ↓
8. GÉNÉRER DEVIS
   ↓
9. ENVOYER AU CLIENT
```

---

## 📁 Fichiers Créés

### Backend (API)

1. **`apps/web/src/app/api/admin/service-rates/route.ts`**
   - GET: Liste des prestations
   - POST: Créer une prestation

2. **`apps/web/src/app/api/admin/service-rates/[id]/route.ts`**
   - PATCH: Modifier une prestation
   - DELETE: Supprimer une prestation

3. **`apps/web/src/app/api/admin/service-rates/import/route.ts`**
   - POST: Importer un CSV

### Frontend

4. **`apps/web/src/app/admin/service-rates/page.tsx`**
   - Page de gestion des prestations

### Base de Données

5. **`apps/web/prisma/schema.prisma`**
   - Modèle `ServiceRate` ajouté

---

## 🚀 Prochaines Étapes

### Phase 1: Base (✅ Fait)
- ✅ Modèle Prisma
- ✅ Routes API (CRUD)
- ✅ Page de gestion
- ✅ Import/Export CSV
- ✅ Lien dans le menu

### Phase 2: Intégration Tickets (À faire)
- [ ] Ajouter sélecteur de prestations dans les tickets
- [ ] Pré-remplir durée et prix depuis la grille
- [ ] Permettre saisie manuelle
- [ ] Calculer automatiquement le total

### Phase 3: Dashboard (À faire)
- [ ] Widget "Dernière mise à jour grille tarifaire"
- [ ] Alerte si > 6 mois sans mise à jour
- [ ] Statistiques: prestations les plus utilisées

### Phase 4: Avancé (À faire)
- [ ] Historique des prix (évolution dans le temps)
- [ ] Tarifs différenciés par client (pro/particulier)
- [ ] Forfaits (pack de prestations)
- [ ] Suggestions automatiques selon le vélo

---

## ⚠️ Points d'Attention

### 1. Migration Prisma Requise

**Avant d'utiliser**, exécuter:
```powershell
cd apps\web
npx prisma db push
npx prisma generate
```

### 2. Format CSV

- Encodage: **UTF-8**
- Séparateur: **Virgule (,)**
- Guillemets: Optionnels (sauf si virgule dans le texte)

### 3. Tarifs HT

Tous les tarifs sont **Hors Taxes**.  
La TVA (10% ou 20%) est appliquée automatiquement selon le statut (AE ou non).

### 4. Durées

Les durées sont en **minutes**.  
Utilisées pour calculer le coût de la main d'œuvre (durée × taux horaire).

---

## 🧪 Tests

### Test 1: Créer une Prestation

```
1. Aller sur /admin/service-rates
2. Cliquer "Nouvelle prestation"
3. Remplir:
   - Nom: "Test Révision"
   - Tarif: 50.00
   - Type: VTT
   - Catégorie: Entretien
   - Durée: 60
4. Créer
5. Vérifier: Apparaît dans la liste ✓
```

### Test 2: Import CSV

```
1. Créer un fichier test.csv:
   prestation,tarif,type_velo,categorie,duree,description
   Test Import,25.00,Route,Réparation,30,Test d'import
2. Importer le fichier
3. Vérifier: "1 prestation(s) importée(s)" ✓
4. Vérifier: Apparaît dans la liste ✓
```

### Test 3: Export CSV

```
1. Cliquer "Exporter CSV"
2. Ouvrir le fichier téléchargé
3. Vérifier: Toutes les prestations présentes ✓
4. Vérifier: Format correct ✓
```

---

## 📚 Ressources

- **Prisma Docs**: https://www.prisma.io/docs
- **CSV Format**: https://fr.wikipedia.org/wiki/Comma-separated_values
- **Material-UI**: https://mui.com/

---

**La gestion des tarifs est maintenant centralisée !** 🎉

---

© 2024-2025 Jérôme Leyssard - Upgraded Bikes - Tous droits réservés
