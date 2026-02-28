-- Tables
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'employee' check (role in ('employee', 'chef_depot', 'patronne'))
);

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  day_type text not null default 'normal' check (day_type in ('normal', 'ferie', 'cp', 'recup')),
  slots jsonb default '[]',
  activity text,
  note text,
  total_minutes integer default 0,
  updated_at timestamptz default now(),
  unique(user_id, date)
);

create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;
drop trigger if exists entries_updated_at on public.entries;
create trigger entries_updated_at before update on public.entries for each row execute function public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;
alter table public.entries enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Team view can read all profiles" on public.profiles;
create policy "Users can read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Team view can read all profiles" on public.profiles for select using (
  (select role from public.profiles where id = auth.uid()) in ('chef_depot', 'patronne')
);

drop policy if exists "Users can manage own entries" on public.entries;
drop policy if exists "Team view can read all entries" on public.entries;
create policy "Users can manage own entries" on public.entries for all using (auth.uid() = user_id);
create policy "Team view can read all entries" on public.entries for select using (
  (select role from public.profiles where id = auth.uid()) in ('chef_depot', 'patronne')
);

-- Optional: create profile on first signup (run via Supabase Dashboard or trigger)
-- insert into public.profiles (id, email, display_name, role) values (auth.uid(), (select email from auth.users where id = auth.uid()), null, 'employee') on conflict (id) do nothing;
