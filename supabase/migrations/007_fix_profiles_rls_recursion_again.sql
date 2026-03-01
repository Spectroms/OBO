-- Corrige "infinite recursion detected in policy for relation profiles"
-- À exécuter dans Supabase > SQL Editor si les erreurs 500 persistent.
-- Les politiques qui font (SELECT role FROM profiles...) dans la RLS de profiles/entries
-- provoquent une récursion ; on utilise une fonction SECURITY DEFINER à la place.

create or replace function public.get_my_role() returns text as $$
  select role from public.profiles where id = auth.uid() limit 1;
$$ language sql security definer stable set search_path = public;

grant execute on function public.get_my_role() to authenticated;
grant execute on function public.get_my_role() to anon;

-- Supprimer les anciennes politiques récursives
drop policy if exists "Team view can read all profiles" on public.profiles;
drop policy if exists "Team view can read all entries" on public.entries;

-- Les recréer en utilisant get_my_role() (pas de lecture RLS sur profiles)
create policy "Team view can read all profiles" on public.profiles for select using (
  public.get_my_role() in ('chef_depot', 'patronne')
);
create policy "Team view can read all entries" on public.entries for select using (
  public.get_my_role() in ('chef_depot', 'patronne')
);
