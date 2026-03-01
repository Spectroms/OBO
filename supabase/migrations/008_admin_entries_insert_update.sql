-- Les comptes chef_depot et patronne peuvent insérer et mettre à jour les entrées (horaires) de n'importe quel utilisateur (pour l'import admin).
create policy "Admins can insert entries for any user" on public.entries
  for insert with check (public.get_my_role() in ('chef_depot', 'patronne'));

create policy "Admins can update entries for any user" on public.entries
  for update using (public.get_my_role() in ('chef_depot', 'patronne'));
