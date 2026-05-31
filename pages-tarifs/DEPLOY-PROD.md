# Déploiement page tarifs PROD — tarifs.upgradedbikes.com

> La page tarifs est hébergée sur **Cloudflare Pages**, dans le **compte Cloudflare qui gère
> le domaine upgradedbikes.com** (compte `967b3a3e…`, celui du tunnel), afin de pouvoir
> attacher le custom domain `tarifs.upgradedbikes.com` nativement.
>
> Le worker de paiement (`atelier-velo-api-prod`) est dans l'autre compte (`6504582e…`) —
> ce n'est pas un problème : la page l'appelle par son URL publique, cross-compte OK.

## Contenu à déployer
Dossier `pages-tarifs/` (3 fichiers) :
- `index.html` — page tarifs (appelle `atelier-velo-api-prod.../billing/checkout`)
- `success.html` — confirmation après paiement (poll `atelier-velo-api-prod.../billing/order-status`)
- (README.md non nécessaire en prod)

Les deux HTML pointent déjà vers le **worker prod** (`atelier-velo-api-prod.upgradedbikes.workers.dev`).

## Procédure (à faire dans le compte Cloudflare du domaine — 967b3a3e)

1. Se connecter à https://dash.cloudflare.com avec le compte **qui possède upgradedbikes.com**.
2. **Workers & Pages → Create → Pages → Upload assets**.
3. Nom du projet : `atelier-velo-tarifs` (ou autre).
4. Glisser-déposer le **contenu** du dossier `pages-tarifs/` (les fichiers `index.html` + `success.html`
   à la racine, pas le dossier parent).
5. **Deploy**. Cloudflare donne une URL `https://<projet>.pages.dev` (technique, peu importe).

## Custom domain
6. Sur le projet Pages → onglet **Custom domains → Set up a custom domain**.
7. Saisir `tarifs.upgradedbikes.com`.
8. Comme le DNS de upgradedbikes.com est dans CE compte, Cloudflare crée automatiquement
   l'enregistrement et le certificat SSL (quelques minutes).
9. Vérifier : `https://tarifs.upgradedbikes.com` affiche la page tarifs.

## Cohérence des URLs (déjà configuré côté app)
- `.env.production` de l'app Electron :
  - `NEXT_PUBLIC_PURCHASE_URL=https://tarifs.upgradedbikes.com` (bouton « Acheter » dans l'app)
  - `NEXT_PUBLIC_ATELIER_API_BASE=https://atelier-velo-api-prod.upgradedbikes.workers.dev` (activation des codes)
- Worker prod secret `APP_PUBLIC_URL` : à mettre à jour vers `https://tarifs.upgradedbikes.com`
  une fois le domaine actif (sert aux redirections success/cancel + lien email) :
  ```
  cd workers
  wrangler secret put APP_PUBLIC_URL --env production
  # → https://tarifs.upgradedbikes.com
  npm run deploy:prod
  ```

## Mise à jour future de la page
Re-upload du dossier `pages-tarifs/` sur le même projet Pages (drag & drop), ou via Git si connecté.
