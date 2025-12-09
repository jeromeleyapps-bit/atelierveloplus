# Guide : Nouveau compte GitHub pour builds macOS

## Étape 1 : Créer le nouveau compte GitHub

1. Aller sur https://github.com/signup
2. Créer un compte avec une nouvelle adresse email
3. Vérifier l'email

## Étape 2 : Forker le repo (Option A - Recommandé)

1. Se connecter avec le nouveau compte
2. Aller sur : https://github.com/jeromeleyssard-pixel/atelier-velo-plus
3. Cliquer sur **Fork** (en haut à droite)
4. Sélectionner le nouveau compte comme destination
5. **IMPORTANT** : Décocher "Copy the main branch only" pour avoir la branche `macOS`

## Étape 2 : Importer le repo (Option B - Si fork ne fonctionne pas)

1. Aller sur : https://github.com/new/import
2. URL du repo : `https://github.com/jeromeleyssard-pixel/atelier-velo-plus`
3. Nom du nouveau repo : `atelier-velo-plus`
4. Visibilité : Public (pour minutes GitHub Actions illimitées)
5. Cliquer "Begin import"

## Étape 3 : Activer GitHub Actions

1. Aller dans le repo forké/importé
2. Onglet **Actions**
3. Cliquer "I understand my workflows, go ahead and enable them"

## Étape 4 : Lancer le build

### Option A : Créer un tag
```bash
# Cloner le nouveau repo
git clone https://github.com/NOUVEAU_COMPTE/atelier-velo-plus.git
cd atelier-velo-plus
git checkout macOS

# Créer et pousser un tag
git tag -a v1.0.32 -m "v1.0.32 - Test nouveau compte"
git push origin v1.0.32
```

### Option B : Lancer manuellement
1. Onglet **Actions**
2. Sélectionner "Build & Release"
3. Cliquer "Run workflow"
4. Sélectionner la branche `macOS`
5. Cliquer "Run workflow"

## Étape 5 : Récupérer les artifacts

Une fois le build terminé :
1. Onglet **Actions**
2. Cliquer sur le workflow run
3. En bas, section "Artifacts"
4. Télécharger `macos-x64-build`

## Notes importantes

- **Repo public** = Minutes GitHub Actions illimitées
- **Repo privé** = 2000 minutes/mois (macOS = 10x, donc 200 minutes réelles)
- La branche `macOS` contient toutes les corrections
- Le workflow est configuré pour générer une seule architecture par job

## Informations à me donner

Une fois le compte créé :
1. Nom du nouveau compte GitHub
2. URL du repo forké/importé
3. Je pourrai vous aider à lancer le build
