# 🔧 PLAN DE CORRECTIONS TYPESCRIPT - PHASE 1
## Approche Méthodique et Progressive

**Date** : 28 novembre 2025  
**Stratégie** : Correction fichier par fichier avec vérifications et commits fréquents  
**Principe** : Pas de corrections en masse - Analyse approfondie avant chaque modification

---

## 📊 ANALYSE INITIALE

### Erreurs TypeScript Détectées

- **Total** : ~199 erreurs (266 lignes d'erreur)
- **TS2345** (Argument type not assignable) : 167 erreurs
  - Pattern principal : `logger.error/info/warn(message, string|Error)` au lieu de `logger.error(message, LogMeta)`

### Patterns d'Erreurs Identifiés

1. **Logger avec string** : `logger.info('msg', stringValue)` 
   - ✅ Correction : `logger.info('msg', { value: stringValue })`

2. **Logger avec Error** : `logger.error('msg', errorObject)`
   - ✅ Correction : `logger.error('msg', { error: errorObject.message, stack: errorObject.stack })`

3. **Logger avec number** : `logger.info('msg', numberValue)`
   - ✅ Correction : `logger.info('msg', { value: numberValue })`

4. **Logger avec array** : `logger.info('msg', arrayValue)`
   - ✅ Correction : `logger.info('msg', { items: arrayValue })`

---

## 🎯 STRATÉGIE DE CORRECTION

### Principe : Un Fichier à la Fois

**Workflow pour chaque fichier** :
1. ✅ **Analyser** : Lire le fichier et comprendre le contexte
2. ✅ **Comprendre** : Identifier le type de chaque erreur
3. ✅ **Corriger** : Appliquer correction appropriée
4. ✅ **Vérifier** : Typecheck + Tests
5. ✅ **Commit** : Si validation OK

### Priorisation

**LOT 1 : Fichiers avec 1-2 erreurs (Rapides)**
- `src/app/account/components/SimpleBookingSection.tsx` (2 erreurs)
- `src/app/api/admin/jobs/daily/route.ts` (1 erreur)
- `src/app/api/admin/recent-emails/route.ts` (1 erreur)
- `src/app/api/admin/test-email/route.ts` (1 erreur)
- `src/app/api/calendar/bookings/[id]/route.ts` (1 erreur)

**LOT 2 : Fichiers avec 3-6 erreurs (Moyens)**
- `src/app/account/page.tsx` (6 erreurs)
- `src/app/api/calendar/bookings/route.ts` (2 erreurs)
- `src/app/api/catalog/import-catalogsnap/route.ts` (6 erreurs)

**LOT 3 : Fichiers complexes (Après validation méthode)**
- Fichiers avec >6 erreurs
- Fichiers avec erreurs mixtes (logger + autres)

---

## 📋 LOT 1 : CORRECTIONS RAPIDES (2-5 fichiers)

### Fichier 1 : `src/app/account/components/SimpleBookingSection.tsx`

**Erreurs détectées** :
- Ligne 114: `logger.error('[BOOKING] Erreur activation:', message);` → `message` est string
- Ligne 152: `logger.error('[BOOKING] Erreur désactivation:', message);` → `message` est string

**Correction à appliquer** :
```typescript
// ❌ AVANT
logger.error('[BOOKING] Erreur activation:', message);

// ✅ APRÈS
logger.error('[BOOKING] Erreur activation:', { error: message });
```

**Vérification** :
- [ ] Typecheck passe pour ce fichier
- [ ] Aucune régression détectée
- [ ] Commit avec message clair

---

### Fichier 2 : `src/app/api/admin/jobs/daily/route.ts`

**À analyser** : Lire le fichier ligne 27 pour comprendre le contexte

**Workflow** :
1. Lire fichier complet
2. Identifier l'erreur exacte
3. Corriger
4. Vérifier
5. Commit

---

## ✅ CHECKLIST DE VALIDATION

Pour chaque fichier corrigé :

- [ ] `npm run typecheck` → 0 nouvelle erreur pour ce fichier
- [ ] `npm test` → Tests passent toujours
- [ ] Relire code corrigé pour cohérence
- [ ] Commit avec message descriptif

---

## 📝 MESSAGES DE COMMIT

Format : `fix(scope): Description correction TypeScript`

Exemples :
- `fix(logger): Corriger signatures logger dans SimpleBookingSection`
- `fix(logger): Corriger logger errors dans account/page.tsx`
- `fix(types): Corriger types logger dans API routes admin`

---

## 🚨 PRINCIPES DE SÉCURITÉ

1. ✅ **Ne jamais corriger en masse** : Un fichier à la fois
2. ✅ **Toujours analyser le contexte** : Comprendre avant de corriger
3. ✅ **Vérifier après chaque fichier** : Typecheck + Tests
4. ✅ **Commit fréquent** : Après chaque fichier validé
5. ✅ **Rollback facile** : Si problème, revert commit

---

**Statut** : 🔄 En cours  
**Prochaine étape** : Correction fichier 1 (SimpleBookingSection.tsx)

