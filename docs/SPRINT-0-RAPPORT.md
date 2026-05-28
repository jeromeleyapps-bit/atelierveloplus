# Sprint 0 — Rapport (sécurité d'urgence)

Branche : `refonte-2026`. Tag : `sprint-0-done`.

## Ce qui a été fait

### S0.1 — `package.json` nettoyé
`description` et `author` étaient des mojibake accumulés sur des cycles UTF-8/Win-1252 (504 KB pour 168 lignes). Remis à des valeurs propres. Le fichier corrompu est sauvegardé en `package.json.backup-mojibake` (gitignored).

### S0.2 — Rotation des secrets
- `JWT_SECRET` → 64 octets (128 hex). Anciennement 16 hex = cassable.
- `ENCRYPTION_KEY` → 64 octets (128 hex). `crypto.ts` n'est utilisé nulle part en runtime, donc rotation safe (aucune donnée chiffrée à perdre).
- Backups locaux : `.env.bak.YYYYMMDD`, `.env.local.bak.YYYYMMDD`, `.env.production.bak.YYYYMMDD` (gitignored).

⚠️ **Reste à faire côté utilisateur** :
- Révoquer manuellement la clé `RESEND_API_KEY` actuelle sur Resend → en générer une nouvelle → la coller dans `.env` et `.env.production`. La clé exposée dans le `.env` versionné a pu être interceptée, elle doit être considérée comme compromise.
- Idem pour `SMTP_PASS` Gmail (mot de passe d'application) : révoquer + régénérer.

### S0.3b — `src/lib/jwt.ts` durci
- Force `JWT_SECRET` ≥ 32 caractères en production (throw sinon).
- Plus de chaîne hardcodée `dev-secret-CHANGE-IN-PRODUCTION-IMMEDIATELY` : en dev, génère un secret aléatoire par-process (tokens existants invalidés au restart, c'est voulu).
- Le fallback `x-user-id`/`x-user-role` (mode Electron local) est gardé MAIS conditionné à la présence d'un `x-electron-auth-token` valide (comparaison timing-safe).

### S0.3a — Token de session Electron
La vraie faille était dans `middleware.ts` : pour toute requête sans JWT sur une route protégée, le middleware injectait automatiquement `x-user-id: 'electron-local'` + `x-user-role: 'admin'`. Donc n'importe quel autre process local hit `http://127.0.0.1:3000/api/...` obtenait un accès admin.

Correctif :
- `electron/index.js` : génère `ELECTRON_AUTH_TOKEN` (32 octets aléatoires) au démarrage du main process, l'expose dans `process.env`. Le serveur Next.js spawné en hérite.
- `electron/windows/mainWindow.js` : hook `session.webRequest.onBeforeSendHeaders` attache automatiquement le header `x-electron-auth-token` à toute requête vers `127.0.0.1` ou `localhost`. Le renderer n'a rien à modifier.
- `src/middleware.ts` : auto-injecte les headers admin uniquement si le token reçu correspond. En dev pur (`npm run dev` sans Electron), `ELECTRON_AUTH_TOKEN` est absent → tolérance préservée pour le workflow dev. En prod, absence = 401.

Résultat : un process tiers sur la même machine ne peut plus se faire passer pour Electron.

### S0.3c — `src/proxy.ts` supprimé
Convention Next 15, mais le projet est en Next 13. Le fichier dupliquait `middleware.ts`. Aucun import. Suppression nette (189 lignes en moins).

### S0.4 — BrowserWindow durci
- `webSecurity: false` (TEMPORAIRE diagnostic 29/11/2025) → remis à `true`.
- Ajout `allowRunningInsecureContent: false`.
- CSP ajoutée via `session.webRequest.onHeadersReceived` : autorise self + localhost + Stripe + Resend, bloque le reste.
- `contextIsolation: true` et `nodeIntegration: false` étaient déjà bons. `sandbox: false` conservé volontairement (fix bug focus inputs documenté).

## Tests
- Suites JWT, api-helpers, middleware : 100 % vertes (39 tests).
- Suite globale : 482/504 passent. **19 échecs pré-existants** (`invoices`, `bikes`, `finance-quotes`) confirmés sur baseline avant Sprint 0 → non liés à ces changements, à traiter en Sprint 1.

## Points d'attention pour la suite
1. **CSP à valider en runtime** : si une ressource externe est bloquée à l'utilisation (police, image hotlinkée), la CSP devra être élargie.
2. **Tests E2E Playwright** non re-joués — à faire avant merge final si tu veux la garantie complète. Lancer : `npm run test:e2e`.
3. **Build Electron non testé** sur cette branche. À refaire avant prochaine release.
4. Le fallback `getUserId` dans `src/lib/api-helpers.ts` accepte encore `x-user-id` sans vérif crypto — mais maintenant ce header n'est plus injectable par un tiers (le middleware filtre en amont). Au passage on pourrait le déprécier en Sprint 1.

## Commits du sprint
```
57b8a8e33 [s0] docs: master refactor plan 2026
bb7dd57e2 [s0] fix(pkg): clean corrupted description/author
5939911a8 [s0] chore(env): rotate secrets (env files gitignored)
b498d90a3 [s0] chore: remove dead src/proxy.ts
02b209fc9 [s0] feat(auth): enforce strong JWT secret + per-session Electron token guard
3df7bce51 [s0] feat(electron): per-session auth token, blocks local cross-process bypass
0963c1526 [s0] feat(electron): re-enable webSecurity, add CSP
```

Retour en arrière complet : `git reset --hard sprint-0-done` (après tag) ou `git checkout windows` pour revenir avant Sprint 0.
