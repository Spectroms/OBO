-- Supprime le profil de l'utilisateur connecté (et ses entrées en cascade).
-- Utilisé si l'Edge Function "delete-account" n'est pas déployée.

create or replace function public.delete_my_profile()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.profiles where id = auth.uid();
end;
$$;

grant execute on function public.delete_my_profile() to authenticated;
