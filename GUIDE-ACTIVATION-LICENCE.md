# 🔑 Guide d'Activation de Licence - Atelier Vélo+

## Vue d'ensemble

Chaque licence Atelier Vélo+ est **liée à un ordinateur spécifique** pour éviter le partage non autorisé. 
Ce guide explique comment obtenir et activer votre licence.

---

## 📋 Procédure d'activation

### Étape 1 : Récupérer votre Identifiant Machine

1. Ouvrez l'application **Atelier Vélo+**
2. Allez dans **Mon Compte** (menu en haut à droite)
3. Dans la section **"IDENTIFIANT MACHINE"**, vous verrez un code de 16 caractères
4. Cliquez sur **"Copier"** pour copier ce code

**Exemple d'identifiant :** `ABC123DEF456GH78`

> ⚠️ **Important** : Cet identifiant est unique à votre ordinateur. Une licence générée pour un autre ordinateur ne fonctionnera pas sur le vôtre.

### Étape 2 : Commander votre licence

Lors de votre commande, communiquez :
- Votre **Identifiant Machine** (16 caractères)
- Votre **nom/raison sociale**
- Votre **email**
- Le **type de licence** souhaité :
  - **Basique** (199€/an) : 30 emails/mois, création PDF
  - **Pro** (359€/an) : Illimité, envoi PDF direct, marketing
  - **Pro Lifetime** (599€) : Pro à vie, 3 ans de maintenance

### Étape 3 : Recevoir votre clé de licence

Vous recevrez une clé de licence au format :
```
AVPR-XXXX-XXXX-VOTRE_ID_MACHINE-[signature RSA]
```

Cette clé est **personnalisée pour votre machine** et ne fonctionnera que sur l'ordinateur correspondant à l'identifiant fourni.

### Étape 4 : Activer la licence

1. Ouvrez **Atelier Vélo+**
2. Allez dans **Mon Compte** > **Gérer ma licence** (ou **Voir les offres** si en période d'essai)
3. Cliquez sur **"Activer une licence"**
4. Collez votre clé de licence
5. Renseignez votre email et nom
6. Cliquez sur **"Activer"**

✅ Votre licence est maintenant active !

---

## ❓ Questions fréquentes

### J'ai changé d'ordinateur, que faire ?

Contactez le support avec :
- Votre ancienne clé de licence
- Le nouvel **Identifiant Machine** de votre nouveau PC
- Une preuve d'achat

Nous générerons une nouvelle clé pour votre nouveau matériel.

### Ma licence ne fonctionne pas

Vérifiez que :
1. L'**Identifiant Machine** affiché dans Mon Compte correspond à celui utilisé pour générer la licence
2. Vous avez copié la clé **complète** (elle est très longue)
3. Vous n'avez pas de faute de frappe

Si le problème persiste, contactez le support avec une capture d'écran de l'erreur.

### Puis-je utiliser ma licence sur plusieurs ordinateurs ?

Non, chaque licence est liée à **un seul ordinateur**. Si vous avez besoin d'utiliser Atelier Vélo+ sur plusieurs postes, vous devez acheter une licence pour chaque machine.

### Que se passe-t-il si je réinstalle Windows ?

L'identifiant machine est basé sur le matériel (carte réseau, processeur, etc.). Une réinstallation de Windows ne devrait pas changer votre identifiant. Si c'est le cas, contactez le support.

---

## 📞 Support

Pour toute question concernant les licences :
- Email : support@atelier-velo-plus.fr
- Incluez toujours votre **Identifiant Machine** et **clé de licence** (si vous en avez une)

---

## 🔧 Pour les administrateurs (génération de licences)

### Générer une licence

```bash
cd license-generator
node generate-license.js <tier> [date] --hwid <ID_MACHINE> --atelier "Nom Client"
```

### Exemples

```bash
# Trial 14 jours
node generate-license.js trial --hwid ABC123DEF456GH78

# Basique 1 an (date auto +365 jours)
node generate-license.js basique auto --hwid ABC123DEF456GH78 --atelier "Vélo Passion"

# Pro 1 an
node generate-license.js pro auto --hwid ABC123DEF456GH78 --atelier "Bike Shop Paris"

# Pro Lifetime
node generate-license.js pro_lifetime --hwid ABC123DEF456GH78 --atelier "Atelier Pro"

# Pro avec date personnalisée
node generate-license.js pro 31 12 2025 --hwid ABC123DEF456GH78 --atelier "Cycle Service"
```

### Paramètres

| Paramètre | Description | Obligatoire |
|-----------|-------------|-------------|
| `tier` | Type de licence (trial, basique, pro, pro_lifetime) | ✅ Oui |
| `--hwid` | Identifiant machine du client (16 caractères) | ✅ Oui |
| `--atelier` | Nom de l'atelier client | Non |
| `auto` | Date expiration automatique (+365 jours) | Non |
| `J M A` | Date personnalisée (jour mois année) | Non |

### Format de la clé générée

```
AVPR-XXXX-MMYY-HWIDXXXXXXXX-[512 caractères signature RSA]
```

- `AVPR` : Préfixe tier (AVTR=Trial, AVBS=Basique, AVPR=Pro, AVPL=Pro Lifetime)
- `XXXX` : Segment aléatoire
- `MMYY` : Date expiration (0000 pour Lifetime)
- `HWIDXXXXXXXX` : Identifiant machine (16 chars)
- `[signature]` : Signature RSA 2048 bits (512 chars hex)

---

*Dernière mise à jour : 10 décembre 2025*
