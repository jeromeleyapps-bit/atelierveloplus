# Erreurs Tests E2E - 25 novembre 2024

## 📊 Résumé

- **Tests totaux** : 18
- **Tests réussis** : 6 (33%)
- **Tests échoués** : 12 (67%)

---

## ✅ Tests Réussis (6)

1. ✅ **Authentication › should redirect to dashboard after successful login**
2. ✅ **Navigation › should navigate to dashboard**
3. ✅ **Navigation › should access admin settings**
4. ✅ **Customers › should search customers**
5. ✅ **Tickets › should display tickets page**
6. ✅ **Tickets › should filter tickets by status**

---

## ❌ Tests Échoués (12)

### Catégorie 1 : Problèmes d'authentification (5 tests)

#### 1. **auth.spec.ts:8** - should display login page
**Erreur** : `expect(page).toHaveURL(/\/auth\/login/)`
- **Reçu** : Redirection vers une autre page
- **Cause** : Navigation automatique ou middleware
- **Priorité** : 🟡 MOYENNE
- **Fix** : Ajuster l'attente de navigation

#### 2. **auth.spec.ts:14** - should show error with invalid credentials
**Erreur** : `expect(locator).toBeVisible()` - Element not found
- **Locator** : `getByText(/identifiants invalides/i)`
- **Cause** : Message d'erreur différent ou non affiché
- **Priorité** : 🟡 MOYENNE
- **Fix** : Vérifier le texte exact du message d'erreur

#### 3. **auth.spec.ts:42** - should logout successfully
**Erreur** : `Test timeout 30000ms exceeded`
- **Locator** : `getByRole('button', { name: /déconnexion|profil/i })`
- **Cause** : Bouton de déconnexion non trouvé
- **Priorité** : 🟡 MOYENNE
- **Fix** : Vérifier le nom/rôle du bouton de profil

#### 4-5. **customers.spec.ts:10** - Login failures (2 tests)
**Erreur** : `expect(page).toHaveURL(/\/dashboard/)`
- **Reçu** : `http://localhost:3000/auth/login`
- **Cause** : Login échoue dans le beforeEach
- **Priorité** : 🔴 HAUTE
- **Fix** : Utiliser un helper de login partagé avec retry

---

### Catégorie 2 : Problèmes de navigation (5 tests)

#### 6. **customers.spec.ts:49** - should display customer details
**Erreur** : `expect(page).toHaveURL(/\/customers\/[a-z0-9-]+/)`
- **Reçu** : `http://localhost:3000/customers`
- **Cause** : Clic sur ligne client ne navigue pas
- **Priorité** : 🟢 BASSE
- **Fix** : Ajuster le sélecteur de clic

#### 7. **navigation.spec.ts:19** - should navigate to tickets
**Erreur** : `expect(page).toHaveURL(/\/tickets/)`
- **Reçu** : `http://localhost:3000/dashboard`
- **Cause** : Lien "tickets" non trouvé ou incorrect
- **Priorité** : 🟡 MOYENNE
- **Fix** : Vérifier le texte exact du lien

#### 8. **navigation.spec.ts:28** - should navigate to customers
**Erreur** : `expect(page).toHaveURL(/\/customers/)`
- **Reçu** : `http://localhost:3000/dashboard`
- **Cause** : Lien "clients" non trouvé ou incorrect
- **Priorité** : 🟡 MOYENNE
- **Fix** : Vérifier le texte exact du lien

#### 9. **navigation.spec.ts:37** - should navigate to catalog
**Erreur** : `expect(page).toHaveURL(/\/catalog/)`
- **Reçu** : `http://localhost:3000/dashboard`
- **Cause** : Lien "catalogue" non trouvé
- **Priorité** : 🟡 MOYENNE
- **Fix** : Vérifier le texte exact du lien

#### 10. **navigation.spec.ts:48** - should navigate to finance
**Erreur** : `expect(page).toHaveURL(/\/finance/)`
- **Reçu** : `http://localhost:3000/dashboard`
- **Cause** : Lien "finance" non trouvé
- **Priorité** : 🟡 MOYENNE
- **Fix** : Vérifier le texte exact du lien

---

