-- Gym Tracker MVP — initial schema

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  muscle text not null,
  workout_type text not null,
  split text not null,
  default_sets integer not null default 3,
  tracking_type text not null check (tracking_type in ('weighted', 'assisted', 'bodyweight', 'timed')),
  notes text,
  created_at timestamptz not null default now()
);

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  week text not null,
  split text not null,
  status text not null default 'draft' check (status in ('draft', 'completed')),
  notes text,
  created_at timestamptz not null default now()
);

create index workouts_week_idx on public.workouts (week);
create index workouts_date_idx on public.workouts (date desc);
create index workouts_status_idx on public.workouts (status);

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  set_number integer not null,
  reps numeric,
  weight numeric,
  rir numeric,
  duration_seconds numeric,
  volume numeric,
  note text,
  created_at timestamptz not null default now(),
  unique (workout_id, exercise_id, set_number)
);

create index workout_sets_workout_id_idx on public.workout_sets (workout_id);
create index workout_sets_exercise_id_idx on public.workout_sets (exercise_id);

create table public.weight_options (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid references public.exercises (id) on delete cascade,
  value numeric not null,
  label text,
  created_at timestamptz not null default now()
);

create index weight_options_exercise_id_idx on public.weight_options (exercise_id);
create index weight_options_global_idx on public.weight_options (exercise_id) where exercise_id is null;

-- Aggregated weekly volume (completed workouts only)
create or replace view public.weekly_volume_summary as
select
  w.week,
  e.name as exercise,
  e.muscle,
  count(ws.id)::bigint as total_sets,
  sum(ws.reps) as total_reps,
  sum(ws.volume) as total_volume
from public.workout_sets ws
join public.workouts w on w.id = ws.workout_id
join public.exercises e on e.id = ws.exercise_id
where w.status = 'completed'
group by w.week, e.name, e.muscle;

alter table public.exercises enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_sets enable row level security;
alter table public.weight_options enable row level security;

-- MVP: open policies for anon/authenticated (private deploy recommended — lock down with auth later)
create policy "exercises_allow_all" on public.exercises for all using (true) with check (true);
create policy "workouts_allow_all" on public.workouts for all using (true) with check (true);
create policy "workout_sets_allow_all" on public.workout_sets for all using (true) with check (true);
create policy "weight_options_allow_all" on public.weight_options for all using (true) with check (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.exercises to anon, authenticated;
grant select, insert, update, delete on public.workouts to anon, authenticated;
grant select, insert, update, delete on public.workout_sets to anon, authenticated;
grant select, insert, update, delete on public.weight_options to anon, authenticated;
grant select on public.weekly_volume_summary to anon, authenticated;
