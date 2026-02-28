-- Désactive les politiques qui provoquent la récursion infinie.
-- Après cette migration, chaque utilisateur peut lire/modifier uniquement son propre profil.
-- La « vue équipe » (tableau de bord) ne pourra plus lire les autres profils tant que
-- la migration 002 (get_my_role) n’a pas été exécutée avec succès.

drop policy if exists "Team view can read all profiles" on public.profiles;
drop policy if exists "Team view can read all entries" on public.entries;
