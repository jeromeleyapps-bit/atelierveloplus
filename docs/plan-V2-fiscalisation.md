# Plan V2 — Fiscalisation & conformité légale d'Atelier Vélo+

> Document de référence technique. Objectif : rendre l'application **pleinement conforme**
> à la législation française pour pouvoir la vendre **sans réserve** aux sociétés et
> micro-entrepreneurs **assujettis à la TVA**, et anticiper la **facturation électronique 2026/2027**.
>
> Complète `docs/plan-certification-crm.md` (volet légal/business) par le **détail d'implémentation technique**.

---

## 0. Rappel stratégique (ne pas se bloquer)

- **Cible actuelle = micro-entreprises en franchise en base de TVA (art. 293 B CGI)** : **EXEMPTÉES** d'obligation de logiciel certifié. → On vend dès maintenant, le produit actuel suffit légalement.
- **Cible élargie = sociétés (EURL/SARL/SASU) + micro assujettis TVA vendant en B2C** : obligation d'un logiciel conforme « loi anti-fraude TVA » (art. 286 I 3° CGI), sous peine d'amende de 7 500 €.
- **Voie retenue** : **auto-attestation de l'éditeur** (gratuit) plutôt que NF525/LNE (3 000–6 000 €/an). Engage la responsabilité pénale de l'éditeur (45 000 € si fausse déclaration) → l'implémentation ISCA doit être **réelle et solide** avant signature.

Les 4 critères à garantir = **ISCA** : **I**naltérabilité, **S**écurisation, **C**onservation, **A**rchivage.

---

## 1. Inaltérabilité — verrouiller les documents émis

**Principe** : une fois une facture/devis/avoir passé de `draft` à `issued` (émis), il devient **immuable**. Aucune modification ni suppression possible. Toute correction = **avoir** (credit note) ou facture rectificative.

### État actuel
- Statut `issued` déjà présent sur `Invoice` (Prisma).
- Avoirs (`type: 'credit'`) déjà dans le schéma. ✅ brique existante.

### À implémenter
1. **Garde côté API** : sur toutes les routes de mutation de facture (`PATCH`, `DELETE`, ajout/édition/suppression de lignes), refuser (HTTP 409) si `invoice.status !== 'draft'`.
   - Routes concernées : `src/app/api/finance/invoices/[id]/route.ts`, `.../lines/*`, `.../[id]/*` (toutes celles qui écrivent).
2. **Garde côté DB (défense en profondeur)** : trigger SQLite `BEFORE UPDATE/DELETE` sur `Invoice` et `InvoiceLine` qui lève une erreur si l'enregistrement lié est `issued`/`paid`/`cancelled`.
3. **Numérotation séquentielle sans trou** : déjà via `invoice-number.ts` (`FAC-YYYY-NNNN`). Vérifier qu'aucune facture émise ne peut « sauter » ou réutiliser un numéro. La séquence ne doit jamais reculer.
4. **Annulation = avoir uniquement** : retirer/neutraliser toute action « supprimer une facture émise » de l'UI ; rediriger vers « créer un avoir ».

### Fichiers à toucher
- `src/app/api/finance/invoices/**` (gardes)
- `prisma/schema.prisma` + migration (triggers via `migration.sql` custom)
- `src/app/finance/invoices/[id]/page.tsx` (UI : masquer suppression sur émise)

---

## 2. Sécurisation — chaînage cryptographique des écritures

**Principe** : rendre **détectable** toute modification directe de la base (ex : ouverture de `atelier.db` avec un éditeur SQLite). Chaque facture émise porte une empreinte (hash) calculée sur ses données **+ le hash de la facture précédente** → toute altération brise la chaîne.

### Modèle de données (migration Prisma)
Ajouter sur `Invoice` :
```prisma
fiscalSignature   String?   // SHA-256 hex de cette écriture
fiscalPrevSignature String? // signature de l'écriture émise précédente
fiscalSignedAt    DateTime?
fiscalSequence    Int?      // n° d'ordre dans la chaîne fiscale (distinct du numéro de facture)
```

### Algorithme (au moment du passage en `issued`)
1. Récupérer la dernière facture émise (`fiscalSequence` max) → `prevSig` (ou chaîne fixe « GENESIS » si première).
2. Construire un **payload canonique stable** : `id | number | issueDate | customerId | pricingMode | subtotalHT | vatAmount | totalTTC | lignes(triées: type,desc,qty,unitPriceHT,vatRate) | prevSig`.
3. `fiscalSignature = SHA-256(payload)` (hex).
4. Persister `fiscalSignature`, `fiscalPrevSignature = prevSig`, `fiscalSequence = prev+1`, `fiscalSignedAt = now`.

> ⚠️ Le payload doit être **déterministe** (ordre des lignes fixe, format des nombres figé : 2 décimales, point décimal, pas de locale). Sinon la vérification échouera à tort.

