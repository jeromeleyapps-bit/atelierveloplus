# 📄 Informations Atelier sur les PDF

## ✅ Système Déjà en Place

Le système pour afficher les informations de l'atelier sur les PDF **existe déjà** !

---

## 🎯 Comment ça Fonctionne

### 1. Génération PDF
**Fichier** : `src/lib/pdf-invoice.ts`

Le PDF affiche déjà :
- ✅ Logo de l'atelier (si disponible)
- ✅ Nom de l'atelier
- ✅ Adresse complète
- ✅ Téléphone
- ✅ Email
- ✅ SIRET
- ✅ N° TVA

### 2. Source des Données
**Fichier** : `src/app/api/finance/invoices/[id]/pdf/route.ts`

Les données proviennent de (par ordre de priorité) :
1. **`AppSetting`** (table) - Paramètres de l'utilisateur
2. **Variables d'environnement** - Fallback

```typescript
shopName: s.shopName || process.env.SHOP_NAME || 'Atelier Vélo+',
shopAddress: s.address1 || process.env.SHOP_ADDRESS1 || '',
shopZip: s.zip || process.env.SHOP_ZIP || '',
shopCity: s.city || process.env.SHOP_CITY || '',
shopPhone: s.shopPhone || process.env.SHOP_PHONE,
shopEmail: s.shopEmail || process.env.SHOP_EMAIL,
shopSiret: process.env.SHOP_SIRET,
shopTVA: process.env.SHOP_TVA,
```

---

## 📝 Table AppSetting

**Schéma Prisma** :
```prisma
model AppSetting {
  id          String   @id @default(cuid())
  userId      String   @unique
  shopName    String?
  shopEmail   String?
  shopPhone   String?
  address1    String?
  address2    String?
  zip         String?
  city        String?
  country     String?
  pdfPrimary  String? // hex color like #1976d2
  legalFooter String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

---

## 🔧 Configuration Requise

### Option 1: Via l'Interface (Recommandé)

Il faut **ajouter une section** dans la page Paramètres pour renseigner :
- Nom de l'atelier
- Adresse
- Code postal
- Ville
- Téléphone
- Email
- SIRET
- N° TVA
- Mention légale (pied de page)

### Option 2: Via Variables d'Environnement

Ajouter dans `.env.local` :
```env
SHOP_NAME="Atelier Vélo+"
SHOP_ADDRESS1="123 Rue de la République"
SHOP_ZIP="75001"
SHOP_CITY="Paris"
SHOP_PHONE="01 23 45 67 89"
SHOP_EMAIL="contact@atelier-velo.fr"
SHOP_SIRET="123 456 789 00012"
SHOP_TVA="FR12345678901"
LEGAL_FOOTER="Atelier Vélo+ - SIRET: 123 456 789 00012 - TVA: FR12345678901"
```

---

## 🎨 Aperçu PDF

```
┌─────────────────────────────────────────────┐
│ [LOGO]                         DEVIS        │
│ ATELIER VÉLO+                  N° DEV-001   │
│ 123 Rue de la République       05/10/2024   │
│ 75001 Paris                                 │
│ Tél: 01 23 45 67 89                        │
│ Email: contact@atelier-velo.fr             │
│ SIRET: 123 456 789 00012                   │
│ N° TVA: FR12345678901                      │
├─────────────────────────────────────────────┤
│ Client: Jean Dupont                         │
│ ...                                         │
└─────────────────────────────────────────────┘
```

---

## 💡 Solution Recommandée

### Ajouter Section "Informations Atelier" dans Paramètres

**Fichier à modifier** : `src/app/settings/page.tsx`

**Ajouter** :
1. États pour les champs
2. Chargement depuis API
3. Sauvegarde vers API
4. Interface utilisateur

**Exemple de section** :
```tsx
<SectionCard title="Informations de l'atelier">
  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
    Ces informations apparaîtront sur vos devis, factures et avoirs.
  </Typography>
  <Stack spacing={2}>
    <TextField
      label="Nom de l'atelier"
      value={shopName}
      onChange={(e) => setShopName(e.target.value)}
      size="small"
    />
    <TextField
      label="Adresse"
      value={address1}
      onChange={(e) => setAddress1(e.target.value)}
      size="small"
    />
    <Stack direction="row" spacing={2}>
      <TextField
        label="Code postal"
        value={zip}
        onChange={(e) => setZip(e.target.value)}
        size="small"
        sx={{ width: 150 }}
      />
      <TextField
        label="Ville"
        value={city}
        onChange={(e) => setCity(e.target.value)}
        size="small"
        sx={{ flex: 1 }}
      />
    </Stack>
    <TextField
      label="Téléphone"
      value={shopPhone}
      onChange={(e) => setShopPhone(e.target.value)}
      size="small"
    />
    <TextField
      label="Email"
      value={shopEmail}
      onChange={(e) => setShopEmail(e.target.value)}
      size="small"
    />
    <TextField
      label="SIRET"
      value={siret}
      onChange={(e) => setSiret(e.target.value)}
      size="small"
      helperText="Numéro SIRET de votre entreprise"
    />
    <TextField
      label="N° TVA Intracommunautaire"
      value={tva}
      onChange={(e) => setTva(e.target.value)}
      size="small"
      helperText="Ex: FR12345678901"
    />
    <TextField
      label="Mention légale (pied de page)"
      value={legalFooter}
      onChange={(e) => setLegalFooter(e.target.value)}
      multiline
      rows={2}
      size="small"
      helperText="Texte affiché en bas des documents"
    />
  </Stack>
</SectionCard>
```

---

## 🔌 API Nécessaire

### GET /api/account/settings
Récupère les paramètres de l'utilisateur

### PATCH /api/account/settings
Met à jour les paramètres de l'utilisateur

**Vérifier si ces routes existent** :
```bash
ls src/app/api/account/settings/
```

---

## ✅ Checklist

- [x] Système PDF en place
- [x] Champs dans la base de données
- [x] Logique de récupération
- [ ] **Interface utilisateur pour renseigner les infos**
- [ ] **API pour sauvegarder les infos**
- [ ] **Documentation utilisateur**

---

## 🎯 Prochaines Étapes

### 1. Vérifier l'API Settings
```bash
# Vérifier si l'API existe
ls src/app/api/account/settings/
```

### 2. Ajouter Section dans Paramètres
- Modifier `src/app/settings/page.tsx`
- Ajouter champs pour infos atelier
- Connecter à l'API

### 3. Tester
1. Renseigner les informations
2. Créer un devis
3. Exporter en PDF
4. Vérifier que les infos apparaissent

---

## 📋 Variables d'Environnement (Temporaire)

En attendant l'interface, vous pouvez utiliser les variables d'environnement :

**Créer/Modifier** `.env.local` :
```env
# Informations Atelier
SHOP_NAME="Votre Atelier"
SHOP_ADDRESS1="Votre adresse"
SHOP_ZIP="75001"
SHOP_CITY="Votre ville"
SHOP_PHONE="01 23 45 67 89"
SHOP_EMAIL="contact@votre-atelier.fr"
SHOP_SIRET="123 456 789 00012"
SHOP_TVA="FR12345678901"
LEGAL_FOOTER="Votre atelier - SIRET: XXX - TVA: XXX"

# Logo (optionnel)
SHOP_LOGO_URL="https://votre-site.fr/logo.png"
```

**Redémarrer l'application** :
```bash
npm run dev
```

---

**Le système existe déjà !** ✅  
**Il faut juste renseigner les informations !** 📝  
**Voulez-vous que j'ajoute l'interface dans les Paramètres ?** 🚀
