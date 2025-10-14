# Démarrage Rapide - Atelier Vélo+

**Date**: 14 octobre 2025  
**Version**: 1.0.0

---

## 🚀 Première Utilisation

### 1. Initialiser la Base de Données

**Si vous venez de reset Prisma**, la base est vide. Il faut créer un utilisateur:

```powershell
cd apps\web
npx prisma db seed
```

**Résultat**:
- ✅ Utilisateur admin créé: `admin@test.fr` / `Admin123!@#`
- ✅ Quelques articles de catalogue
- ✅ Séquence de facturation initialisée

---

### 2. Configurer "Mon Compte"

**Important**: Sans configuration, le PDF utilisera des valeurs par défaut.

1. Démarrer l'application: `npm run dev`
2. Se connecter: `admin@test.fr` / `Admin123!@#`
3. Menu → **"Mon compte"**
4. Remplir **toutes** les informations:

#### Informations Obligatoires
- ✅ **Nom de l'atelier**: Ex: "Upgraded Bikes"
- ✅ **Adresse**: Ex: "17 Rue Danton"
- ✅ **Code postal**: Ex: "84000"
- ✅ **Ville**: Ex: "Avignon"
- ✅ **Téléphone**: Ex: "04 90 XX XX XX"
- ✅ **Email**: Ex: "contact@upgradedbikes.com"

#### Informations Optionnelles
- SIRET: Ex: "123 456 789 00012"
- N° TVA: Ex: "FR12345678901"
- RCS: Ex: "Avignon B 123 456 789"
- Capital social: Ex: "10 000 €"
- Assurance RC Pro: Ex: "AXA n° 123456"

#### Statut Fiscal
- ☑️ **Auto-entrepreneur**: Cocher si vous êtes en franchise de TVA
  - → TVA sera à 0% sur tous les devis/factures
  - → Mention légale automatique: "TVA non applicable, art. 293 B du CGI"

5. Cliquer **"Enregistrer"**

---

### 3. Ajouter un Logo (Optionnel)

**Pour un rendu professionnel**:

1. Créer un logo au format PNG ou JPG
2. Taille recommandée: **200x200px maximum**
3. Placer le fichier dans: `apps\web\public\logo.png`
4. Redémarrer l'application

**Le logo apparaîtra automatiquement** sur tous les PDF (devis, factures, avoirs).

---

## 📋 Créer Votre Premier Devis

### Étape 1: Créer un Client

1. Menu → **"Clients"**
2. Cliquer **"Nouveau client"**
3. Remplir:
   - Prénom
   - Nom
   - Email (optionnel)
   - Téléphone (optionnel)
   - Adresse complète (recommandé pour les PDF)
4. Enregistrer

### Étape 2: Créer un Ticket

1. Menu → **"Tickets"**
2. Cliquer **"Nouveau ticket"**
3. Sélectionner le client
4. Ajouter un vélo (si nouveau client)
5. Décrire le problème

### Étape 3: Estimer le Temps

1. Ouvrir le ticket
2. Section **"Estimation temps"**
3. Remplir:
   - **Durée estimée**: Ex: 120 minutes
   - **Taux horaire**: Ex: 45 €/h
4. Cliquer **"Enregistrer estimation"**

**Calcul automatique**: 120 min × 45 €/h = 90 € HT

### Étape 4: Ajouter des Pièces (Optionnel)

1. Section **"Pièces"**
2. Cliquer **"Ajouter une pièce"**
3. Sélectionner dans le catalogue ou créer
4. Quantité
5. Enregistrer

### Étape 5: Générer le Devis PDF

1. Cliquer **"Télécharger PDF"**
2. Le PDF s'ouvre dans un nouvel onglet
3. Vérifier:
   - ✅ Coordonnées de l'atelier
   - ✅ Coordonnées du client
   - ✅ Lignes (MO + pièces)
   - ✅ Totaux corrects
   - ✅ TVA selon votre statut

---

## 🔧 Taux de TVA

### Si Vous N'êtes PAS Auto-Entrepreneur

**Main d'œuvre**: 10% (TVA réduite)  
**Pièces**: 20% (TVA normale)

