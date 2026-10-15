-- KOMŞUM güncellemesi · 15 Ekim 2026 (2)
-- Bina acil durum rehberi.
-- Supabase → SQL Editor → New query → bu dosyanın tamamını yapıştır → Run.

-- ---------------------------------------------------------------------
-- Bina acil durum rehberi: yönetici doldurur, tüm üyeler görür.
-- ---------------------------------------------------------------------
create table if not exists public.building_emergency (
  building_id uuid primary key references public.buildings(id),
  water_valve text check (char_length(water_valve) <= 300),
  electric_panel text check (char_length(electric_panel) <= 300),
  gas_valve text check (char_length(gas_valve) <= 300),
  elevator_company text check (char_length(elevator_company) <= 120),
  elevator_phone text check (char_length(elevator_phone) <= 30),
  caretaker_name text check (char_length(caretaker_name) <= 80),
  caretaker_phone text check (char_length(caretaker_phone) <= 30),
  gathering_area text check (char_length(gathering_area) <= 300),
  notes text check (char_length(notes) <= 2000),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
alter table public.building_emergency enable row level security;
revoke insert, update, delete, truncate on public.building_emergency from anon, authenticated;
revoke select on public.building_emergency from anon;
grant select on public.building_emergency to authenticated;
do $$ begin
  drop policy if exists p_emerg_sel on public.building_emergency;
  create policy p_emerg_sel on public.building_emergency for select to authenticated using (is_member(building_id));
end $$;

create or replace function public.save_emergency_info(p_building uuid, p_info jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v jsonb := coalesce(p_info, '{}'::jsonb);
begin
  perform require_manager(p_building);
  insert into building_emergency(building_id, water_valve, electric_panel, gas_valve, elevator_company, elevator_phone,
                                 caretaker_name, caretaker_phone, gathering_area, notes, updated_by, updated_at)
  values (p_building,
    nullif(btrim(v->>'water_valve'),''), nullif(btrim(v->>'electric_panel'),''), nullif(btrim(v->>'gas_valve'),''),
    nullif(btrim(v->>'elevator_company'),''), nullif(btrim(v->>'elevator_phone'),''),
    nullif(btrim(v->>'caretaker_name'),''), nullif(btrim(v->>'caretaker_phone'),''),
    nullif(btrim(v->>'gathering_area'),''), nullif(btrim(v->>'notes'),''), auth.uid(), now())
  on conflict (building_id) do update set
    water_valve = excluded.water_valve, electric_panel = excluded.electric_panel, gas_valve = excluded.gas_valve,
    elevator_company = excluded.elevator_company, elevator_phone = excluded.elevator_phone,
    caretaker_name = excluded.caretaker_name, caretaker_phone = excluded.caretaker_phone,
    gathering_area = excluded.gathering_area, notes = excluded.notes, updated_by = auth.uid(), updated_at = now();
end $$;

-- Yöneticilerin adı ve telefonu (acil durumda herkes görebilsin)
create or replace function public.building_managers(p_building uuid)
returns table(full_name text, phone text)
language sql stable security definer set search_path = public as $$
  select p.full_name, p.phone from memberships m join profiles p on p.id = m.user_id
  where m.building_id = p_building and m.role = 'manager' and m.ended_at is null and is_member(p_building)
$$;

revoke execute on function public.save_emergency_info(uuid, jsonb) from public, anon;
revoke execute on function public.building_managers(uuid) from public, anon;
grant execute on function public.save_emergency_info(uuid, jsonb) to authenticated, service_role;
grant execute on function public.building_managers(uuid) to authenticated, service_role;
