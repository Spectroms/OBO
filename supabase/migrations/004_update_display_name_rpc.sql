-- Met à jour le display_name de l'utilisateur connecté sans passer par les politiques RLS.
-- Crée le profil s'il n'existe pas (compte créé avant la saisie du nom).

create or replace function public.update_my_display_name(new_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  user_email text;
begin
  select email into user_email from auth.users where id = auth.uid() limit 1;
  insert into public.profiles (id, email, display_name, role)
  values (auth.uid(), coalesce(user_email, ''), new_name, 'employee')
  on conflict (id) do update set display_name = new_name;
end;
$$;

grant execute on function public.update_my_display_name(text) to authenticated;
grant execute on function public.update_my_display_name(text) to anon;
