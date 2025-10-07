# 📄 Améliorations des Documents PDF

## ✅ Modifications apportées

### **Structure générale améliorée**
- ✅ En-tête professionnel avec toutes les coordonnées
- ✅ Encadré pour le titre du document (FACTURE/DEVIS/AVOIR)
- ✅ Informations légales complètes (SIRET, TVA, RCS, Capital, Assurance)
- ✅ Mentions légales adaptées selon le type de document
- ✅ Mise en page aérée et professionnelle

### **Pour les FACTURES**
- ✅ Conditions de paiement détaillées
- ✅ Pénalités de retard (3x taux légal + 40€)
- ✅ Garantie légale de conformité (2 ans)
- ✅ Garantie réparations (3 mois pièces et main d'œuvre)
- ✅ Date d'échéance visible
- ✅ Détail des paiements partiels

### **Pour les DEVIS**
- ✅ Date de validité affichée en orange
- ✅ Mention "Bon pour accord" avec signature
- ✅ Conditions d'acceptation
- ✅ Garanties légales

### **Pour les AVOIRS**
- ✅ Référence à la facture d'origine (en rouge)
- ✅ Mention spécifique sur l'utilisation de l'avoir
- ✅ Conditions de remboursement

## 🔧 Configuration requise

### Variables d'environnement à configurer dans `.env.local` :

```env
# Informations de base
SHOP_NAME=Atelier Vélo+
SHOP_ADDRESS1=17 Rue Danton
SHOP_ZIP=84000
SHOP_CITY=Avignon
SHOP_PHONE=04 XX XX XX XX
SHOP_EMAIL=contact@atelier-velo.fr

# Informations légales (OBLIGATOIRES)
SHOP_SIRET=123 456 789 00012
SHOP_TVA=FR12345678901
SHOP_RCS=Avignon B 123 456 789
SHOP_CAPITAL=10 000 €
SHOP_INSURANCE=Allianz Police n° 123456789

# Logo (optionnel)
SHOP_LOGO_URL=https://votre-domaine.fr/logo.png
```

## 📋 Conformité légale

### Mentions obligatoires présentes :
- ✅ Raison sociale et adresse complète
- ✅ SIRET (14 chiffres)
- ✅ N° TVA intracommunautaire
- ✅ RCS (Registre du Commerce et des Sociétés)
- ✅ Capital social
- ✅ Assurance RC Professionnelle
- ✅ Conditions de paiement
- ✅ Pénalités de retard (article L441-6 du Code de commerce)
- ✅ Garanties légales (articles L217-4 et suivants du Code de la consommation)
- ✅ Mention TVA pour auto-entrepreneurs (article 293 B du CGI)

## 🧪 Test des modifications

1. **Redémarrer le serveur de développement** :
   ```bash
   npm run dev
   ```

2. **Tester un PDF** :
   - Aller sur une facture existante
   - Cliquer sur "Exporter PDF"
   - Vérifier que toutes les informations s'affichent correctement

3. **Tester les 3 types de documents** :
   - Facture : `/finance/invoices/[id]` → Export PDF
   - Devis : Créer un devis → Export PDF
   - Avoir : Créer un avoir → Export PDF

## 📝 Notes importantes

- Les valeurs par défaut sont des exemples, **remplacez-les par vos vraies informations**
- Le SIRET doit être au format : `XXX XXX XXX XXXXX` (14 chiffres)
- Le numéro de TVA intracommunautaire : `FRXX XXXXXXXXX`
- L'assurance RC Pro est obligatoire pour les professionnels

## 🎨 Personnalisation

Pour personnaliser davantage les PDF, modifiez :
- `apps/web/src/lib/pdf-invoice.ts` - Génération du PDF
- Couleurs : `primaryColor`, `textColor`, `grayColor`
- Polices : `StandardFonts.Helvetica`, `StandardFonts.HelveticaBold`
