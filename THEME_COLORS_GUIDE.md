# 🎨 Guide des Couleurs Thématiques

**Date**: 15 octobre 2025 - 10h50  
**Système**: Couleurs pastels distinctes par section

---

## 🎯 Palette de Couleurs

### 🔧 Tickets - Bleu Pastel
**Thème**: Confiance, Technique, Réparation

```
Couleur Principale:  #64B5F6  ████████  Bleu clair
Couleur Claire:      #E3F2FD  ████████  Bleu très clair
Couleur Foncée:      #42A5F5  ████████  Bleu moyen
Fond:                #F5FAFF  ████████  Fond bleu très léger
Bordure:             #BBDEFB  ████████  Bordure bleu pastel
Hover:               #90CAF9  ████████  Hover bleu
Texte:               #1976D2  ████████  Texte bleu foncé
```

**Utilisation**:
- Header avec fond bleu très léger
- Bordures bleues sur les cards
- Boutons bleus
- Chip statut bleu
- Icône: 🔧

---

### 📋 Devis - Violet Pastel
**Thème**: Créativité, Proposition, Estimation

```
Couleur Principale:  #BA68C8  ████████  Violet clair
Couleur Claire:      #F3E5F5  ████████  Violet très clair
Couleur Foncée:      #AB47BC  ████████  Violet moyen
Fond:                #FAF5FF  ████████  Fond violet très léger
Bordure:             #E1BEE7  ████████  Bordure violet pastel
Hover:               #CE93D8  ████████  Hover violet
Texte:               #7B1FA2  ████████  Texte violet foncé
```

**Utilisation**:
- Header avec fond violet très léger
- Bordures violettes sur les cards
- Boutons violets
- Chip statut violet
- Icône: 📋

---

### 💰 Factures - Vert Pastel
**Thème**: Validation, Argent, Paiement

```
Couleur Principale:  #81C784  ████████  Vert clair
Couleur Claire:      #E8F5E9  ████████  Vert très clair
Couleur Foncée:      #66BB6A  ████████  Vert moyen
Fond:                #F5FFF5  ████████  Fond vert très léger
Bordure:             #C8E6C9  ████████  Bordure vert pastel
Hover:               #A5D6A7  ████████  Hover vert
Texte:               #388E3C  ████████  Texte vert foncé
```

**Utilisation**:
- Header avec fond vert très léger
- Bordures vertes sur les cards
- Boutons verts
- Chip statut vert
- Icône: 💰

---

### 🔄 Avoirs - Orange Pastel
**Thème**: Attention, Remboursement, Crédit

```
Couleur Principale:  #FFB74D  ████████  Orange clair
Couleur Claire:      #FFF3E0  ████████  Orange très clair
Couleur Foncée:      #FFA726  ████████  Orange moyen
Fond:                #FFFAF5  ████████  Fond orange très léger
Bordure:             #FFE0B2  ████████  Bordure orange pastel
Hover:               #FFCC80  ████████  Hover orange
Texte:               #F57C00  ████████  Texte orange foncé
```

**Utilisation**:
- Header avec fond orange très léger
- Bordures oranges sur les cards
- Boutons oranges
- Chip statut orange
- Icône: 🔄

---

## 🔧 Implémentation

### Fichiers Créés

1. **`src/lib/theme-colors.ts`**
   - Définition des palettes
   - Types TypeScript
   - Fonctions utilitaires

2. **`src/hooks/usePageTheme.ts`**
   - Hook React
   - Détection automatique depuis URL
   - Override possible

### Utilisation dans un Composant

```typescript
import { usePageTheme } from "@/hooks/usePageTheme";

export default function MyPage() {
  const theme = usePageTheme('ticket'); // ou 'quote', 'invoice', 'credit'
  
  return (
    <Box sx={{ 
      bgcolor: theme.background,
      borderColor: theme.border,
      color: theme.text
    }}>
      <Button sx={{
        bgcolor: theme.primary,
        '&:hover': {
          bgcolor: theme.primaryDark
        }
      }}>
        Action
      </Button>
    </Box>
  );
}
```

### Détection Automatique

Le hook détecte automatiquement le thème depuis l'URL:
- `/tickets/*` → Bleu
- `/quotes/*` ou `/devis/*` → Violet
- `/invoices/*` ou `/factures/*` → Vert
- `/credits/*` ou `/avoirs/*` → Orange