**Exemple**:
```
Main d'œuvre: 90,00 € HT
  TVA 10%: 9,00 €
  TTC: 99,00 €

Chambre à air: 12,00 € HT
  TVA 20%: 2,40 €
  TTC: 14,40 €

TOTAL:
  HT: 102,00 €
  TVA: 11,40 €
  TTC: 113,40 €
```

### Si Vous Êtes Auto-Entrepreneur

**Main d'œuvre**: 0% (franchise en base)  
**Pièces**: 0% (franchise en base)

**Exemple**:
```
Main d'œuvre: 90,00 € HT
  TVA 0%: 0,00 €
  TTC: 90,00 €

Chambre à air: 12,00 € HT
  TVA 0%: 0,00 €
  TTC: 12,00 €

TOTAL:
  HT: 102,00 €
  TVA: 0,00 €
  TTC: 102,00 € (HT = TTC)
```

**Mention sur le PDF**: "TVA non applicable, art. 293 B du CGI"

---

## ⚠️ Problèmes Courants

### Erreur "no_user_in_database"

**Cause**: La base de données n'a pas d'utilisateur

**Solution**:
```powershell
cd apps\web
npx prisma db seed
```

**Identifiants**: `admin@test.fr` / `Admin123!@#`

### Erreur "invalid_credentials" avec admin@test.fr

**Cause**: Mot de passe incorrect ou ne respecte pas les critères

**Critères du mot de passe**:
- Minimum 10 caractères
- Au moins 3 des 4 classes: majuscules, minuscules, chiffres, caractères spéciaux

**Solution**: Utiliser `Admin123!@#` (respecte tous les critères)

### PDF avec Totaux à 0€

**Cause**: Pas d'estimation de temps ou de pièces

**Solution**:
1. Ouvrir le ticket
2. Ajouter une estimation de temps
3. Enregistrer
4. Télécharger à nouveau le PDF

### Coordonnées Par Défaut sur le PDF

**Cause**: "Mon compte" pas rempli

**Solution**:
1. Menu → "Mon compte"
2. Remplir toutes les coordonnées
3. Enregistrer
4. Télécharger à nouveau le PDF

### Logo Trop Gros

**Cause**: Logo > 200x200px

**Solution**:
1. Redimensionner le logo à 200x200px max
2. Remplacer `apps\web\public\logo.png`
3. Redémarrer l'application

---

## 📊 Workflow Complet

```
1. CRÉER CLIENT
   ↓
2. CRÉER TICKET
   ↓
3. AJOUTER VÉLO (si nouveau)
   ↓
4. ESTIMER TEMPS
   ↓
5. AJOUTER PIÈCES (si besoin)
   ↓
6. TÉLÉCHARGER PDF DEVIS
   ↓
7. ENVOYER AU CLIENT
   ↓
8. CLIENT ACCEPTE
   ↓
9. CRÉER VENTE/FACTURE
   ↓
10. ENCAISSER PAIEMENT
```

---

## 🎯 Checklist Avant Premier Devis

- [ ] Base de données initialisée (`npx prisma db seed`)
- [ ] "Mon compte" rempli (nom, adresse, tél, email)
- [ ] Statut fiscal configuré (AE ou non)
- [ ] Logo ajouté (optionnel)
- [ ] Client créé
- [ ] Ticket créé
- [ ] Estimation temps enregistrée
- [ ] PDF téléchargé et vérifié

---

## 📚 Documentation Complète

- **`AUDIT_COMPLET.md`** - Audit de la structure
- **`ANALYSE_CONFIGURATION.md`** - Analyse des fichiers de config
- **`TVA_REPARATION_VELO.md`** - Guide TVA complet
- **`FIX_PDF_DEVIS.md`** - Corrections PDF appliquées
- **`HISTORIQUE_VELOS_GUIDE.md`** - Guide historique vélos

---

## 🆘 Support

**En cas de problème**:
1. Vérifier les logs dans la console
2. Consulter la documentation
3. Vérifier que la base est initialisée
4. Vérifier que "Mon compte" est rempli

---

**Bon démarrage avec Atelier Vélo+ !** 🚴‍♂️🔧

---

© 2024-2025 Jérôme Leyssard - Upgraded Bikes - Tous droits réservés