### Signature renforcée (optionnel mais recommandé pour l'attestation)
Au lieu d'un simple SHA-256, signer le hash avec une **clé privée RSA embarquée** (HMAC ou RSA-SHA256). On a déjà la logique RSA côté licences (`license-generator`). Une clé dédiée « fiscale » serait générée et **masquée dans le build Electron** (jamais en clair côté client). Cela empêche un utilisateur de recalculer une chaîne valide après modification.

### Vérification d'intégrité
- Fonction `verifyFiscalChain()` : parcourt les factures émises par `fiscalSequence`, recalcule chaque hash, compare. Renvoie le 1er maillon rompu s'il y en a.
- Exposer dans **mode avancé** : bouton « Vérifier l'intégrité fiscale » (admin) + au démarrage (log).

### Fichiers
- `src/lib/fiscal-chain.ts` (nouveau : sign + verify)
- Route d'émission de facture (hook au passage `issued`)
- `prisma/schema.prisma` + migration

---

## 3. Conservation — clôtures périodiques (Z de caisse)

**Principe** : figer les cumuls à intervalles réguliers dans des enregistrements **scellés non modifiables**.

### Modèle (nouvelle table)
```prisma
model FiscalClosure {
  id             String   @id @default(cuid())
  type           String   // "daily" | "monthly" | "yearly"
  periodStart    DateTime
  periodEnd      DateTime
  invoiceCount   Int
  totalHT        Float
  totalVAT       Float
  totalTTC       Float
  firstSequence  Int?     // 1ère écriture fiscale de la période
  lastSequence   Int?     // dernière
  signature      String   // SHA-256 du contenu + signature de la clôture précédente
  prevSignature  String?
  createdAt      DateTime @default(now())
  @@unique([type, periodStart])
}
```

### Logique
- **Clôture journalière (Z)** : cumuls des ventes du jour, scellée. Déclenchable manuellement (bouton « Clôture du jour ») + automatique (cron déjà en place — `scheduler.ts`).
- **Mensuelle / annuelle** : agrègent les journalières.
- Chaînage des clôtures entre elles (comme les factures).
- Une clôture ne peut **jamais** être modifiée/supprimée (garde API + trigger DB).

### Fichiers
- `src/lib/fiscal-closure.ts`
- `src/app/api/finance/closures/**` (créer, lister)
- `src/app/admin/...` UI clôtures (mode avancé / page comptable)
- `scheduler.ts` (clôture auto journalière)

---

## 4. Archivage — export scellé et auditable

**Principe** : pouvoir produire une archive **complète, lisible et vérifiable** de toute la facturation.

