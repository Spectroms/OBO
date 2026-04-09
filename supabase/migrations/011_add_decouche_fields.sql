alter table public.entries
  add column if not exists decouche boolean not null default false,
  add column if not exists decouche_zone text;

alter table public.entries
  drop constraint if exists entries_decouche_zone_check;

alter table public.entries
  add constraint entries_decouche_zone_check
  check (decouche_zone is null or decouche_zone in ('france', 'etranger'));
