# 📧 Guide Configuration Templates HubSpot

## 🎯 Objectif

Créer des templates visuels dans HubSpot pour personnaliser les emails automatiques.

---

## ⚠️ Important

**Les templates HubSpot sont OPTIONNELS !**

✅ **L'application fonctionne déjà sans templates** grâce aux templates HTML intégrés dans le code.

Les templates HubSpot permettent de :
- 🎨 Personnaliser le design via l'éditeur visuel
- 📊 Meilleur tracking et analytics
- 🔄 Modifier les emails sans toucher au code

---

## 📋 Étapes de Configuration

### 1. Connexion à HubSpot

1. Aller sur https://app.hubspot.com/
2. Se connecter avec ton compte
3. Aller dans **Marketing** > **Email** > **Templates**

---

### 2. Créer Template "Facture"

#### Étape 1 : Nouveau Template
1. Cliquer sur **Create template**
2. Choisir **Drag and drop**
3. Nommer : `Facture - Atelier Vélo+`

#### Étape 2 : Design du Template
Utilise cet exemple de structure :

```
┌─────────────────────────────────┐
│  [HEADER - Vert #81C784]        │
│  💰 Votre facture est prête     │
└─────────────────────────────────┘
│                                 │
│  Bonjour {{contact.firstname}}, │
│                                 │
│  Merci pour votre confiance !   │
│                                 │
│  ┌───────────────────────────┐  │
│  │ Numéro : {{invoice_number}}│  │
│  │ Montant : {{total_ttc}} €  │  │
│  │ Date : {{invoice_date}}    │  │
│  └───────────────────────────┘  │
│                                 │
│  Le PDF est joint à cet email.  │
│                                 │
│  Cordialement,                  │
│  {{shop_name}}                  │
│                                 │
└─────────────────────────────────┘
```

#### Étape 3 : Variables Personnalisées
Ajouter ces propriétés personnalisées :
- `invoice_number` - Numéro de facture
- `total_ttc` - Montant TTC
- `invoice_date` - Date d'émission
- `shop_name` - Nom de l'atelier

#### Étape 4 : Récupérer l'ID
1. Sauvegarder le template
2. Copier l'ID du template (dans l'URL ou les paramètres)
3. Ajouter dans `.env` : `HUBSPOT_EMAIL_ID=123456789`

---

### 3. Créer Template "Confirmation RDV"

#### Étape 1 : Nouveau Template
1. Cliquer sur **Create template**
2. Choisir **Drag and drop**
3. Nommer : `Confirmation RDV - Atelier Vélo+`

#### Étape 2 : Design du Template
Utilise cet exemple :

```
┌─────────────────────────────────┐
│  [HEADER - Cyan #26C6DA]        │
│  📅 Rendez-vous confirmé !      │
└─────────────────────────────────┘
│                                 │
│  Bonjour {{contact.firstname}}, │
│                                 │
│  Votre RDV est confirmé !       │
│                                 │
│  ┌───────────────────────────┐  │
│  │ 📆 Date : {{booking_date}} │  │
│  │ 🕗 Heure : {{booking_time}}│  │
│  │ 🚲 Vélo : {{bike_model}}   │  │
│  └───────────────────────────┘  │
│                                 │
│  📍 Adresse de l'atelier :      │
│  {{shop_address}}               │
│  {{shop_city}}                  │
│  📞 {{shop_phone}}              │
│                                 │
│  À très bientôt !               │
│  {{shop_name}}                  │
│                                 │
└─────────────────────────────────┘
```

#### Étape 3 : Variables Personnalisées
- `booking_date` - Date du RDV
- `booking_time` - Heure du RDV
- `bike_model` - Modèle du vélo
- `shop_address` - Adresse
- `shop_city` - Ville
- `shop_phone` - Téléphone
- `shop_name` - Nom

---

## 🎨 Conseils de Design

### Couleurs Thématiques
- **Factures** : Vert #81C784
- **RDV** : Cyan #26C6DA
- **Devis** : Violet #BA68C8
- **Tickets** : Bleu #64B5F6

