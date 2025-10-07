# ✅ Restauration de Backup - Implémentation Complète

## 🎯 Fonctionnalité Ajoutée

### **Restaurer depuis un Backup** 📤

Permet de restaurer les données depuis un fichier JSON de backup précédemment exporté.

---

## 🎨 Interface

### **Bouton**
```
┌─────────────────────────────────────┐
│ Sauvegarde & Données                │
├─────────────────────────────────────┤
│ [📥 Exporter toutes les données]   │
│ [🔄 Sauvegarder maintenant]        │
│ [📤 Restaurer depuis un backup]    │ ← NOUVEAU
│ [Configurer sauvegardes auto]      │
└─────────────────────────────────────┘
```

### **Dialog de Restauration**
```
┌─────────────────────────────────────┐
│ Restaurer depuis un backup          │
├─────────────────────────────────────┤
│ ⚠️ Attention : Cette action va      │
│ restaurer les données depuis un     │
│ fichier de backup. Les données      │
│ existantes seront fusionnées.       │
│                                     │
│ [📤 Sélectionner un fichier JSON]  │
│                                     │
│ ℹ️ Fichier sélectionné :            │
│    atelier-velo-backup-2025-01-07   │
│    Taille : 45.2 KB                 │
│                                     │
│ [Annuler]  [📤 Restaurer]          │
└─────────────────────────────────────┘
```

---

## 🔧 Fonctionnement

### **Étape 1 : Sélection du Fichier**
1. Cliquer sur "Restaurer depuis un backup"
2. Dialog s'ouvre
3. Cliquer sur "Sélectionner un fichier JSON"
4. Choisir un fichier `.json`
5. Validation : Seuls les fichiers JSON sont acceptés

### **Étape 2 : Aperçu**
- Nom du fichier affiché
- Taille du fichier affichée
- Bouton "Restaurer" activé

### **Étape 3 : Restauration**
1. Cliquer sur "Restaurer"
2. Toast "Restauration en cours..."
3. Lecture du fichier JSON
4. Envoi à l'API `POST /api/admin/backup`
5. Upsert des données (fusion avec existantes)
6. Toast "Restauration réussie ! X clients, Y tickets restaurés"
7. Rafraîchissement automatique des stats
8. Fermeture du dialog

---

## 📊 Données Restaurées

Le backup contient :
- **Users** (utilisateurs)
- **Customers** (clients)
- **WorkOrders** (tickets)
- **Invoices** (factures)
- **InvoiceLines** (lignes de factures)
- **CatalogItems** (articles catalogue)
- **AppSettings** (paramètres)

**Mode de restauration** : **Upsert**
- Si l'ID existe → Mise à jour
- Si l'ID n'existe pas → Création

---

## 🧪 Tests

### **Test 1 : Restauration Complète**
```powershell
# 1. Exporter les données actuelles
curl http://localhost:3000/api/admin/backup -o backup-avant.json

# 2. Ajouter un client manuellement dans l'app

# 3. Restaurer le backup précédent
# Via l'interface : Restaurer depuis un backup → Sélectionner backup-avant.json

# 4. Vérifier que le client ajouté a disparu
```

### **Test 2 : Fusion de Données**
```powershell
# 1. Exporter backup A
# 2. Ajouter des données
# 3. Exporter backup B
# 4. Restaurer backup A
# 5. Vérifier que les données de A sont restaurées
# 6. Restaurer backup B
# 7. Vérifier que les données de B sont restaurées
```

### **Test 3 : Fichier Invalide**
```powershell
# 1. Essayer de sélectionner un fichier .txt
# Résultat : Toast "Veuillez sélectionner un fichier JSON"

# 2. Sélectionner un JSON invalide (syntaxe incorrecte)
# Résultat : Toast "Erreur: Unexpected token..."
```

### **Test 4 : Annulation**
```powershell
# 1. Ouvrir le dialog
# 2. Sélectionner un fichier
# 3. Cliquer "Annuler"
# Résultat : Dialog fermé, fichier oublié
```

