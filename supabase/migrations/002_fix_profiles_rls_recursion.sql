-- Fix: "infinite recursion detected in policy for relation profiles"
-- The policies that SELECT from profiles while checking profiles RLS cause recursion.
-- Use a SECURITY DEFINER function so the role check does not go through RLS.

create or replace function public.get_my_role() returns text as $$
  select role from public.profiles where id = auth.uid() limit 1;
$$ language sql security definer stable set search_path = public;

-- Allow authenticated users to call the function (needed when RLS policies run)
grant execute on function public.get_my_role() to authenticated;
grant execute on function public.get_my_role() to anon;

-- Drop the policies that use the recursive subquery
drop policy if exists "Team view can read all profiles" on public.profiles;
drop policy if exists "Team view can read all entries" on public.entries;

-- Recreate them using the function (no direct read on profiles in the policy)
create policy "Team view can read all profiles" on public.profiles for select using (
  public.get_my_role() in ('chef_depot', 'patronne')
);
create policy "Team view can read all entries" on public.entries for select using (
  public.get_my_role() in ('chef_depot', 'patronne')
);
