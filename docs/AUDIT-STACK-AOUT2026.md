# Audit technique Atelier Vélo+ — 15 août 2026

> Revue complète des choix techniques après 10 mois de développement, avant l'arrivée des
> premiers clients. Question posée : *est-ce un château de cartes ?*

---

## Verdict en trois phrases

**Le cœur métier n'est pas un château de cartes.** 79 600 lignes, 137 routes d'API, 536 tests
qui passent, une architecture cohérente et une chaîne de build reproductible : c'est un vrai
produit, pas un prototype gonflé.

**En revanche, la plateforme sous le produit a vieilli sans être entretenue.** Next.js a trois
versions majeures de retard, Electron et Node ont dépassé leur fin de vie, et 61 vulnérabilités
connues traînent dans les dépendances de production.

**Et deux portes sont restées ouvertes.** Ce sont elles l'urgence réelle — pas les numéros de
version. Un fichier clients accessible sans authentification, et trois routes d'écriture
ouvertes. Tant que le logiciel tournait sur ton seul poste, cela restait théorique. Avec des
clients et la prise de rendez-vous en ligne, cela ne l'est plus.

---

## 1. Ce qui est solide (à ne pas casser)

| Élément | Constat |
|---|---|
| Architecture applicative | Local-first assumé : chaque atelier a ses données chez lui. Choix rare, et c'est un argument de vente réel face aux SaaS. |
| Séparation des responsabilités | Cœur métier local / vente et licences en Workers Cloudflare. La frontière est nette. |
| Tests | 536 tests, 61 suites, exécution en 8 secondes. Beaucoup de projets à ce stade n'en ont aucun. |
| TypeScript | Compilation sans erreur sur l'ensemble du projet. |
| Build | Reproductible, avec le piège du cache Next déjà désamorcé dans le prebuild. |
| Sécurité Electron | `nodeIntegration: false`, `contextIsolation: true`, `webSecurity: true`, CSP posée, jeton de session par process. C'est la bonne configuration. |
| Base de données | Prisma + SQLite : adapté à l'usage mono-poste, migrations versionnées. |

Le travail des Sprints 0 à 6 a laissé des traces visibles et durables. Le problème n'est pas
la qualité de ce qui a été construit, c'est **l'âge des fondations sur lesquelles c'est posé**.

---

## 2. 🔴 À corriger avant le premier client

### 2.1 Le fichier clients est accessible sans authentification

`/api/customers` est déclaré **route publique** dans [src/middleware.ts](../src/middleware.ts) :

```js
'/api/customers',               // Liste clients pour autocomplete
```

La méthode GET de cette route ne vérifie aucune identité et renvoie jusqu'à 200 clients avec
**nom, prénom, email, téléphone et adresse postale**.

Tant que l'application n'écoute que sur `localhost`, l'exposition se limite au poste lui-même.
Mais dès qu'un atelier active la prise de rendez-vous en ligne, un tunnel Cloudflare publie
l'origine — c'est-à-dire l'application entière, pas seulement la page `/rdv`. À partir de là,
l'URL publique de l'atelier suivie de `/api/customers` rend son fichier clients téléchargeable
par n'importe qui.

C'est une violation directe du RGPD, avec obligation de notification à la CNIL sous 72 h en cas
de fuite avérée. Pour un logiciel vendu à des professionnels qui te confient les données de
*leurs* clients, c'est le risque le plus lourd de cet audit — devant tous les autres.

**À vérifier en priorité : ton propre atelier.** Si `rdv.upgradedbikes.com` est actif, ton
fichier clients est probablement déjà accessible.

**Correction** : retirer `/api/customers` des routes publiques. Si l'autocomplétion en a besoin
côté client, elle passe par le canal authentifié comme le reste de l'application.

### 2.2 Trois routes d'écriture ouvertes

Toujours dans la liste publique, et sans aucun contrôle d'identité dans leur code :

| Route | Effet |
|---|---|
| `/api/catalog/scan-bulk` | Import massif dans le catalogue |
| `/api/catalog/import/supplier-csv-stream` | Import du catalogue fournisseur |
| `/api/admin/service-rates/import` | Écrasement des tarifs et prestations |

La dernière est une route `/api/admin` explicitement sortie du périmètre protégé. Exposées via
le tunnel, elles permettent à un tiers d'écraser le catalogue et la grille tarifaire d'un
atelier. Ce sont des imports : ils n'ont aucune raison d'être publics.

### 2.3 Next.js 13.5 : contournement d'autorisation non corrigeable

L'authentification des API repose sur le middleware, qui autorise **selon le chemin** :

```js
const isProtectedApi = protectedApiRoutes.some(route => pathname.startsWith(route));
```

