# Atelier Vélo+ — Reprendre ici

> Point de reprise unique. Mis à jour le **15 août 2026**.
> Remplace `ETAT-PROJET-01JUIN2026.md` (toujours valable pour la carte d'infrastructure détaillée).

---

## En une phrase

**Le code est en avance de deux versions sur ce que voient les clients.** Tout le travail de
juin (V2 + version 1.2.0) et de juillet (freemium) est terminé, testé et commité localement,
mais **rien n'a été publié** : le site et l'installateur en ligne datent de fin mai (v1.1.0).

---

## Le décalage exact

| Élément | En local (à jour) | En ligne (ce que voit un client) |
|---|---|---|
| Code source | 172 commits, freemium inclus, 529 tests verts | — |
| Dépôt GitHub | **jamais poussé depuis v1.1.0** ⚠️ | `origin/macOS` = v1.1.0 |
| Installateur | `dist-electron/…1.2.0-win-x64.exe` (1er juin, **sans freemium**) | v1.1.0 sur downloads.upgradedbikes.com |
| Page tarifs | 4 formules dont Gratuit | 3 formules, annonce « Version 1.1.0 » |

**Conséquence commerciale** : la version gratuite qui doit amorcer les ventes n'existe pour
personne. Un visiteur voit encore « essai 14 jours puis il faut payer ».

---

## La séquence pour rattraper (dans cet ordre)

### 1. Sauvegarder le travail — ✅ FAIT le 15 août 2026
`refonte-2026` est poussée sur `origin`. Le push avait d'abord été refusé par GitHub Push
Protection : une ancienne clé Resend (révoquée au Sprint 0) traînait en clair dans
`docs/TODO-DEPLOIEMENT.md` depuis le 29 mai. L'historique a été réécrit avec `git filter-repo`
pour la purger — **les identifiants de commit d'avant le 15 août ont donc changé**.

Si un ancien clone de ce dépôt existe ailleurs, ne pas le fusionner : le recloner.

### 2. Publier la page tarifs (10 min)
Elle est prête localement (colonne Gratuit + wording freemium). Compte Cloudflare **du domaine**
(`967b3a3e…`), pas celui des workers.

```bash
cd pages-tarifs && wrangler deploy
```
(après `$env:CLOUDFLARE_API_TOKEN="<token du compte domaine>"`)

### 3. Construire et publier l'application avec le freemium (1 h)
Le build du 1er juin ne contient pas le freemium. Il faut en refaire un.

```bash
npm run build && npm run build:electron
```
Puis publier l'installateur (compte domaine) et le flux de mise à jour (compte workers) :
```bash
node scripts/publish-installer-r2.mjs
```

### 4. Vérifier le tunnel de bout en bout (30 min)
Installer le .exe publié sur une machine neuve ou une VM, vérifier que l'essai démarre, que la
bascule en version gratuite fonctionne, et qu'un code d'activation prend bien.

### 5. Mesurer (2 h) — la question sans réponse depuis le lancement
Aucune donnée sur les téléchargements. Worker `/download` qui compte dans D1 puis redirige
vers R2, pour enfin savoir si le problème est l'absence de visiteurs ou l'absence de conversion.

---

## Décisions en attente (ne bloquent pas la publication)

- **Licence payante expirée → blocage.** Avec le freemium, la logique cohérente serait de
  retomber en version gratuite plutôt que de bloquer un ancien client. Politique commerciale
  à trancher (`src/lib/license-manager.ts:1088`).
- **`APP_PUBLIC_URL` du worker prod** : à vérifier dans le dashboard, doit pointer sur
  `https://tarifs.upgradedbikes.com`.
- **Signature de code** (SmartScreen « Éditeur inconnu ») : voir `plan-signature-code.md`.
- **Taille de l'installateur** : 415 Mo, lourd pour un premier contact.
- **`cle stripe.txt`** à la racine : clé en clair, à supprimer une fois sauvegardée ailleurs.

---

## Contexte légal (vérifié en juillet 2026, rien à faire côté logiciel)

- L'obligation de « logiciel certifié » au 1er septembre 2026 **a été annulée** par la loi de
  finances 2026 (art. 125) : l'attestation individuelle de l'éditeur redevient valable.
- Septembre 2026 = obligation de **réception** des factures électroniques, côté entreprise :
  c'est une démarche administrative (s'enregistrer auprès d'une Plateforme Agréée), pas un
  sujet logiciel.
- La vraie échéance produit est **septembre 2027** (émission Factur-X + e-reporting).
  Plan technique : `plan-V2-fiscalisation.md`.

---

## Rappels qui font perdre du temps si on les oublie

- **Deux comptes Cloudflare** : workers API = `6504582e…`, domaine/page/downloads = `967b3a3e…`.
- **Cache Next** : le prebuild nettoie `.next/cache`, sinon les variables `NEXT_PUBLIC_*`
  ne s'inlinent pas silencieusement.
- **Prix Stripe immuables** : changer un prix = créer un nouveau `price_id`.
- La page tarifs déployée est `pages-tarifs/index.html` (racine du dossier, pas de sous-dossier).
