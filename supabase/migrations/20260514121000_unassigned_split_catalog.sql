-- Reserved split for exercises not tied to an active program (see lib/constants UNASSIGNED_SPLIT_NAME).
insert into public.workout_splits (name, sort_order)
values ('Unassigned', 999999)
on conflict (name) do nothing;