### Structure Recommandée
1. **Header coloré** avec emoji et titre
2. **Corps blanc** avec texte noir
3. **Bloc d'information** avec bordure colorée
4. **Footer gris** avec mentions légales

### Emojis Utiles
- 💰 Facture
- 📅 Rendez-vous
- 📋 Devis
- 🔧 Réparation
- 🚲 Vélo
- 📍 Adresse
- 📞 Téléphone
- 📧 Email

---

## 🔧 Configuration dans le Code

### Option 1 : Avec Template HubSpot (Recommandé)

**Avantages** :
- Design visuel personnalisable
- Meilleur tracking
- Modifications sans code

**Configuration** :
```env
HUBSPOT_EMAIL_ID=123456789  # ID du template
```

### Option 2 : Sans Template (Actuel)

**Avantages** :
- Fonctionne immédiatement
- Pas de configuration HubSpot
- Templates HTML intégrés

**Configuration** :
```env
HUBSPOT_EMAIL_ID=  # Laisser vide
```

---

## 📊 Tracking et Analytics

Une fois les templates configurés, tu pourras voir dans HubSpot :

### Métriques Disponibles
- 📧 **Emails envoyés** - Nombre total
- 👀 **Taux d'ouverture** - % de clients qui ouvrent
- 🖱️ **Taux de clic** - % de clics sur liens
- 📱 **Devices** - Desktop vs Mobile
- 🕐 **Meilleurs horaires** - Quand les clients ouvrent

### Rapports Utiles
1. **Dashboard Email** - Vue d'ensemble
2. **Par Contact** - Historique par client
3. **Par Template** - Performance par type d'email
4. **Tendances** - Évolution dans le temps

---

## 🚀 Automatisations Avancées (Optionnel)

### Workflow 1 : Relance Facture Impayée
```
Déclencheur : Facture émise + 7 jours
Condition : Statut = "issued" (non payée)
Action : Envoyer email de relance
```

### Workflow 2 : Rappel RDV
```
Déclencheur : RDV dans 24h
Action : Envoyer SMS + Email de rappel
```

### Workflow 3 : Satisfaction Client
```
Déclencheur : Ticket clôturé
Délai : +2 jours
Action : Envoyer email satisfaction
```

---

## 📞 Support HubSpot

### Documentation
- Templates Email : https://knowledge.hubspot.com/email/create-marketing-emails
- Variables : https://knowledge.hubspot.com/email/use-personalization-tokens
- Workflows : https://knowledge.hubspot.com/workflows/create-workflows

### Support
- Chat : Disponible dans l'app HubSpot
- Email : support@hubspot.com
- Téléphone : Selon ton plan

---

## ✅ Checklist

### Configuration Minimale (Fonctionnel)
- [x] HUBSPOT_ACCESS_TOKEN configuré
- [x] HUBSPOT_FROM_EMAIL configuré
- [x] Templates HTML intégrés dans le code
- [ ] HUBSPOT_EMAIL_ID (optionnel)

### Configuration Complète (Recommandé)
- [ ] Template "Facture" créé dans HubSpot
- [ ] Template "Confirmation RDV" créé
- [ ] HUBSPOT_EMAIL_ID configuré
- [ ] Workflows de relance configurés
- [ ] SMS activé pour rappels

---

## 🎁 Templates Prêts à l'Emploi

### Template Facture (Code HTML)
Déjà intégré dans `/lib/email.ts` :
- ✅ Header vert
- ✅ Informations facture
- ✅ Support pièce jointe PDF
- ✅ Footer professionnel

### Template Confirmation RDV (Code HTML)
Déjà intégré dans `/lib/email-templates.ts` :
- ✅ Header cyan
- ✅ Détails du RDV
- ✅ Adresse de l'atelier
- ✅ Conseils pratiques

---

## 🎯 Prochaines Étapes

1. **Tester les emails actuels** (fonctionnent sans templates HubSpot)
2. **Créer templates HubSpot** si tu veux personnaliser le design
3. **Configurer workflows** pour automatisations avancées
4. **Activer SMS** pour rappels RDV

---

**💡 Rappel** : Les templates HubSpot sont optionnels. L'application fonctionne déjà avec les templates HTML intégrés !