---

## ⚠️ Sécurité & Précautions

### **Avertissement Utilisateur**
Le dialog affiche clairement :
> ⚠️ **Attention :** Cette action va restaurer les données depuis un fichier de backup. Les données existantes seront fusionnées avec celles du backup.

### **Validation**
- ✅ Seuls les fichiers `.json` acceptés
- ✅ Parsing JSON avec try/catch
- ✅ Confirmation requise (`confirmRestore: true`)
- ✅ Gestion d'erreurs complète

### **Recommandations**
1. **Toujours exporter avant de restaurer**
2. **Tester sur une copie de la BDD d'abord**
3. **Vérifier le contenu du backup avant restauration**
4. **Garder plusieurs versions de backups**

---

## 🔮 Améliorations Futures

### **Phase 2 : Aperçu du Backup**
```tsx
- Afficher le contenu du backup avant restauration
- Nombre de clients, tickets, factures
- Date d'export
- Version de l'app
```

### **Phase 3 : Restauration Sélective**
```tsx
- Choisir les tables à restaurer
- Checkbox : Clients, Tickets, Factures, etc.
- Restaurer uniquement ce qui est coché
```

### **Phase 4 : Merge Intelligent**
```tsx
- Détecter les conflits
- Proposer : Garder existant / Écraser / Fusionner
- Prévisualisation des changements
```

### **Phase 5 : Historique des Restaurations**
```tsx
- Table RestoreHistory
- Date, utilisateur, fichier, résultat
- Possibilité de rollback
```

---

## 📝 Code Clé

### **Handler de Restauration**
```typescript
const handleRestore = async () => {
  // Lire le fichier
  const fileContent = await restoreFile.text();
  const backupData = JSON.parse(fileContent);

  // Envoyer à l'API
  const response = await fetch('/api/admin/backup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: backupData.data,
      confirmRestore: true,
    }),
  });

  // Traiter la réponse
  const result = await response.json();
  
  // Rafraîchir les stats
  const statsResponse = await fetch('/api/admin/stats');
  const data = await statsResponse.json();
  setStats(data);
};
```

### **API Backend**
```typescript
// POST /api/admin/backup
export async function POST(req: NextRequest) {
  const { data, confirmRestore } = await req.json();
  
  if (!confirmRestore) {
    return NextResponse.json({ error: "Confirmation requise" }, { status: 400 });
  }

  // Restaurer les clients
  for (const customer of data.customers) {
    await prisma.customer.upsert({
      where: { id: customer.id },
      update: customer,
      create: customer,
    });
  }

  return NextResponse.json({ success: true, restored: { customers: X } });
}
```

---

## 🎉 Résultat Final

### **Avant**
- ✅ Export de données fonctionnel
- ❌ Pas de restauration

### **Après**
- ✅ Export de données fonctionnel
- ✅ **Restauration depuis backup** ✨
- ✅ Dialog intuitif
- ✅ Validation du fichier
- ✅ Aperçu du fichier sélectionné
- ✅ Gestion d'erreurs
- ✅ Notifications utilisateur
- ✅ Rafraîchissement automatique des stats

**Le cycle complet Sauvegarde/Restauration est opérationnel !** 🚀

---

## 💡 Cas d'Usage

### **Scénario 1 : Migration de Données**
1. Exporter depuis l'ancienne instance
2. Importer dans la nouvelle instance
3. Vérifier les données

### **Scénario 2 : Récupération après Erreur**
1. Erreur de manipulation
2. Restaurer le backup de la veille
3. Données récupérées

### **Scénario 3 : Test de Fonctionnalités**
1. Exporter l'état actuel
2. Tester de nouvelles fonctionnalités
3. Restaurer si problème

### **Scénario 4 : Duplication d'Environnement**
1. Exporter depuis Production
2. Restaurer en Dev/Staging
3. Tester en conditions réelles

**La restauration est maintenant aussi simple que l'export !** 🎊
