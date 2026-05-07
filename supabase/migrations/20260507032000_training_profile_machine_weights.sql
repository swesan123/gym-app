alter table public.exercises
add column if not exists machine_start_weight numeric,
add column if not exists machine_end_weight numeric,
add column if not exists machine_increment numeric;

create table if not exists public.user_training_profile (
  singleton boolean primary key default true check (singleton),
  body_weight numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_training_profile enable row level security;

drop policy if exists "user_training_profile_allow_all" on public.user_training_profile;
create policy "user_training_profile_allow_all"
on public.user_training_profile
for all
using (true)
with check (true);

grant select, insert, update, delete on public.user_training_profile to anon, authenticated;
