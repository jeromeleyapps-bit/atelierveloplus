# Signature de code Windows — Atelier Vélo+

> Objectif : supprimer l'avertissement **« Windows a protégé votre PC / Éditeur inconnu »**
> (SmartScreen) au lancement de l'installateur. Document de référence — à traiter plus tard.

## État actuel (31 mai 2026)

- L'installateur `Atelier Velo+-1.1.0-win-x64.exe` est signé avec un **certificat auto-signé**
  (signtool dans le build) → **ne supprime PAS** le warning SmartScreen.
- **Trusted Signing non configuré** sur Azure (vérifié : rien trouvé côté portail).
- Conséquence : au 1er lancement, l'acheteur voit l'écran bleu SmartScreen et doit faire
  « Informations complémentaires → Exécuter quand même ».

## Pourquoi ça arrive

SmartScreen fait confiance aux exécutables signés par un certificat **reconnu** (OV ou EV)
émis par une autorité de certification, OU à ceux ayant acquis une **réputation** (beaucoup
de téléchargements sans incident). Un certificat auto-signé n'apporte ni l'un ni l'autre.

## Les options (de la moins à la plus coûteuse)

### Option 0 — Distribuer non signé (état actuel, 0 €)
- **Faisable immédiatement.** 90 % des petits éditeurs démarrent ainsi.
- Mitigations :
  - Page de téléchargement avec **instructions claires + capture d'écran** du clic
    « Informations complémentaires → Exécuter quand même ».
  - Hébergement sur **ton domaine** (downloads.upgradedbikes.com) → plus rassurant qu'un
    lien Dropbox/WeTransfer.
  - La réputation SmartScreen s'améliore avec le volume de téléchargements.
- **Limite** : friction à l'installation, peut faire fuir des clients moins techniques.

### Option 1 — Microsoft Trusted Signing (~10 $/mois) ⭐ recommandé à terme
- Service Azure de signature de code, **bien moins cher** qu'un certificat EV classique.
- **Pré-requis** :
  - Compte Azure.
  - **Entité juridique avec n° d'enregistrement (SIRET) vérifiable.**
  - Depuis 2025, Microsoft exige généralement **3 ans d'ancienneté** de l'organisation
    pour la validation d'identité « Public Trust ». Les particuliers et entités récentes
    sont souvent refusés.
- **Marche à suivre quand éligible** :
  1. Azure → créer une ressource **Trusted Signing Account**.
  2. Créer un **Certificate Profile** (type « Public Trust »).
  3. Faire valider l'**identité de l'organisation** (peut prendre quelques jours).
  4. Brancher dans `electron-builder.config.yml` via la variable d'env / l'outil
     `Azure.CodeSigning.Dlib` (electron-builder supporte Trusted Signing).
- **Effet** : warning SmartScreen supprimé immédiatement (Public Trust).

### Option 2 — Certificat OV/EV classique (150–400 €/an)
- Émis par Sectigo, DigiCert, SSL.com, etc.
- **OV** : réputation à construire (le warning peut persister au début).
- **EV** (certificat sur token matériel) : confiance SmartScreen **immédiate**, mais plus cher
  et token physique à gérer.
- Branché dans electron-builder via `win.certificateFile` + `certificatePassword`
  (ou signtool avec le token EV).

## Recommandation

1. **Maintenant** : distribuer en **Option 0** (non signé) avec de bonnes instructions.
   Ne pas bloquer le lancement commercial pour ça.
2. **Dès que l'entité juridique le permet** (SIRET + ancienneté) : passer en **Option 1
   (Trusted Signing)** — meilleur rapport qualité/prix.
3. **Si besoin de confiance immédiate avant d'être éligible Trusted Signing** : Option 2 EV.

## Branchement electron-builder (pour mémoire, quand un certificat sera dispo)

```yaml
# electron-builder.config.yml — section win:
win:
  # Option 2 (certificat fichier) :
  # certificateFile: path/to/cert.pfx
  # certificatePassword: ${env.CSC_KEY_PASSWORD}

  # Option 1 (Trusted Signing) : via variables d'env Azure + dlib
  #   AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET
  #   + endpoint Trusted Signing + nom du certificate profile
  # electron-builder détecte la config Trusted Signing automatiquement.
  forceCodeSigning: false   # passer à true une fois un vrai certificat en place
```

## À faire la prochaine fois que tu ouvres ce sujet

1. Confirmer l'éligibilité Trusted Signing (entité + ancienneté).
2. Si éligible → créer la ressource Azure + profil + validation d'identité.
3. Me redonner la main → je branche la signature dans le build et on teste.
4. Mettre `forceCodeSigning: true` + rebuild → installateur signé sans warning.
