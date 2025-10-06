# Système de surveillance des métriques

Ce document décrit comment configurer et utiliser le système de surveillance des métriques de l'application Atelier Vélo.

## Fonctionnalités

- Suivi des métriques Core Web Vitals (LCP, FID, CLS, etc.)
- Suivi des erreurs JavaScript non capturées
- Suivi des navigations et des performances des pages
- Tableau de bord d'administration pour visualiser les métriques
- Stockage sécurisé des données avec Supabase

## Prérequis

- Compte [Supabase](https://supabase.com/)
- Base de données PostgreSQL configurée

## Configuration

1. **Configuration de Supabase**
   - Créez un nouveau projet sur Supabase
   - Allez dans "Table Editor" et créez une nouvelle table `metrics` avec le schéma suivant :

   ```sql
   create table public.metrics (
     id uuid not null default gen_random_uuid(),
     name text not null,
     value double precision,
     data jsonb,
     timestamp timestamp with time zone not null default now(),
     user_agent text,
     path text,

     constraint metrics_pkey primary key (id)
   );

   -- Activer l'accès en lecture/écriture via l'API
   alter table public.metrics enable row level security;

   create policy "Enable read access for authenticated users"
     on public.metrics
     for select
     to authenticated
     using (true);

   create policy "Enable insert for service role"
     on public.metrics
     for insert
     to service_role
     with check (true);
   ```

2. **Configuration des variables d'environnement**
   Créez un fichier `.env.local` à la racine du projet web avec les variables suivantes :

   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anonyme
   SUPABASE_SERVICE_KEY=votre_cle_service

   # Activation des métriques (true/false)
   NEXT_PUBLIC_METRICS_ENABLED=true
   ```

## Utilisation

### Dans les composants React

```typescript
import { metrics } from "@/lib/metrics/init";

// Envoyer une métrique personnalisée
metrics.logCustom("user_action", {
  action: "button_click",
  component: "CheckoutButton",
  duration: 150, // ms
});
```

### Accès au tableau de bord

Le tableau de bord des métriques est accessible à l'adresse :

```
/admin/metrics
```

## Métriques suivies

### Core Web Vitals

- **LCP** (Largest Contentful Paint) : Temps de chargement du plus grand élément visible
- **FID** (First Input Delay) : Délai avant la première interaction
- **CLS** (Cumulative Layout Shift) : Stabilité visuelle
- **FCP** (First Contentful Paint) : Premier rendu de contenu
- **TTFB** (Time To First Byte) : Temps de réponse du serveur

### Métriques personnalisées

- **navigation** : Suivi des changements de page
- **error** : Erreurs JavaScript non capturées
- **user_action** : Actions utilisateur personnalisées

## Sécurité

- Les métriques sont envoyées uniquement en production (`NODE_ENV === 'production'`)
- L'accès au tableau de bord est protégé par l'authentification
- Les données sensibles ne sont jamais enregistrées

## Dépannage

### Les métriques ne s'envoient pas

1. Vérifiez que `NEXT_PUBLIC_METRICS_ENABLED` est défini sur `true`
2. Vérifiez la console du navigateur pour les erreurs
3. Vérifiez que les clés d'API Supabase sont correctes

### Le tableau de bord ne se charge pas

1. Vérifiez que vous êtes connecté
2. Vérifiez que la table `metrics` existe dans Supabase
3. Vérifiez les permissions RLS (Row Level Security)

## Licence

MIT
