-- Apartmanca güncellemesi · 24 Ekim 2026 — toplu aidat güncelleme (zam) ve aidat geçmişi

-- ---------------------------------------------------------------------
-- Aidat güncelleme (zam): toplu değişiklik + herkesin görebildiği kalıcı geçmiş
-- Yeni tutarlar, henüz oluşturulmamış ilk aydan geçerli olur; oluşmuş borçlar değişmez.
-- ---------------------------------------------------------------------
create table if not exists public.dues_changes (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id),
  mode text not null check (mode in ('set','percent','add')),
  value numeric(12,2) not null,
  effective_period text not null check (effective_period ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  decision_date date,
  note text check (char_length(note) <= 500),
  items jsonb not null,          -- [{unit_id, label, old, new}]
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists dues_changes_building on public.dues_changes(building_id, created_at desc);
alter table public.dues_changes enable row level security;
revoke insert, update, delete, truncate on public.dues_changes from anon, authenticated;
revoke select on public.dues_changes from anon;
grant select on public.dues_changes to authenticated;
do $$ begin
  drop policy if exists p_dues_changes_sel on public.dues_changes;
  create policy p_dues_changes_sel on public.dues_changes for select to authenticated using (is_member(building_id));
end $$;

-- Yeni aidat tutarlarının geçerli olacağı ilk dönem: oluşturulmuş son dönemden sonraki ay
-- (hiç oluşturulmadıysa ya da son dönem geçmişte kaldıysa bu ay).
create or replace function public.next_dues_period(p_building uuid) returns text
language sql stable security definer set search_path = public as $$
  select greatest(
    to_char(istanbul_today(), 'YYYY-MM'),
    coalesce((select to_char(to_date(max(period) || '-01', 'YYYY-MM-DD') + interval '1 month', 'YYYY-MM')
              from dues_periods where building_id = p_building and cancelled_at is null), '0000-00'))
$$;

create or replace function public.update_dues(p_building uuid, p_mode text, p_value numeric, p_units uuid[],
                                              p_decision_date date, p_note text, p_announce boolean)
returns int language plpgsql security definer set search_path = public as $$
declare items jsonb; n int; eff text; olds numeric[]; news numeric[]; body text; note text := nullif(btrim(coalesce(p_note,'')), '');
begin
  perform require_manager(p_building);
  if p_mode not in ('set','percent','add') then perform raise_tr('Geçersiz güncelleme türü.'); end if;
  if p_value is null then perform raise_tr('Bir tutar ya da oran gir.'); end if;
  if p_mode = 'set' and p_value <= 0 then perform raise_tr('Yeni aidat sıfırdan büyük olmalı.'); end if;
  if p_mode = 'percent' and (p_value = 0 or p_value < -90 or p_value > 500) then perform raise_tr('Oran %-90 ile %500 arasında olmalı.'); end if;
  if p_mode = 'add' and p_value = 0 then perform raise_tr('Artış tutarı sıfır olamaz.'); end if;
  if p_decision_date is not null and p_decision_date > istanbul_today() then perform raise_tr('Karar tarihi bugünden ileri olamaz.'); end if;
  if note is not null and char_length(note) > 500 then perform raise_tr('Açıklama en fazla 500 karakter olabilir.'); end if;
  eff := next_dues_period(p_building);

  with t as (
    select u.id, u.label, u.monthly_dues as old,
      case p_mode
        when 'set' then round(p_value, 2)
        when 'percent' then round(u.monthly_dues * (1 + p_value / 100.0))
        else round(u.monthly_dues + p_value, 2)
      end as new
    from units u
    where u.building_id = p_building and u.archived_at is null
      and (case when p_units is null then u.monthly_dues > 0 else u.id = any(p_units) end)
  )
  select jsonb_agg(jsonb_build_object('unit_id', id, 'label', label, 'old', old, 'new', new) order by label),
         array_agg(old), array_agg(new)
    into items, olds, news
  from t where new is distinct from old;

  if items is null then perform raise_tr('Hiçbir dairenin tutarı değişmiyor.'); end if;
  if exists (select 1 from unnest(news) x where x < 0) then perform raise_tr('Bu değişiklikle bazı dairelerin aidatı sıfırın altına düşüyor.'); end if;
  n := jsonb_array_length(items);

  update units u set monthly_dues = (i->>'new')::numeric
  from jsonb_array_elements(items) i where u.id = (i->>'unit_id')::uuid and u.building_id = p_building;

  insert into dues_changes(building_id, mode, value, effective_period, decision_date, note, items, created_by)
  values (p_building, p_mode, p_value, eff, p_decision_date, note, items, auth.uid());

  if coalesce(p_announce, true) then
    body := period_tr(eff) || ' aidatlarından itibaren ';
    if (select count(distinct x) from unnest(olds) x) = 1 and (select count(distinct x) from unnest(news) x) = 1 then
      body := body || 'aylık aidat ' || tl(olds[1]) || ' yerine ' || tl(news[1]) || ' olacak.';
    elsif p_mode = 'percent' then
      body := body || 'aidatlar %' || trim(to_char(abs(p_value), 'FM999990.##')) || (case when p_value > 0 then ' artıyor.' else ' azalıyor.' end);
    else
      body := body || n || ' dairenin aidat tutarı değişiyor.';
    end if;
    if p_decision_date is not null then body := body || ' Kat malikleri kurulunun ' || to_char(p_decision_date, 'DD.MM.YYYY') || ' tarihli kararıyla.'; end if;
    if note is not null then body := body || E'\n\n' || note; end if;
    body := body || E'\n\nDairenin yeni tutarını Aidatlarım ekranında görebilirsin.';
    perform post_announcement(p_building, 'Aidat güncellemesi', body);
  end if;
  return n;
end $$;

-- Tek daire düzenlemesinde aidat değişirse de geçmişe yazılır.
create or replace function public.save_unit(p_building uuid, p_unit uuid, p_label text, p_monthly_dues numeric, p_due_day int)
returns uuid language plpgsql security definer set search_path = public as $$
declare v uuid; old_dues numeric;
begin
  perform require_manager(p_building);
  if coalesce(p_monthly_dues,0) < 0 then perform raise_tr('Aidat tutarı negatif olamaz.'); end if;
  if char_length(btrim(coalesce(p_label,''))) < 1 then perform raise_tr('Daire adı boş olamaz.'); end if;
  if exists (select 1 from units where building_id = p_building and lower(label) = lower(btrim(p_label)) and archived_at is null and id is distinct from p_unit) then
    perform raise_tr('Bu adla başka bir daire var.');
  end if;
  if p_unit is null then
    insert into units(building_id, label, monthly_dues, due_day, sort_order)
    values (p_building, btrim(p_label), coalesce(p_monthly_dues,0), coalesce(p_due_day,10),
            coalesce((select max(sort_order)+1 from units where building_id = p_building),1))
    returning id into v;
  else
    -- Aidat değişikliği yalnızca sonraki dönemleri etkiler; oluşturulmuş borçlar korunur.
    -- Tutar değiştiyse herkesin görebildiği aidat geçmişine yazılır (sessiz zam olmaz).
    select monthly_dues into old_dues from units where id = p_unit and building_id = p_building and archived_at is null;
    update units set label = btrim(p_label), monthly_dues = coalesce(p_monthly_dues,0), due_day = coalesce(p_due_day,10)
    where id = p_unit and building_id = p_building and archived_at is null returning id into v;
    if v is null then perform raise_tr('Daire bulunamadı.'); end if;
    if old_dues is distinct from round(coalesce(p_monthly_dues,0), 2) and to_regclass('public.dues_changes') is not null then
      execute 'insert into dues_changes(building_id, mode, value, effective_period, items, created_by) values ($1, ''set'', $2, next_dues_period($1), $3, auth.uid())'
        using p_building, round(coalesce(p_monthly_dues,0), 2),
              jsonb_build_array(jsonb_build_object('unit_id', p_unit, 'label', btrim(p_label), 'old', old_dues, 'new', round(coalesce(p_monthly_dues,0), 2)));
    end if;
  end if;
  return v;
end $$;
