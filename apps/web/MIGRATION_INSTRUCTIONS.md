# 🔄 Migration Base de Données - Informations Légales

## Nouveaux champs ajoutés au modèle `AppSetting`

Les champs suivants ont été ajoutés pour stocker les informations légales de l'atelier :

- `siret` - SIRET (14 chiffres)
- `tva` - N° TVA Intracommunautaire
- `rcs` - Registre du Commerce et des Sociétés
- `capital` - Capital social
- `insurance` - Assurance RC Professionnelle

## 📋 Instructions de migration

### 1. Générer la migration Prisma

```bash
cd apps/web
npx prisma migrate dev --name add_legal_info_to_app_settings
```

### 2. Appliquer la migration

La commande ci-dessus appliquera automatiquement la migration en développement.

Pour la production :
```bash
npx prisma migrate deploy
```

### 3. Régénérer le client Prisma

```bash
npx prisma generate
```

### 4. Redémarrer le serveur

```bash
npm run dev
```

## ✅ Vérification

1. Allez sur `/settings`
2. Vous devriez voir les nouveaux champs dans la section "Informations légales"
3. Remplissez les champs et enregistrez
4. Exportez un PDF depuis une facture
5. Vérifiez que les informations légales apparaissent correctement

## 🔄 Ordre de priorité des données

Les PDF utilisent maintenant les données dans cet ordre :
1. **Profil utilisateur** (table `AppSetting`)
2. Variables d'environnement (`.env.local`)
3. Valeurs par défaut (fallback)

## 📝 Note

Les erreurs TypeScript disparaîtront après avoir exécuté `npx prisma generate` qui régénérera les types TypeScript avec les nouveaux champs.
