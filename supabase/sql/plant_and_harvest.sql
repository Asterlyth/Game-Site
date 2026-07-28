-- Atomic planting and harvesting RPCs. Run this in the Supabase SQL editor
-- alongside buy_seed.sql.
--
-- Assumes:
--   farms.owner_id references auth.users.id
--   plots.farm_id references farms.id
--   plantings.plot_id references plots.id (one planting per plot)
--   crops.id matches the id type used as inventory keys (e.g. text slug)
--   profiles.id references auth.users.id, profiles.inventory is jsonb

create or replace function public.plant_seed(plot_id uuid, crop_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_plot_id uuid := plot_id;
  v_crop_id text := crop_id;
  v_owner_id uuid;
  v_existing_planting boolean;
  v_qty numeric;
  v_planted_at timestamptz := now();
  v_inventory jsonb;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select f.owner_id into v_owner_id
  from plots p
  join farms f on f.id = p.farm_id
  where p.id = v_plot_id;

  if v_owner_id is null then
    raise exception 'Plot not found';
  end if;

  if v_owner_id <> v_user_id then
    raise exception 'You do not own this plot';
  end if;

  select exists(select 1 from plantings where plantings.plot_id = v_plot_id)
  into v_existing_planting;

  if v_existing_planting then
    raise exception 'Plot is already planted';
  end if;

  -- lock the profile row so a concurrent plant/buy can't race the same
  -- inventory count
  select coalesce((inventory ->> v_crop_id)::numeric, 0) into v_qty
  from profiles
  where id = v_user_id
  for update;

  if v_qty is null then
    raise exception 'Profile not found for user %', v_user_id;
  end if;

  if v_qty < 1 then
    raise exception 'You do not have that seed in your inventory';
  end if;

  insert into plantings (plot_id, crop_id, planted_at)
  values (v_plot_id, v_crop_id, v_planted_at);

  update profiles
  set inventory = jsonb_set(
    coalesce(inventory, '{}'::jsonb),
    array[v_crop_id],
    to_jsonb(v_qty - 1)
  )
  where id = v_user_id
  returning inventory into v_inventory;

  return jsonb_build_object(
    'plot_id', v_plot_id,
    'crop_id', v_crop_id,
    'planted_at', v_planted_at,
    'inventory', v_inventory
  );
end;
$$;

grant execute on function public.plant_seed(uuid, text) to authenticated;


create or replace function public.harvest_plot(plot_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_plot_id uuid := plot_id;
  v_owner_id uuid;
  v_crop_id text;
  v_planted_at timestamptz;
  v_grow_seconds numeric;
  v_sell_price numeric;
  v_currency numeric;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select f.owner_id into v_owner_id
  from plots p
  join farms f on f.id = p.farm_id
  where p.id = v_plot_id;

  if v_owner_id is null then
    raise exception 'Plot not found';
  end if;

  if v_owner_id <> v_user_id then
    raise exception 'You do not own this plot';
  end if;

  select pl.crop_id, pl.planted_at, c.grow_seconds, c.sell_price
  into v_crop_id, v_planted_at, v_grow_seconds, v_sell_price
  from plantings pl
  join crops c on c.id = pl.crop_id
  where pl.plot_id = v_plot_id
  for update of pl;

  if v_crop_id is null then
    raise exception 'Nothing planted on this plot';
  end if;

  if extract(epoch from (now() - v_planted_at)) < v_grow_seconds then
    raise exception 'Crop is not ready yet';
  end if;

  delete from plantings where plantings.plot_id = v_plot_id;

  update profiles
  set currency = currency + v_sell_price
  where id = v_user_id
  returning currency into v_currency;

  return jsonb_build_object(
    'plot_id', v_plot_id,
    'crop_id', v_crop_id,
    'currency', v_currency
  );
end;
$$;

grant execute on function public.harvest_plot(uuid) to authenticated;