C'est exactement le motif visé par [CVE-2024-51479](https://github.com/advisories/GHSA-7gfc-8cq8-jh5f)
(sévérité haute, 7.5) : *« si une application Next.js effectue une autorisation dans le
middleware en se basant sur le pathname, cette autorisation pouvait être contournée »*.

Versions affectées : **>= 9.5.5 et < 14.2.15**. La version installée est 13.5.11, et **13.5.11
est la dernière version de la branche 13** — aucun correctif n'existera. Rester en 13.x, c'est
garder ce trou ouvert définitivement.

À noter, et c'est à ton crédit : la CVE-2025-29927 (critique, 9.1, contournement via l'en-tête
`x-middleware-subrequest`) est bien **corrigée** en 13.5.11. La mise à jour de sécurité d'alors
a été faite.

Au total, `npm audit` remonte **29 avis de sécurité** sur Next 13.5 : SSRF, empoisonnement de
cache, XSS, dénis de service.

### 2.4 Le canal de mise à jour est lui-même vulnérable

`electron-updater ^6.6.2` est signalé en sévérité **haute** (plage vulnérable 2.9.0 – 6.8.8).
C'est le composant qui télécharge et installe les mises à jour sur les postes de tes clients :
une faille à cet endroit est un vecteur d'attaque privilégié, et elle se propage à chaque
machine installée. À corriger avant d'activer les mises à jour automatiques.

### 2.5 Electron 39 est en fin de vie

Electron 39 a atteint sa fin de support le **5 mai 2026**. Il embarque Chromium M142, qui ne
reçoit donc plus aucun correctif de sécurité depuis cette date. Les versions maintenues sont
41, 42 et 43 (Chromium M150, Node 24).

Chaque installateur distribué aujourd'hui embarque un navigateur non patché depuis trois mois.

---

## 3. 🟠 À planifier dans les semaines qui viennent

### 3.1 L'écart de versions

| Composant | Installé | Disponible | Écart |
|---|---|---|---|
| Next.js | 13.5.11 | 16.3.1 | 3 majeures, branche morte |
| React | 18.2 | 19.2.8 | 1 majeure |
| Electron | 39.1.2 | 43.4.0 | 4 majeures, EOL |
| Prisma | 6.18 | 7.9.1 | 1 majeure |
| MUI | 5.15 | 9.3.1 | 4 majeures |
| MUI X Data Grid | 6.18 | 9.11.0 | 3 majeures |
| ESLint | 8.57 | 10.8.1 | 2 majeures, ESLint 8 EOL |
| Zod | 3.23 | 4.4.3 | 1 majeure |
| Nodemailer | 7.0.9 | 9.0.5 | 2 majeures, vulnérable |
| bcryptjs | 2.4.3 | 3.0.3 | 1 majeure |
| Stripe | 22.2 | 22.5 | à jour |
| Sentry | 10.55 | 10.70 | à jour |

Stripe et Sentry sont à jour : les briques ajoutées récemment ont été prises à la bonne version.
L'écart se concentre sur le socle d'origine, choisi il y a dix mois et jamais rafraîchi.

### 3.2 Node 20 a dépassé sa fin de vie

Node 20 n'est plus supporté depuis le **30 avril 2026**. Le projet tourne sur v20.18.0 et
`engines` déclare `>=20 <23`, ce qui **exclut Node 24**, l'actuelle LTS. Les versions à viser
sont Node 22 (support sécurité jusqu'en avril 2027) ou Node 24 (jusqu'en avril 2028).

### 3.3 axios : 29 avis de sécurité pour un seul fichier

