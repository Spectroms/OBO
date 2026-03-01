# Dépannage : erreurs 500 Supabase

Si l’application affiche des erreurs **500 (Internal Server Error)** sur toutes les requêtes vers Supabase (profiles, entries), le problème vient du **projet Supabase**, pas du code de l’app.

## Erreur « infinite recursion detected in policy for relation "profiles" »

Si les logs Supabase affichent ce message, les politiques RLS sur `profiles` provoquent une récursion. **Correction :**

1. Ouvrez **Supabase** → **SQL Editor**.
2. Copiez-collez tout le contenu du fichier **`supabase/migrations/007_fix_profiles_rls_recursion_again.sql`**.
3. Cliquez sur **Run**.
4. Réessayez l’application (rafraîchir la page, refaire un import si besoin).

## 1. Vérifier si le projet est en pause

Sur l’offre gratuite, Supabase **met le projet en pause** après une période d’inactivité.

- Ouvrez [Supabase Dashboard](https://supabase.com/dashboard).
- Si le projet est marqué **« Paused »**, cliquez sur **« Restore project »** et attendez quelques minutes.

## 2. Consulter les logs pour voir l’erreur exacte

- Dans le tableau de bord : **Logs** (menu de gauche), ou **Database** → **Logs**.
- Regardez les requêtes qui échouent et le **message d’erreur PostgreSQL** (ex. trigger, RLS, contrainte).
- Cela indiquera la cause réelle du 500 (trigger, politique RLS, type de donnée, etc.).

## 3. Vérifier que les migrations sont appliquées

- **SQL Editor** : exécutez `SELECT count(*) FROM public.entries;` et `SELECT count(*) FROM public.profiles;`.
- Si les tables n’existent pas ou une migration a échoué, réexécutez les fichiers dans `supabase/migrations/` dans l’ordre (001, 002, 003, 004, 006).

## 4. Erreur « Unexpected token 'export' » dans la console

- Elle vient en général d’une **extension de navigateur** (ex. `webpage_content_reporter.js`), pas de l’app.
- Vous pouvez l’ignorer ou désactiver l’extension concernée.
