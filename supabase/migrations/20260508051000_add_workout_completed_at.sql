alter table public.workouts
add column if not exists completed_at timestamptz;

update public.workouts
set completed_at = coalesce(completed_at, created_at)
where status = 'completed';
