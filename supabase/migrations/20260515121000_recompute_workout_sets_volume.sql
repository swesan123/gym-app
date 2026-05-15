-- Recompute stored volume so progress views match computeSetVolume (assisted uses body weight).
update public.workout_sets ws
set volume = v.computed
from public.exercises e
left join public.user_training_profile p on p.singleton = true
cross join lateral (
  select
    case e.tracking_type
      when 'weighted' then
        case
          when ws.reps is not null and ws.weight is not null then ws.reps * ws.weight
          else null::numeric
        end
      when 'assisted' then
        case
          when ws.reps is not null
            and ws.weight is not null
            and p.body_weight is not null
          then ws.reps * greatest(0::numeric, p.body_weight - ws.weight)
          else null::numeric
        end
      when 'bodyweight' then
        case
          when ws.reps is not null and p.body_weight is not null
          then ws.reps * (p.body_weight + coalesce(ws.weight, 0::numeric))
          else null::numeric
        end
      when 'timed' then null::numeric
      else null::numeric
    end as computed
) v
where ws.exercise_id = e.id;