### À implémenter
- Export **JSON ou XML signé** contenant : toutes les factures émises + lignes + chaîne de hashs + clôtures. Avec une **signature globale** de l'archive.
- Déjà en place et réutilisable : **export FEC** (`src/lib/fec-export.ts`) + **sauvegardes** (`backup-service.ts`).
- Ajouter : `exportFiscalArchive(from, to)` → fichier `.json` (ou `.xml`) horodaté + hash de contrôle.
- Conservation légale : **6 ans minimum** (durée de reprise de l'administration). Documenter que les sauvegardes le permettent.

### Fichiers
- `src/lib/fiscal-archive.ts`
- `src/app/api/exports/fiscal-archive/route.ts`
- UI : `/admin/exports` (déjà existante — ajouter un bouton)

---

## 5. Le défi Desktop / SQLite — chiffrement de la base

**Problème** : app Electron + SQLite local → un utilisateur technique peut ouvrir `atelier.db` et modifier des montants.

### Solution : SQLCipher (chiffrement complet de la base)
- Remplacer SQLite standard par **SQLCipher** (chiffrement AES-256 transparent de tout le fichier `.db`).
- Côté Prisma : SQLCipher nécessite un driver compatible. Options :
  - `better-sqlite3-multiple-ciphers` (build natif avec SQLCipher) + adapter Prisma, OU
  - Passer par un binaire SQLite compilé avec SQLCipher et `PRAGMA key`.
- **Clé de chiffrement** : dérivée d'un secret par installation (cf. durcissement secrets déjà identifié) + éventuellement liée au hardwareId. À stocker hors de la base, protégée.
- ⚠️ **Chantier non trivial** (Prisma + SQLCipher + Electron packaging). À évaluer : effort vs bénéfice. Le **chaînage cryptographique (§2) avec clé privée embarquée** offre déjà une **détection** d'altération même sans chiffrement complet — c'est souvent suffisant pour l'attestation ISCA. SQLCipher ajoute la **prévention** (lecture/écriture impossible sans clé).

### Reco
1. **Phase 1 (suffisant pour attester)** : chaînage + signature RSA (§2) + verrouillage (§1) + clôtures (§3) + archivage (§4). Détection robuste.
2. **Phase 2 (renforcement)** : SQLCipher pour la prévention totale. À faire si un gros client société l'exige.

---

## 6. Facturation électronique 2026/2027 — Factur-X

**Contexte réglementaire (calendrier progressif)** :
- **1er sept. 2026** : obligation de **réception** de factures électroniques pour TOUTES les entreprises ; obligation d'**émission** pour grandes entreprises et ETI.
- **1er sept. 2027** : obligation d'**émission** pour PME et **micro-entreprises**.
- Transit via le **Portail Public de Facturation (PPF)** ou une **Plateforme de Dématérialisation Partenaire (PDP)**.

**Format cible : Factur-X** (norme franco-allemande) = un **PDF/A-3** lisible par un humain qui **encapsule un XML structuré** (norme EN 16931) lu par les machines (client + fisc).

### À implémenter
1. **Génération Factur-X** : enrichir `src/lib/pdf-invoice.ts` pour produire un PDF/A-3 + XML CII (Cross-Industry Invoice) intégré.
   - Bibliothèques Node à évaluer : `factur-x` / `node-zugferd` / génération XML manuelle + intégration PDF via `pdf-lib` (attention : PDF/A-3 a des contraintes — `pdf-lib` ne fait pas du PDF/A nativement, peut nécessiter un post-traitement type Ghostscript ou une lib dédiée).
2. **Données obligatoires EN 16931** : SIREN/SIRET émetteur ET destinataire, mentions légales complètes, TVA détaillée par taux, etc. → enrichir le modèle client (SIRET destinataire pour le B2B).
3. **Transmission PPF/PDP** : à terme, connecter l'envoi via une PDP (API). Pour démarrer, l'**émission du fichier Factur-X téléchargeable** suffit (le client/comptable le dépose).

### Fichiers
- `src/lib/facturx.ts` (génération XML CII + assemblage PDF/A-3)
- `src/lib/pdf-invoice.ts` (intégration)
- `prisma/schema.prisma` : ajouter SIRET/TVA destinataire sur `Customer` (pour le B2B)

---

## 7. L'attestation individuelle de conformité

Une fois §1–§4 implémentés et testés :
- Rédiger et signer (Upgraded Bikes / Jérôme Leyssard) une **attestation individuelle** conforme au modèle de l'administration (cf. modèle dans `plan-certification-crm.md`).
- La rendre **téléchargeable depuis l'app** (ex : `/admin/exports` → « Attestation de conformité ») et l'inclure dans l'email de bienvenue / la page tarifs.
- Mentionner la version du logiciel attestée (l'attestation vaut pour une version donnée).

---

## 8. Séquencement recommandé

| Étape | Contenu | Débloque |
|---|---|---|
| **F1** | Inaltérabilité (§1) : verrouillage factures émises | Bonne pratique immédiate, peu coûteux |
| **F2** | Chaînage + signature RSA (§2) | Détection d'altération |
| **F3** | Clôtures Z (§3) + archivage scellé (§4) | Conservation + audit |
| **F4** | Attestation individuelle (§7) | **Vente aux sociétés / assujettis TVA** |
| **F5** | SQLCipher (§5) | Prévention totale (si exigé) |
| **F6** | Factur-X (§6) | **Conformité e-invoicing 2026/2027** |

> F1→F4 = ouvre le marché des sociétés. F6 = obligatoire à terme pour tous. F5 = renfort optionnel.

---

## 9. Points de vigilance

- **Payload de hash déterministe** : le moindre changement de format (locale, ordre, arrondi) casse la vérification. Tester avec des cas réels avant d'attester.
- **Migrations irréversibles** : une fois le chaînage en prod chez des clients, ne jamais changer l'algorithme sans versionner (`fiscalAlgoVersion`).
- **Responsabilité pénale** : ne signer l'attestation que lorsque le code fait *réellement* ce qu'on déclare. Faire relire par un expert-comptable / juriste si possible.
- **Tests** : suite de tests dédiée `fiscal-*.test.ts` (chaîne valide, chaîne rompue détectée, clôture immuable, facture émise non modifiable).
- **Conservation 6 ans** : documenter la politique de sauvegarde pour le client.

---

## 10. Briques déjà en place réutilisables

| Brique | Statut | Réutilisable pour |
|---|---|---|
| Avoirs (credit notes) | ✅ schéma | Inaltérabilité (§1) |
| Statut `issued` | ✅ | Verrouillage (§1) |
| Numérotation `FAC-YYYY-NNNN` | ✅ `invoice-number.ts` | Séquence (§1) |
| Signature RSA | ✅ `license-generator` | Chaînage signé (§2) |
| Export FEC | ✅ `fec-export.ts` | Archivage (§4) |
| Sauvegardes auto + restore | ✅ `backup-service.ts` | Conservation (§3/§4) |
| Cron scheduler | ✅ `scheduler.ts` | Clôtures auto (§3) |
| ENCRYPTION_KEY / crypto AES-GCM | ✅ `crypto.ts` | Base pour SQLCipher (§5) |

---

*Document vivant. À affiner avant tout développement fiscal. Aucune ligne de code « fiscale » ne doit partir en prod sans tests d'intégrité complets.*
