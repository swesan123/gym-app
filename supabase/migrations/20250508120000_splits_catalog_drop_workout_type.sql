-- Named splits catalog (custom splits + defaults). Workouts reference split by name text.

create table public.workout_splits (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

insert into public.workout_splits (name, sort_order) values
('Upper A', 1),
('Upper B', 2),
('Lower A', 3),
('Lower B', 4),
('Lower C', 5)
on conflict (name) do nothing;

alter table public.exercises drop column if exists workout_type;

alter table public.workout_splits enable row level security;

create policy "workout_splits_allow_all" on public.workout_splits for all using (true) with check (true);

grant select, insert, update, delete on public.workout_splits to anon, authenticated;