`axios` est utilisé dans **un unique fichier** du projet, et traîne 29 avis dont plusieurs en
sévérité haute (pollution de prototype, fuite d'identifiants proxy, SSRF). Le remplacer par le
`fetch` natif — déjà utilisé partout ailleurs — supprime la dépendance et tous ses avis d'un
coup. C'est le meilleur rapport effort/gain de tout cet audit.

---

## 4. 🟡 Dette et incohérences (sans risque immédiat)

### 4.1 L'outillage ne parle pas la même langue que le framework

```
next                    ^13.5.11
eslint-config-next      ^15.1.4     ← règles de Next 15
@next/bundle-analyzer   ^16.0.4     ← outil de Next 16
```

Le linter applique les conventions d'une version que le projet n'utilise pas. Les avertissements
sont donc partiellement hors sujet, et certains vrais problèmes passent sous le radar. C'est
typiquement le symptôme d'une mise à jour partielle : les périphériques ont suivi, pas le cœur.

### 4.2 Un second framework de test installé mais jamais branché

`vitest`, `@vitest/ui`, `@vitest/coverage-v8`, `happy-dom`, `@vitejs/plugin-react` sont
installés. Il n'existe **aucun fichier `vitest.config`** : tout tourne sous Jest. Cinq paquets
alourdissent l'installation sans rien produire.

### 4.3 Dépendances déclarées et jamais utilisées

Confirmé par `depcheck` et par recherche dans le code :

- `jsonwebtoken` — **0 fichier** (c'est `jose` qui est utilisé)
- `undici` — 0 fichier
- `micromatch`, `watchpack` — 0 fichier
- `@types/bcrypt` — types du mauvais paquet (le projet utilise `bcryptjs`)

Deux bibliothèques JWT déclarées pour une seule réellement employée : c'est le genre
d'ambiguïté qui fait qu'un jour quelqu'un signe un jeton avec l'une et le vérifie avec l'autre.

### 4.4 Couverture de tests inégale

38 fichiers de test d'API pour 137 routes, soit environ **28 %**. Les tests existants sont bons,
mais ils couvrent surtout ce qui a été écrit récemment. Le bug du wizard corrigé aujourd'hui est
révélateur : il vivait dans un parcours — la première configuration — qu'aucun test ne traversait
de bout en bout. C'est précisément le parcours que **100 % des nouveaux clients** empruntent.

### 4.5 Un installateur de 396 Mo

Lourd pour un premier contact, en particulier dans un atelier avec une connexion modeste. La
cause principale est l'embarquement complet de Next et de ses dépendances. À traiter comme un
sujet de conversion commerciale, pas seulement de confort technique.

### 4.6 Secrets identiques dans toutes les installations

Déjà identifié en juin : `JWT_SECRET` et `ENCRYPTION_KEY` sont les mêmes dans chaque build.
Un client curieux peut extraire les secrets de son installation et forger des jetons valides
pour n'importe quelle autre. À générer par installation au premier lancement.

Point de vigilance lié : c'est une rotation de ces secrets qui a produit le bug du wizard
corrigé aujourd'hui. Toute évolution sur ce terrain doit prévoir la purge des jetons devenus
invalides — c'est désormais en place via `/api/auth/me`.

---

## 5. Plan proposé

### Avant de publier la 1.2.1 — environ une demi-journée
1. Retirer `/api/customers` des routes publiques.
2. Protéger les trois routes d'import.
3. Vérifier si `rdv.upgradedbikes.com` expose actuellement ton propre fichier clients.
4. Mettre à jour `electron-updater` et retirer `axios`.

Ces quatre points ne demandent aucune migration et referment les deux vraies portes ouvertes.

### Dans le mois — deux à quatre jours
5. Electron 39 → 43 (sort de l'EOL, Chromium patché). Migration généralement peu douloureuse.
6. Node 20 → 22, et corriger `engines`.
7. Nodemailer, bcryptjs, Zod, Prisma : montées de version cadrées, une par une, tests à l'appui.
8. Nettoyer les dépendances mortes et le Vitest fantôme.

### Le vrai chantier — une à deux semaines
9. **Next.js 13 → 15 (puis 16)**. C'est le seul moyen de fermer CVE-2024-51479, et cela remet
   l'outillage en cohérence. Passer par 15 plutôt que sauter directement en 16 : le saut est
   plus sûr, et 15.5.23 est une branche mûre. Implique React 19 et la revue des Server Actions.
10. Tests de bout en bout sur le parcours de première installation, celui que tous les
    nouveaux clients traversent.

### Recommandation de séquence

**Ne pas faire la migration Next avant la 1.2.1.** Le correctif du wizard et le freemium doivent
partir vite — la version actuellement en téléchargement bloque tout nouvel utilisateur dès son
premier écran. On publie la 1.2.1 avec les correctifs de sécurité du point 1, puis on ouvre le
chantier de migration sur une base stable et déjà vendable.

---

## 6. Réponse à la question posée

Ce n'est **pas** un château de cartes : le métier est solide, testé, et l'architecture tient
debout. Ce n'est pas non plus un géant aux pieds d'argile : les fondations ne sont pas mauvaises,
elles ont simplement dix mois et n'ont jamais été rafraîchies pendant que le produit grossissait
au-dessus.

L'image juste serait celle d'une **maison bien construite dont on aurait oublié de fermer deux
fenêtres, et dont l'installation électrique n'est plus aux normes**. On ferme les fenêtres cette
semaine, on refait l'électricité le mois prochain, et on peut recevoir sans crainte.

Le point à retenir : ce qui doit t'empêcher de dormir n'est pas le retard de version de Next,
c'est `/api/customers`. Le premier est une dette, le second est une porte ouverte sur les
données personnelles des clients de tes clients.
