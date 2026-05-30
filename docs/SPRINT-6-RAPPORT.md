# Sprint 6 — Rapport (simplification UX des pages de configuration)

Branche : `refonte-2026`. Tag : `sprint-6-done`.

## Contexte

L'app mélangeait deux audiences : l'éditeur/admin technique (toi) et l'atelier vélo (utilisateur métier). Les pages de config affichaient du jargon (User ID, identifiant machine, 2FA, mode maintenance) et des textes devenus faux avec le nouveau flux d'achat automatisé.

Décision : nettoyer + introduire un **mode "Avancé"** activable. OFF par défaut → UI épurée pour l'atelier. ON → révèle le technique pour le SAV.

## S6.A — Infrastructure mode Avancé
- `src/hooks/useAdvancedMode.ts` : préférence locale (localStorage) synchronisée entre composants via CustomEvent. OFF par défaut.
- Toggle "Mode avancé" dans l'en-tête de `/admin/settings`, avec bandeau explicatif quand actif.

## S6.B — Mon compte (`/account`)
- **User ID** (`cmib2upww…`) : masqué par défaut, visible seulement en mode avancé.
- **Identifiant machine** : le bloc complet passe en mode avancé, renommé "(support)".
- **Texte obsolète corrigé** : "Code à communiquer pour obtenir votre licence / Communiquez-le lors de l'achat" (ancien flux manuel) → "Identifiant unique de cet ordinateur, utile uniquement pour le support en cas de transfert de licence". Plus de message trompeur.

## S6.C — Licence (`/admin/license`)
- Le gros bloc orange **"Vous avez déjà une clé de licence ?"** (saisie manuelle de la clé brute) passe en mode avancé. Le client normal utilise la carte "Activer un code d'achat" (Sprint 5), il n'a plus à manipuler la clé longue.
- Retrait des styles de forçage (`zIndex:1000`, `visibility`, `opacity`) devenus inutiles.

## S6.D — Paramètres (`/admin/settings`)
- Titre "Paramètres **Administrateur** / Configuration avancée du système" → "**Paramètres** / Email, sauvegardes, encaissement et options de l'atelier" (moins intimidant).
- Section "Sécurité & Maintenance" → "Sauvegardes" ; carte renommée "Sauvegardes de données".
- **Suppression définitive** (dangereux) : passe en mode avancé.
- Carte **Paramètres de Sécurité** (2FA, logs détaillés, mode maintenance, alertes) : entièrement en mode avancé.
- Restent toujours visibles : Intégrations (tunnel, communications, RDV), Email SMTP, Sauvegardes (lien), Comptabilité & Encaissement (FEC, Stripe).

## S6.E — Tarifs & prestations (`/admin/service-rates`)
- Audit : page purement métier (tarifs de réparation, import/export CSV). Aucun jargon, aucun texte obsolète. **Inchangée** — elle est saine.

## Bonus — Bouton "Acheter une licence"
- Pointait vers la boutique upgradedbikes.com. Désormais configurable via `NEXT_PUBLIC_PURCHASE_URL`, pointe vers la page tarifs (checkout Stripe automatique).

## Résultat pour l'atelier (mode normal)
- Mon compte : email, statut licence, déconnexion. Point.
- Paramètres : intégrations, email, sauvegardes, FEC, Stripe. Pas de jargon sécurité.
- Licence : activer un code d'achat (1 clic), statut, acheter. Pas de clé brute.

## Résultat pour le SAV (mode avancé activé)
- Tout le technique réapparaît : User ID, identifiant machine, saisie manuelle de clé, 2FA, maintenance, suppression définitive.

## Tests & lint
- 514 tests verts, ESLint --max-warnings=0 vert, TypeScript clean.

## Commits
```
[s6] feat(ux): advanced-mode toggle, hide technical settings behind it
[s6] feat(ux): account page — hide User ID + machine ID behind advanced mode
[s6] feat(ux): license page — hide manual key-entry block behind advanced mode
[s5] feat(license): 'Acheter' button → tarifs page via NEXT_PUBLIC_PURCHASE_URL
```

## Retour arrière
```bash
git reset --hard sprint-6-done
```
