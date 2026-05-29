# Page Tarifs — Cloudflare Pages

Statique pure (HTML + JS vanilla). Aucune dépendance, déploiement immédiat.

## Déploiement Cloudflare Pages

### Option 1 — Drag & drop
1. Dashboard Cloudflare → **Pages → Create application → Upload assets**.
2. Glisse-dépose ce dossier `pages-tarifs/`.
3. Cloudflare te donne une URL `https://<projet>.pages.dev`.

### Option 2 — Via Git
1. Connecte ton repo GitHub à Cloudflare Pages.
2. Build command : *(vide)*
3. Build output directory : `pages-tarifs`

## Configurer l'URL du Worker

Dans le code (`index.html` et `success.html`), remplace la ligne :
```js
const API_BASE = (window.ATELIER_API_BASE || 'https://atelier-velo-api.YOUR-SUBDOMAIN.workers.dev')...
```

Ou plus propre, injecte la variable globalement via une `<script>` séparée :
```html
<script>window.ATELIER_API_BASE = 'https://atelier-velo-api.tonsubdomain.workers.dev';</script>
```

(Cloudflare Pages → Settings → Functions → on n'utilise pas Functions ici, juste des Environment Variables si tu utilises un build hook.)

## Domaine personnalisé

Pages → ton projet → Custom domains → ajoute `tarifs.tondomaine.fr`. Cloudflare gère les certificats SSL gratuitement.
