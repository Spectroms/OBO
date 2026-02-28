# OBO Horaires

Application de gestion des horaires de travail : saisie au jour le jour, calendrier, récap, export PDF/Excel, rappel en fin de journée, tableau de bord (vue équipe).

## Stack

- React 18 + Vite 5
- React Router v6
- Supabase (Auth email/mot de passe + PostgreSQL)
- Hébergement : Vercel

## Installation

```bash
npm install
cp .env.example .env
```

Renseigner dans `.env` :
- `VITE_SUPABASE_URL` : URL du projet Supabase
- `VITE_SUPABASE_ANON_KEY` : clé anon Supabase

## Supabase

1. Créer un projet sur [supabase.com](https://supabase.com).
2. Dans l’éditeur SQL, exécuter le contenu de `supabase/migrations/001_initial.sql` pour créer les tables `profiles`, `entries` et les politiques RLS.
3. Activer l’auth par email/mot de passe dans Authentication > Providers.

Pour donner à un utilisateur l’accès au tableau de bord (vue équipe), mettre à jour en base le champ `role` de sa ligne dans `profiles` : `chef_depot` ou `patronne`. Ces libellés ne s’affichent pas dans l’interface (menu « Tableau de bord »).

## Développement

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Déploiement Vercel

1. Connecter le dépôt Git à Vercel.
2. Configurer les variables d’environnement : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
3. Déployer (build automatique avec `vercel.json`).

## Logo

Placer le fichier logo (OBO + « horaires ») dans `public/logo.png` pour l’affichage dans le header et la page de connexion.