---

## 🎨 Éléments Stylisés

### Header
- Fond: `theme.background`
- Bordure: `theme.border` (2px)
- Titre: `theme.text` avec icône
- Chip statut: `theme.primary`
- Boutons: bordure `theme.primary`, hover `theme.primaryLight`

### Cards
- Fond: `theme.background`
- Bordure: `theme.border` (2px)
- Élévation: 0 (flat design)

### Boutons
- **Primary**: `bgcolor: theme.primary`, hover `theme.primaryDark`
- **Outlined**: `borderColor: theme.primary`, hover `bgcolor: theme.primaryLight`

### Chips
- Fond: `theme.primary`
- Texte: blanc
- Font-weight: bold

---

## 📊 Comparaison Visuelle

```
┌─────────────────────────────────────────────────────────┐
│ 🔧 Ticket #4ac455ln                    [Actualiser]     │  ← Bleu
├─────────────────────────────────────────────────────────┤
│ Client: Jean Dupont • Vélo: Giant TCR                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 📋 Devis #DEV-2025-001                 [Actualiser]     │  ← Violet
├─────────────────────────────────────────────────────────┤
│ Client: Marie Martin • Total: 250€ HT                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 💰 Facture #FAC-2025-042               [Actualiser]     │  ← Vert
├─────────────────────────────────────────────────────────┤
│ Client: Pierre Durand • Total: 180€ TTC                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 🔄 Avoir #AVO-2025-003                 [Actualiser]     │  ← Orange
├─────────────────────────────────────────────────────────┤
│ Client: Sophie Petit • Montant: -50€                    │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ Avantages

### UX
- ✅ **Identification rapide** de la section
- ✅ **Cohérence visuelle** dans chaque section
- ✅ **Distinction claire** entre types de documents
- ✅ **Couleurs apaisantes** (pastels)

### Accessibilité
- ✅ Contraste suffisant pour lisibilité
- ✅ Couleurs distinctes pour daltoniens
- ✅ Pas de couleurs criardes
- ✅ Hiérarchie visuelle claire

### Maintenance
- ✅ Centralisé dans un fichier
- ✅ Facile à modifier
- ✅ TypeScript pour sécurité
- ✅ Réutilisable partout

---

## 🚀 Prochaines Étapes

### Immédiat
- [x] Créer système de couleurs
- [x] Appliquer à page Ticket
- [ ] Appliquer à page Devis
- [ ] Appliquer à page Factures
- [ ] Appliquer à page Avoirs

### Court Terme
- [ ] Appliquer aux dialogs
- [ ] Appliquer aux listes
- [ ] Animations transitions
- [ ] Mode sombre (optionnel)

### Moyen Terme
- [ ] Personnalisation utilisateur
- [ ] Thèmes additionnels
- [ ] Export palette design
- [ ] Documentation design system

---

## 🎨 Palette Complète (Hex)

```css
/* Tickets - Bleu */
--ticket-primary: #64B5F6;
--ticket-light: #E3F2FD;
--ticket-dark: #42A5F5;
--ticket-bg: #F5FAFF;
--ticket-border: #BBDEFB;
--ticket-hover: #90CAF9;
--ticket-text: #1976D2;

/* Devis - Violet */
--quote-primary: #BA68C8;
--quote-light: #F3E5F5;
--quote-dark: #AB47BC;
--quote-bg: #FAF5FF;
--quote-border: #E1BEE7;
--quote-hover: #CE93D8;
--quote-text: #7B1FA2;

/* Factures - Vert */
--invoice-primary: #81C784;
--invoice-light: #E8F5E9;
--invoice-dark: #66BB6A;
--invoice-bg: #F5FFF5;
--invoice-border: #C8E6C9;
--invoice-hover: #A5D6A7;
--invoice-text: #388E3C;

/* Avoirs - Orange */
--credit-primary: #FFB74D;
--credit-light: #FFF3E0;
--credit-dark: #FFA726;
--credit-bg: #FFFAF5;
--credit-border: #FFE0B2;
--credit-hover: #FFCC80;
--credit-text: #F57C00;
```

---

**Créé le**: 15 octobre 2025  
**Auteur**: Système de design Atelier Vélo+

© 2024-2025 Jérôme Leyssard - Upgraded Bikes
