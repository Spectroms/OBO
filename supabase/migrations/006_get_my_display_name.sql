-- Retourne le display_name de l'utilisateur connecté (lecture fiable côté serveur).
create or replace function public.get_my_display_name()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select display_name from public.profiles where id = auth.uid() limit 1;
$$;

grant execute on function public.get_my_display_name() to authenticated;
grant execute on function public.get_my_display_name() to anon;