### Catégorie 3 : Problèmes de tickets (2 tests)

#### 11. **tickets.spec.ts:20** - should open create ticket dialog
**Erreur** : `expect(page).toHaveURL(/\/dashboard/)`
- **Reçu** : `http://localhost:3000/auth/login`
- **Cause** : Login échoue dans le beforeEach
- **Priorité** : 🔴 HAUTE
- **Fix** : Utiliser helper de login partagé

#### 12. **tickets.spec.ts:47** - should search tickets
**Erreur** : `expect(page).toHaveURL(/\/dashboard/)`
- **Reçu** : `http://localhost:3000/auth/login`
- **Cause** : Login échoue dans le beforeEach
- **Priorité** : 🔴 HAUTE
- **Fix** : Utiliser helper de login partagé

---

## 🔍 Analyse des Causes Racines

### 1. **Login Instable** (Priorité 🔴 HAUTE)
**Impact** : 5 tests échouent à cause du login
**Solution** :
- Créer un helper `loginAsAdmin()` robuste
- Ajouter retry logic
- Vérifier que le cookie de session est bien créé
- Attendre explicitement la redirection dashboard

### 2. **Sélecteurs de Navigation Incorrects** (Priorité 🟡 MOYENNE)
**Impact** : 5 tests de navigation échouent
**Solution** :
- Inspecter les liens réels dans l'interface
- Utiliser `data-testid` pour sélecteurs stables
- Ajouter des attentes explicites après clic

### 3. **Messages d'Erreur Non Trouvés** (Priorité 🟡 MOYENNE)
**Impact** : 2 tests d'authentification échouent
**Solution** :
- Vérifier le texte exact des messages d'erreur
- Utiliser des sélecteurs plus flexibles (role, testid)

---

## 📋 Plan de Correction

### Phase 1 : Stabiliser le Login (Priorité 🔴 HAUTE)
**Temps estimé** : 30 min
**Impact** : +5 tests passants (11/18 → 61%)

```typescript
// e2e/helpers/auth.ts
export async function loginAsAdmin(page: Page) {
  await page.goto('/auth/login');
  await page.getByLabel(/email|e-mail/i).fill('admin@atelier-velo.fr');
  await page.getByLabel(/mot de passe/i).fill('Admin123!');
  await page.getByRole('button', { name: /se connecter/i }).click();
  
  // Attendre explicitement la redirection
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  
  // Vérifier que le cookie est présent
  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find(c => c.name.includes('session'));
  if (!sessionCookie) {
    throw new Error('Session cookie not found after login');
  }
}
```

### Phase 2 : Corriger les Sélecteurs (Priorité 🟡 MOYENNE)
**Temps estimé** : 45 min
**Impact** : +5 tests passants (11/18 → 16/18 → 89%)

1. Inspecter l'interface réelle
2. Ajouter `data-testid` aux liens de navigation
3. Mettre à jour les sélecteurs dans les tests

### Phase 3 : Messages d'Erreur (Priorité 🟡 MOYENNE)
**Temps estimé** : 15 min
**Impact** : +2 tests passants (16/18 → 18/18 → 100%)

1. Vérifier le texte exact des messages
2. Utiliser des sélecteurs par rôle

---

## 🎯 Objectif Final

**Cible** : 18/18 tests E2E passants (100%)
**Temps total estimé** : 1h30
**Priorité globale** : 🟡 MOYENNE (après optimisations build)

---

## 💡 Recommandations

### Court terme
- ✅ Infrastructure E2E fonctionnelle
- ✅ 6 tests passants (33%)
- 🔄 Corrections à faire en Phase 2 du plan

### Moyen terme
- Ajouter `data-testid` aux éléments critiques
- Créer des helpers partagés (login, navigation)
- Augmenter la couverture E2E (finance, admin)

### Long terme
- Intégrer E2E dans CI/CD
- Tests E2E sur plusieurs navigateurs
- Tests E2E de régression automatiques

---

**Date** : 25 novembre 2024  
**Statut** : ✅ Infrastructure E2E opérationnelle, corrections mineures nécessaires  
**Priorité** : 🟡 MOYENNE (après optimisations build Sprint 1.3)

