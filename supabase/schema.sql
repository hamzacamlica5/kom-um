-- =====================================================================
-- KOMŞUM veritabanı şeması (Supabase / PostgreSQL 15+)
-- Supabase panelinde SQL Editor'e bu dosyanın tamamını yapıştırıp
-- "Run" demen yeterli. Tekrar çalıştırılırsa mevcut verilere dokunmaz.
--
-- İlke: Para ve rol içeren her yazma işlemi aşağıdaki RPC fonksiyonları
-- üzerinden yapılır. Tablolara doğrudan yazma yetkisi yoktur; okuma
-- satır bazlı güvenlik kurallarıyla (RLS) sınırlandırılır. Hiçbir kayıt
-- silinmez: yanlış kayıtlar gerekçesiyle iptal edilir ya da ters kayıtla
-- düzeltilir.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Yardımcılar
-- ---------------------------------------------------------------------
create or replace function public.istanbul_today() returns date
language sql stable as $$ select (now() at time zone 'Europe/Istanbul')::date $$;

create or replace function public.komsum_price(unit_count int) returns int
language sql immutable as $$
  -- Daire başı 15 TL (KDV dahil), en az 99 TL
  select greatest(99, 15 * coalesce(unit_count,0))
$$;

create or replace function public.raise_tr(msg text) returns void
language plpgsql as $$ begin raise exception using message = msg, errcode = 'P0001'; end $$;

-- ---------------------------------------------------------------------
-- Tablolar
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 80),
  phone text check (char_length(phone) <= 30),
  created_at timestamptz not null default now()
);

create table if not exists public.buildings (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  address text check (char_length(address) <= 200),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  reminder_enabled boolean not null default false,
  reminder_day int not null default 5 check (reminder_day between 1 and 28),
  reminder_hour int not null default 10 check (reminder_hour between 0 and 23),
  reminder_last_run date
);

create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id),
  label text not null check (char_length(label) between 1 and 30),
  monthly_dues numeric(12,2) not null default 0 check (monthly_dues >= 0),
  due_day int not null default 10 check (due_day between 1 and 28),
  sort_order int not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists units_label_uq on public.units(building_id, lower(label)) where archived_at is null;

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id),
  user_id uuid not null references auth.users(id),
  role text not null check (role in ('manager','resident')),
  unit_id uuid references public.units(id),
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  ended_reason text
);
create unique index if not exists memberships_active_uq on public.memberships(building_id, user_id) where ended_at is null;
create index if not exists memberships_user_idx on public.memberships(user_id) where ended_at is null;

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id),
  unit_id uuid not null references public.units(id),
  token text not null unique,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references auth.users(id),
  revoked_at timestamptz
);

create table if not exists public.dues_periods (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id),
  period text not null check (period ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users(id),
  cancel_reason text
);
create unique index if not exists dues_periods_uq on public.dues_periods(building_id, period) where cancelled_at is null;

create table if not exists public.dues_charges (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.dues_periods(id),
  building_id uuid not null references public.buildings(id),
  unit_id uuid not null references public.units(id),
  period text not null,
  amount numeric(12,2) not null check (amount > 0),
  due_date date not null,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz
);
create unique index if not exists dues_charges_uq on public.dues_charges(unit_id, period) where cancelled_at is null;
create index if not exists dues_charges_building_idx on public.dues_charges(building_id, period);

create table if not exists public.payment_notices (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id),
  charge_id uuid not null references public.dues_charges(id),
  unit_id uuid not null references public.units(id),
  submitted_by uuid not null references auth.users(id),
  amount numeric(12,2) not null check (amount > 0),
  paid_on date not null,
  receipt_path text,
  note text check (char_length(note) <= 300),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  reject_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id),
  charge_id uuid not null references public.dues_charges(id),
  unit_id uuid not null references public.units(id),
  amount numeric(12,2) not null check (amount > 0),
  paid_on date not null,
  method text not null check (method in ('cash','bank')),
  note text check (char_length(note) <= 300),
  notice_id uuid references public.payment_notices(id),
  recorded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  voided_at timestamptz,
  voided_by uuid references auth.users(id),
  void_reason text
);
create index if not exists payments_charge_idx on public.payments(charge_id);
create index if not exists payments_building_idx on public.payments(building_id);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id),
  category text not null check (char_length(category) between 1 and 40),
  description text not null check (char_length(description) between 1 and 300),
  vendor text check (char_length(vendor) <= 80),
  amount numeric(12,2) not null check (amount > 0),
  spent_on date not null,
  attachment_path text,
  recorded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  voided_at timestamptz,
  voided_by uuid references auth.users(id),
  void_reason text
);
create index if not exists expenses_building_idx on public.expenses(building_id);

-- Kasa hareketleri: başlangıç bakiyesi, elle giriş/çıkış ve bunların ters kayıtları.
-- Bu tablo yalnızca eklenir; hiçbir satır güncellenmez veya silinmez.
create table if not exists public.cash_entries (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id),
  kind text not null check (kind in ('opening','manual','reversal')),
  direction text not null check (direction in ('in','out')),
  amount numeric(12,2) not null check (amount > 0),
  description text not null check (char_length(description) between 1 and 300),
  effective_on date not null,
  reverses_id uuid references public.cash_entries(id),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create unique index if not exists cash_entries_reversal_uq on public.cash_entries(reverses_id) where reverses_id is not null;
create index if not exists cash_entries_building_idx on public.cash_entries(building_id);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id),
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 4000),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  archived_by uuid references auth.users(id),
  archive_reason text
);

create table if not exists public.maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id),
  unit_id uuid references public.units(id),
  created_by uuid not null references auth.users(id),
  title text not null check (char_length(title) between 1 and 120),
  description text check (char_length(description) <= 2000),
  photo_path text,
  status text not null default 'new' check (status in ('new','received','in_progress','resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.maintenance_updates (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.maintenance_requests(id),
  status text not null check (status in ('new','received','in_progress','resolved')),
  note text check (char_length(note) <= 1000),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id),
  title text not null check (char_length(title) between 1 and 120),
  category text not null default 'Diğer' check (char_length(category) <= 40),
  file_path text not null,
  mime text not null,
  size_bytes int not null check (size_bytes > 0 and size_bytes <= 5242880),
  visibility text not null check (visibility in ('managers','residents')),
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  archived_by uuid references auth.users(id),
  archive_reason text
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  building_id uuid references public.buildings(id),
  kind text not null,
  title text not null,
  body text not null default '',
  url text not null default '/',
  created_at timestamptz not null default now(),
  read_at timestamptz,
  push_sent_at timestamptz,
  push_attempts int not null default 0
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);
create index if not exists notifications_pending_idx on public.notifications(created_at) where push_sent_at is null;

-- Sunucu ayarları (yalnızca servis rolü okur): bildirim gönderim adresi ve gizli anahtar.
create table if not exists public.app_config (
  key text primary key,
  value text not null
);

-- ---------------------------------------------------------------------
-- Yetki yardımcıları
-- ---------------------------------------------------------------------
create or replace function public.is_member(b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from memberships m where m.building_id = b and m.user_id = auth.uid() and m.ended_at is null)
$$;

create or replace function public.is_manager(b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from memberships m where m.building_id = b and m.user_id = auth.uid() and m.role = 'manager' and m.ended_at is null)
$$;

create or replace function public.my_unit(b uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select m.unit_id from memberships m where m.building_id = b and m.user_id = auth.uid() and m.ended_at is null limit 1
$$;

create or replace function public.require_manager(b uuid) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then perform raise_tr('Oturum açman gerekiyor.'); end if;
  if not is_manager(b) then perform raise_tr('Bu işlemi yalnızca yönetici yapabilir.'); end if;
end $$;

create or replace function public.require_reason(r text) returns text
language plpgsql immutable as $$
begin
  if r is null or char_length(btrim(r)) < 3 then perform raise_tr('Lütfen bir gerekçe yaz (en az 3 karakter).'); end if;
  return btrim(r);
end $$;

-- Bildirim kuyruğuna ekler. Gönderimi tetikleyici + sunucu fonksiyonu yapar.
create or replace function public.notify(p_user uuid, p_building uuid, p_kind text, p_title text, p_body text, p_url text)
returns void language sql security definer set search_path = public as $$
  insert into notifications(user_id, building_id, kind, title, body, url)
  values (p_user, p_building, p_kind, p_title, coalesce(p_body,''), coalesce(p_url,'/'))
$$;

create or replace function public.notify_managers(p_building uuid, p_kind text, p_title text, p_body text, p_url text)
returns void language sql security definer set search_path = public as $$
  insert into notifications(user_id, building_id, kind, title, body, url)
  select m.user_id, p_building, p_kind, p_title, coalesce(p_body,''), coalesce(p_url,'/')
  from memberships m where m.building_id = p_building and m.role = 'manager' and m.ended_at is null
$$;

create or replace function public.notify_residents(p_building uuid, p_kind text, p_title text, p_body text, p_url text, p_except uuid default null)
returns void language sql security definer set search_path = public as $$
  insert into notifications(user_id, building_id, kind, title, body, url)
  select m.user_id, p_building, p_kind, p_title, coalesce(p_body,''), coalesce(p_url,'/')
  from memberships m where m.building_id = p_building and m.ended_at is null
    and (m.role = 'resident') and m.user_id is distinct from p_except
$$;

create or replace function public.notify_unit(p_unit uuid, p_kind text, p_title text, p_body text, p_url text)
returns void language sql security definer set search_path = public as $$
  insert into notifications(user_id, building_id, kind, title, body, url)
  select m.user_id, m.building_id, p_kind, p_title, coalesce(p_body,''), coalesce(p_url,'/')
  from memberships m where m.unit_id = p_unit and m.ended_at is null
$$;

create or replace function public.period_tr(p text) returns text
language sql immutable as $$
  select (array['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'])[split_part(p,'-',2)::int] || ' ' || split_part(p,'-',1)
$$;

-- Türkçe biçim: 1.234,50 TL
create or replace function public.tl(n numeric) returns text
language sql immutable as $$
  select regexp_replace(replace(replace(replace(to_char(n, 'FM999,999,999,990.00'), ',', '_'), '.', ','), '_', '.'), ',00$', '') || ' TL'
$$;

-- ---------------------------------------------------------------------
-- Görünümler (RLS'e uyar: security_invoker)
-- ---------------------------------------------------------------------
create or replace view public.charge_status with (security_invoker = true) as
select c.id, c.building_id, c.unit_id, c.period, c.period_id, c.amount, c.due_date, c.created_at, c.cancelled_at,
  u.label as unit_label,
  coalesce(p.paid, 0)::numeric(12,2) as paid,
  greatest(c.amount - coalesce(p.paid, 0), 0)::numeric(12,2) as remaining,
  coalesce(n.pending, 0)::numeric(12,2) as pending,
  case when c.cancelled_at is not null then 'cancelled'
       when coalesce(p.paid,0) >= c.amount then 'paid'
       when coalesce(p.paid,0) > 0 then 'partial'
       else 'unpaid' end as status
from dues_charges c
join units u on u.id = c.unit_id
left join (select charge_id, sum(amount) paid from payments where voided_at is null group by charge_id) p on p.charge_id = c.id
left join (select charge_id, sum(amount) pending from payment_notices where status = 'pending' group by charge_id) n on n.charge_id = c.id;

-- Kasa defteri: tahsilatlar, giderler ve kasa hareketleri tek listede.
create or replace view public.ledger with (security_invoker = true) as
select p.id, p.building_id, 'payment'::text as source, 'in'::text as direction, p.amount, p.paid_on as effective_on,
  ('Aidat tahsilatı · ' || u.label || ' · ' || period_tr(c.period) || case when p.method = 'cash' then ' · nakit' else ' · banka' end) as description,
  p.recorded_by as actor, p.created_at, p.voided_at, p.void_reason, null::uuid as reverses_id
from payments p join dues_charges c on c.id = p.charge_id join units u on u.id = p.unit_id
union all
select e.id, e.building_id, 'expense', 'out', e.amount, e.spent_on,
  (e.category || ' · ' || e.description || coalesce(' · ' || e.vendor, '')),
  e.recorded_by, e.created_at, e.voided_at, e.void_reason, null::uuid
from expenses e
union all
select x.id, x.building_id, 'cash_' || x.kind, x.direction, x.amount, x.effective_on, x.description,
  x.created_by, x.created_at, null::timestamptz, null::text, x.reverses_id
from cash_entries x;

-- ---------------------------------------------------------------------
-- Satır bazlı güvenlik (okuma kuralları)
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.buildings enable row level security;
alter table public.units enable row level security;
alter table public.memberships enable row level security;
alter table public.invites enable row level security;
alter table public.dues_periods enable row level security;
alter table public.dues_charges enable row level security;
alter table public.payment_notices enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;
alter table public.cash_entries enable row level security;
alter table public.announcements enable row level security;
alter table public.maintenance_requests enable row level security;
alter table public.maintenance_updates enable row level security;
alter table public.documents enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notifications enable row level security;
alter table public.app_config enable row level security;

-- Doğrudan yazma yok; tüm değişiklikler RPC'lerden geçer.
revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;
revoke all on public.app_config from anon, authenticated;
revoke select on all tables in schema public from anon;
grant select on all tables in schema public to authenticated;
revoke select on public.app_config from authenticated;
-- Kendi profilini, bildirim aboneliğini ve okundu bilgisini düzenleyebilir.
grant insert, update on public.profiles to authenticated;
grant insert, delete on public.push_subscriptions to authenticated;
grant update (read_at) on public.notifications to authenticated;

do $$ begin
  -- profiller: kendisi + aynı binadaki üyeler
  drop policy if exists p_profiles_sel on public.profiles;
  create policy p_profiles_sel on public.profiles for select to authenticated using (
    id = auth.uid() or exists (
      select 1 from memberships a join memberships b on a.building_id = b.building_id
      where a.user_id = auth.uid() and a.ended_at is null and b.user_id = profiles.id and b.ended_at is null));
  drop policy if exists p_profiles_ins on public.profiles;
  create policy p_profiles_ins on public.profiles for insert to authenticated with check (id = auth.uid());
  drop policy if exists p_profiles_upd on public.profiles;
  create policy p_profiles_upd on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

  drop policy if exists p_buildings_sel on public.buildings;
  create policy p_buildings_sel on public.buildings for select to authenticated using (is_member(id));

  drop policy if exists p_units_sel on public.units;
  create policy p_units_sel on public.units for select to authenticated using (is_member(building_id));

  drop policy if exists p_memberships_sel on public.memberships;
  create policy p_memberships_sel on public.memberships for select to authenticated using (user_id = auth.uid() or is_member(building_id));

  drop policy if exists p_invites_sel on public.invites;
  create policy p_invites_sel on public.invites for select to authenticated using (is_manager(building_id));

  drop policy if exists p_periods_sel on public.dues_periods;
  create policy p_periods_sel on public.dues_periods for select to authenticated using (is_member(building_id));

  -- Sakin yalnızca kendi dairesinin borç, ödeme ve bildirimlerini görür.
  drop policy if exists p_charges_sel on public.dues_charges;
  create policy p_charges_sel on public.dues_charges for select to authenticated using (is_manager(building_id) or unit_id = my_unit(building_id));
  drop policy if exists p_payments_sel on public.payments;
  create policy p_payments_sel on public.payments for select to authenticated using (is_manager(building_id) or unit_id = my_unit(building_id));
  drop policy if exists p_notices_sel on public.payment_notices;
  create policy p_notices_sel on public.payment_notices for select to authenticated using (is_manager(building_id) or submitted_by = auth.uid() or unit_id = my_unit(building_id));

  -- Şeffaflık: giderler ve kasa hareketleri tüm üyelere açık.
  drop policy if exists p_expenses_sel on public.expenses;
  create policy p_expenses_sel on public.expenses for select to authenticated using (is_member(building_id));
  drop policy if exists p_cash_sel on public.cash_entries;
  create policy p_cash_sel on public.cash_entries for select to authenticated using (is_member(building_id));

  drop policy if exists p_ann_sel on public.announcements;
  create policy p_ann_sel on public.announcements for select to authenticated using (is_manager(building_id) or (is_member(building_id) and archived_at is null));

  drop policy if exists p_mr_sel on public.maintenance_requests;
  create policy p_mr_sel on public.maintenance_requests for select to authenticated using (is_manager(building_id) or created_by = auth.uid());
  drop policy if exists p_mu_sel on public.maintenance_updates;
  create policy p_mu_sel on public.maintenance_updates for select to authenticated using (
    exists (select 1 from maintenance_requests r where r.id = request_id and (is_manager(r.building_id) or r.created_by = auth.uid())));

  drop policy if exists p_docs_sel on public.documents;
  create policy p_docs_sel on public.documents for select to authenticated using (
    is_manager(building_id) or (is_member(building_id) and visibility = 'residents' and archived_at is null));

  drop policy if exists p_push_sel on public.push_subscriptions;
  create policy p_push_sel on public.push_subscriptions for select to authenticated using (user_id = auth.uid());
  drop policy if exists p_push_ins on public.push_subscriptions;
  create policy p_push_ins on public.push_subscriptions for insert to authenticated with check (user_id = auth.uid());
  drop policy if exists p_push_del on public.push_subscriptions;
  create policy p_push_del on public.push_subscriptions for delete to authenticated using (user_id = auth.uid());

  drop policy if exists p_notif_sel on public.notifications;
  create policy p_notif_sel on public.notifications for select to authenticated using (user_id = auth.uid());
  drop policy if exists p_notif_upd on public.notifications;
  create policy p_notif_upd on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
end $$;

-- ---------------------------------------------------------------------
-- RPC: profil ve bağlam
-- ---------------------------------------------------------------------
create or replace function public.save_profile(p_full_name text, p_phone text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then perform raise_tr('Oturum açman gerekiyor.'); end if;
  if char_length(btrim(coalesce(p_full_name,''))) < 2 then perform raise_tr('Adını ve soyadını yaz.'); end if;
  insert into profiles(id, full_name, phone) values (auth.uid(), btrim(p_full_name), nullif(btrim(p_phone),''))
  on conflict (id) do update set full_name = excluded.full_name, phone = excluded.phone;
end $$;

create or replace function public.my_buildings()
returns table(building_id uuid, name text, address text, role text, unit_id uuid, unit_label text, unit_count bigint, monthly_price int)
language sql stable security definer set search_path = public as $$
  select b.id, b.name, b.address, m.role, m.unit_id, u.label,
    (select count(*) from units x where x.building_id = b.id and x.archived_at is null),
    komsum_price((select count(*)::int from units x where x.building_id = b.id and x.archived_at is null))
  from memberships m join buildings b on b.id = m.building_id left join units u on u.id = m.unit_id
  where m.user_id = auth.uid() and m.ended_at is null
  order by m.created_at
$$;

-- ---------------------------------------------------------------------
-- RPC: bina ve daireler
-- ---------------------------------------------------------------------
create or replace function public.create_building(p_name text, p_address text, p_unit_count int, p_monthly_dues numeric, p_due_day int)
returns uuid language plpgsql security definer set search_path = public as $$
declare b uuid; i int;
begin
  if auth.uid() is null then perform raise_tr('Oturum açman gerekiyor.'); end if;
  if not exists (select 1 from profiles where id = auth.uid()) then perform raise_tr('Önce profilini tamamla.'); end if;
  if p_unit_count is null or p_unit_count < 1 or p_unit_count > 500 then perform raise_tr('Daire sayısı 1 ile 500 arasında olmalı.'); end if;
  if coalesce(p_monthly_dues,0) < 0 then perform raise_tr('Aidat tutarı negatif olamaz.'); end if;
  insert into buildings(name, address, created_by) values (btrim(p_name), nullif(btrim(p_address),''), auth.uid()) returning id into b;
  insert into memberships(building_id, user_id, role) values (b, auth.uid(), 'manager');
  for i in 1..p_unit_count loop
    insert into units(building_id, label, monthly_dues, due_day, sort_order)
    values (b, 'Daire ' || i, coalesce(p_monthly_dues,0), coalesce(p_due_day,10), i);
  end loop;
  return b;
end $$;

create or replace function public.update_building(p_building uuid, p_name text, p_address text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform require_manager(p_building);
  update buildings set name = btrim(p_name), address = nullif(btrim(p_address),'') where id = p_building;
end $$;

create or replace function public.save_unit(p_building uuid, p_unit uuid, p_label text, p_monthly_dues numeric, p_due_day int)
returns uuid language plpgsql security definer set search_path = public as $$
declare v uuid;
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
    update units set label = btrim(p_label), monthly_dues = coalesce(p_monthly_dues,0), due_day = coalesce(p_due_day,10)
    where id = p_unit and building_id = p_building and archived_at is null returning id into v;
    if v is null then perform raise_tr('Daire bulunamadı.'); end if;
  end if;
  return v;
end $$;

create or replace function public.archive_unit(p_unit uuid)
returns void language plpgsql security definer set search_path = public as $$
declare b uuid;
begin
  select building_id into b from units where id = p_unit and archived_at is null;
  if b is null then perform raise_tr('Daire bulunamadı.'); end if;
  perform require_manager(b);
  if exists (select 1 from memberships where unit_id = p_unit and ended_at is null) then
    perform raise_tr('Bu dairede kayıtlı sakin var. Önce sakini çıkar.');
  end if;
  if exists (select 1 from charge_status where unit_id = p_unit and status in ('unpaid','partial')) then
    perform raise_tr('Bu dairenin ödenmemiş borcu var.');
  end if;
  update units set archived_at = now() where id = p_unit;
end $$;

-- ---------------------------------------------------------------------
-- RPC: davetler ve üyelik
-- ---------------------------------------------------------------------
create or replace function public.create_invite(p_unit uuid)
returns text language plpgsql security definer set search_path = public as $$
declare b uuid; t text;
begin
  select building_id into b from units where id = p_unit and archived_at is null;
  if b is null then perform raise_tr('Daire bulunamadı.'); end if;
  perform require_manager(b);
  -- Aynı daire için açık davetler geçersiz olur; tek geçerli davet kalır.
  update invites set revoked_at = now() where unit_id = p_unit and used_at is null and revoked_at is null;
  t := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  insert into invites(building_id, unit_id, token, created_by, expires_at) values (b, p_unit, t, auth.uid(), now() + interval '7 days');
  return t;
end $$;

create or replace function public.revoke_invite(p_invite uuid)
returns void language plpgsql security definer set search_path = public as $$
declare b uuid;
begin
  select building_id into b from invites where id = p_invite;
  if b is null then perform raise_tr('Davet bulunamadı.'); end if;
  perform require_manager(b);
  update invites set revoked_at = now() where id = p_invite and used_at is null and revoked_at is null;
end $$;

create or replace function public.invite_info(p_token text)
returns table(building_name text, unit_label text, status text)
language sql stable security definer set search_path = public as $$
  select b.name, u.label,
    case when i.revoked_at is not null then 'revoked'
         when i.used_at is not null then 'used'
         when i.expires_at < now() then 'expired'
         else 'valid' end
  from invites i join buildings b on b.id = i.building_id join units u on u.id = i.unit_id
  where i.token = p_token
$$;

create or replace function public.accept_invite(p_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare i invites%rowtype; existing memberships%rowtype; who text;
begin
  if auth.uid() is null then perform raise_tr('Oturum açman gerekiyor.'); end if;
  if not exists (select 1 from profiles where id = auth.uid()) then perform raise_tr('Önce profilini tamamla.'); end if;
  select * into i from invites where token = p_token for update;
  if not found then perform raise_tr('Davet bağlantısı geçersiz.'); end if;
  if i.revoked_at is not null then perform raise_tr('Bu davet iptal edilmiş. Yöneticiden yeni bağlantı iste.'); end if;
  if i.used_at is not null then perform raise_tr('Bu davet daha önce kullanılmış. Yöneticiden yeni bağlantı iste.'); end if;
  if i.expires_at < now() then perform raise_tr('Bu davetin süresi dolmuş. Yöneticiden yeni bağlantı iste.'); end if;
  select * into existing from memberships where building_id = i.building_id and user_id = auth.uid() and ended_at is null;
  if found then
    if existing.role = 'manager' then
      -- Yönetici de bir dairede oturuyor olabilir: daireyi kendine bağlar.
      update memberships set unit_id = i.unit_id where id = existing.id;
    else
      perform raise_tr('Bu apartmana zaten üyesin.');
    end if;
  else
    insert into memberships(building_id, user_id, role, unit_id) values (i.building_id, auth.uid(), 'resident', i.unit_id);
  end if;
  update invites set used_at = now(), used_by = auth.uid() where id = i.id;
  select full_name into who from profiles where id = auth.uid();
  perform notify_managers(i.building_id, 'member_joined', 'Yeni sakin katıldı',
    coalesce(who,'Bir sakin') || ', ' || (select label from units where id = i.unit_id) || ' için katıldı.', '/daireler');
  return i.building_id;
end $$;

create or replace function public.remove_member(p_membership uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare m memberships%rowtype;
begin
  select * into m from memberships where id = p_membership and ended_at is null;
  if not found then perform raise_tr('Üye bulunamadı.'); end if;
  perform require_manager(m.building_id);
  if m.role = 'manager' then perform raise_tr('Yönetici çıkarılamaz. Önce yönetimi devret.'); end if;
  update memberships set ended_at = now(), ended_reason = require_reason(p_reason) where id = m.id;
end $$;

-- Yönetici devri: tüm kayıtlar bina üzerinde durduğu için yeni yönetici her şeyi görür.
create or replace function public.transfer_management(p_building uuid, p_new_manager uuid)
returns void language plpgsql security definer set search_path = public as $$
declare target memberships%rowtype; who text;
begin
  perform require_manager(p_building);
  if p_new_manager = auth.uid() then perform raise_tr('Zaten yöneticisin.'); end if;
  select * into target from memberships where building_id = p_building and user_id = p_new_manager and ended_at is null;
  if not found then perform raise_tr('Yönetimi yalnızca apartmana katılmış bir sakine devredebilirsin.'); end if;
  update memberships set role = 'manager' where id = target.id;
  update memberships set role = 'resident' where building_id = p_building and user_id = auth.uid() and ended_at is null;
  select full_name into who from profiles where id = auth.uid();
  perform notify(p_new_manager, p_building, 'management', 'Yönetim sana devredildi',
    coalesce(who,'Önceki yönetici') || ' apartman yönetimini sana devretti. Kasa, borçlar, belgeler ve açık işler artık sende.', '/');
end $$;

-- ---------------------------------------------------------------------
-- RPC: aidat
-- ---------------------------------------------------------------------
create or replace function public.period_due_date(p_period text, p_day int) returns date
language sql immutable as $$ select (p_period || '-01')::date + (least(greatest(p_day,1),28) - 1) $$;

create or replace function public.dues_preview(p_building uuid, p_period text)
returns table(unit_count int, total numeric, already_exists boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  perform require_manager(p_building);
  return query
  select count(*)::int, coalesce(sum(u.monthly_dues),0)::numeric,
    exists (select 1 from dues_periods where building_id = p_building and period = p_period and cancelled_at is null)
  from units u where u.building_id = p_building and u.archived_at is null and u.monthly_dues > 0;
end $$;

create or replace function public.generate_dues(p_building uuid, p_period text)
returns int language plpgsql security definer set search_path = public as $$
declare pid uuid; n int;
begin
  perform require_manager(p_building);
  if p_period !~ '^\d{4}-(0[1-9]|1[0-2])$' then perform raise_tr('Dönem YYYY-AA biçiminde olmalı.'); end if;
  if exists (select 1 from dues_periods where building_id = p_building and period = p_period and cancelled_at is null) then
    perform raise_tr('Bu ayın aidatları zaten oluşturulmuş.');
  end if;
  if not exists (select 1 from units where building_id = p_building and archived_at is null and monthly_dues > 0) then
    perform raise_tr('Aidat tutarı girilmiş daire yok. Önce Daireler bölümünden aidatları belirle.');
  end if;
  insert into dues_periods(building_id, period, created_by) values (p_building, p_period, auth.uid()) returning id into pid;
  insert into dues_charges(period_id, building_id, unit_id, period, amount, due_date)
  select pid, p_building, u.id, p_period, u.monthly_dues, period_due_date(p_period, u.due_day)
  from units u where u.building_id = p_building and u.archived_at is null and u.monthly_dues > 0;
  get diagnostics n = row_count;
  insert into notifications(user_id, building_id, kind, title, body, url)
  select m.user_id, p_building, 'dues_created', 'Yeni aidat borcu',
    period_tr(c.period) || ' aidatın: ' || tl(c.amount) || '. Son ödeme ' || to_char(c.due_date, 'DD.MM.YYYY') || '.', '/aidat'
  from dues_charges c join memberships m on m.unit_id = c.unit_id and m.ended_at is null
  where c.period_id = pid;
  return n;
end $$;

create or replace function public.cancel_dues_period(p_period_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare d dues_periods%rowtype; r text;
begin
  select * into d from dues_periods where id = p_period_id and cancelled_at is null;
  if not found then perform raise_tr('Dönem bulunamadı.'); end if;
  perform require_manager(d.building_id);
  r := require_reason(p_reason);
  if exists (select 1 from payments p join dues_charges c on c.id = p.charge_id where c.period_id = d.id and p.voided_at is null) then
    perform raise_tr('Bu dönemde kayıtlı ödemeler var. Dönemi iptal etmeden önce ödemeleri iptal et.');
  end if;
  if exists (select 1 from payment_notices n join dues_charges c on c.id = n.charge_id where c.period_id = d.id and n.status = 'pending') then
    perform raise_tr('Bu dönemde inceleme bekleyen ödeme bildirimleri var. Önce onları sonuçlandır.');
  end if;
  update dues_periods set cancelled_at = now(), cancelled_by = auth.uid(), cancel_reason = r where id = d.id;
  update dues_charges set cancelled_at = now() where period_id = d.id;
end $$;

-- Yönetici ödeme kaydı (tam veya kısmi)
create or replace function public.record_payment(p_charge uuid, p_amount numeric, p_paid_on date, p_method text, p_note text)
returns uuid language plpgsql security definer set search_path = public as $$
declare c charge_status%rowtype; v uuid;
begin
  select * into c from charge_status where id = p_charge;
  if not found then perform raise_tr('Borç bulunamadı.'); end if;
  perform require_manager(c.building_id);
  perform 1 from dues_charges where id = p_charge for update;
  select * into c from charge_status where id = p_charge;
  if c.status = 'cancelled' then perform raise_tr('İptal edilmiş borca ödeme girilemez.'); end if;
  if p_amount is null or p_amount <= 0 then perform raise_tr('Tutar sıfırdan büyük olmalı.'); end if;
  if p_amount > c.remaining then perform raise_tr('Tutar kalan borçtan (' || tl(c.remaining) || ') fazla olamaz.'); end if;
  if p_method not in ('cash','bank') then perform raise_tr('Ödeme yöntemi nakit veya banka olmalı.'); end if;
  if p_paid_on is null or p_paid_on > istanbul_today() then perform raise_tr('Ödeme tarihi bugünden ileri olamaz.'); end if;
  insert into payments(building_id, charge_id, unit_id, amount, paid_on, method, note, recorded_by)
  values (c.building_id, c.id, c.unit_id, round(p_amount,2), p_paid_on, p_method, nullif(btrim(p_note),''), auth.uid()) returning id into v;
  perform notify_unit(c.unit_id, 'payment_recorded', 'Ödemen kaydedildi',
    period_tr(c.period) || ' aidatı için ' || tl(p_amount) || ' ödemen işlendi.', '/aidat');
  return v;
end $$;

create or replace function public.void_payment(p_payment uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare p payments%rowtype; r text;
begin
  select * into p from payments where id = p_payment and voided_at is null;
  if not found then perform raise_tr('Ödeme bulunamadı ya da zaten iptal edilmiş.'); end if;
  perform require_manager(p.building_id);
  r := require_reason(p_reason);
  update payments set voided_at = now(), voided_by = auth.uid(), void_reason = r where id = p.id;
  if p.notice_id is not null then
    update payment_notices set status = 'rejected', reject_reason = 'Onaylanan ödeme iptal edildi: ' || r,
      reviewed_by = auth.uid(), reviewed_at = now() where id = p.notice_id;
  end if;
end $$;

-- Sakin: ödeme bildirimi (dekont)
create or replace function public.submit_payment_notice(p_charge uuid, p_amount numeric, p_paid_on date, p_receipt_path text, p_note text)
returns uuid language plpgsql security definer set search_path = public as $$
declare c charge_status%rowtype; v uuid; who text;
begin
  if auth.uid() is null then perform raise_tr('Oturum açman gerekiyor.'); end if;
  select * into c from charge_status where id = p_charge;
  if not found then perform raise_tr('Borç bulunamadı.'); end if;
  if not exists (select 1 from memberships where building_id = c.building_id and user_id = auth.uid() and unit_id = c.unit_id and ended_at is null) then
    perform raise_tr('Yalnızca kendi dairenin borcu için ödeme bildirebilirsin.');
  end if;
  if c.status in ('cancelled','paid') then perform raise_tr('Bu borç için ödeme bildirilemez.'); end if;
  if p_amount is null or p_amount <= 0 then perform raise_tr('Tutar sıfırdan büyük olmalı.'); end if;
  if p_amount > c.remaining - c.pending then
    perform raise_tr('Tutar, kalan borçtan (' || tl(greatest(c.remaining - c.pending,0)) || ') fazla olamaz. İnceleme bekleyen bildirimlerin de hesaba katılır.');
  end if;
  if p_paid_on is null or p_paid_on > istanbul_today() then perform raise_tr('Ödeme tarihi bugünden ileri olamaz.'); end if;
  if p_receipt_path is not null and split_part(p_receipt_path, '/', 1) <> c.building_id::text then
    perform raise_tr('Dekont dosyası geçersiz.');
  end if;
  insert into payment_notices(building_id, charge_id, unit_id, submitted_by, amount, paid_on, receipt_path, note)
  values (c.building_id, c.id, c.unit_id, auth.uid(), round(p_amount,2), p_paid_on, p_receipt_path, nullif(btrim(p_note),'')) returning id into v;
  select full_name into who from profiles where id = auth.uid();
  perform notify_managers(c.building_id, 'notice_submitted', 'Yeni ödeme bildirimi',
    c.unit_label || ' · ' || coalesce(who,'') || ' · ' || tl(p_amount) || ' (' || period_tr(c.period) || ')', '/bildirimler');
  return v;
end $$;

create or replace function public.approve_payment_notice(p_notice uuid, p_method text default 'bank')
returns uuid language plpgsql security definer set search_path = public as $$
declare n payment_notices%rowtype; c charge_status%rowtype; v uuid;
begin
  select * into n from payment_notices where id = p_notice for update;
  if not found then perform raise_tr('Bildirim bulunamadı.'); end if;
  perform require_manager(n.building_id);
  if n.status <> 'pending' then perform raise_tr('Bu bildirim zaten sonuçlandırılmış.'); end if;
  perform 1 from dues_charges where id = n.charge_id for update;
  select * into c from charge_status where id = n.charge_id;
  if c.status = 'cancelled' then perform raise_tr('Borç iptal edilmiş; bildirimi reddet.'); end if;
  if n.amount > c.remaining then perform raise_tr('Bildirilen tutar kalan borçtan (' || tl(c.remaining) || ') fazla. Bildirimi reddedip doğru tutarı kaydet.'); end if;
  insert into payments(building_id, charge_id, unit_id, amount, paid_on, method, note, notice_id, recorded_by)
  values (n.building_id, n.charge_id, n.unit_id, n.amount, n.paid_on, coalesce(p_method,'bank'), 'Dekontla bildirildi', n.id, auth.uid())
  returning id into v;
  update payment_notices set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now() where id = n.id;
  perform notify(n.submitted_by, n.building_id, 'notice_approved', 'Ödemen onaylandı',
    period_tr(c.period) || ' aidatı için ' || tl(n.amount) || ' ödemen onaylandı.', '/aidat');
  return v;
end $$;

create or replace function public.reject_payment_notice(p_notice uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare n payment_notices%rowtype; r text;
begin
  select * into n from payment_notices where id = p_notice for update;
  if not found then perform raise_tr('Bildirim bulunamadı.'); end if;
  perform require_manager(n.building_id);
  if n.status <> 'pending' then perform raise_tr('Bu bildirim zaten sonuçlandırılmış.'); end if;
  r := require_reason(p_reason);
  update payment_notices set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), reject_reason = r where id = n.id;
  perform notify(n.submitted_by, n.building_id, 'notice_rejected', 'Ödeme bildirimin reddedildi', 'Gerekçe: ' || r, '/aidat');
end $$;

-- ---------------------------------------------------------------------
-- RPC: kasa ve giderler
-- ---------------------------------------------------------------------
create or replace function public.add_expense(p_building uuid, p_category text, p_description text, p_vendor text, p_amount numeric, p_spent_on date, p_attachment_path text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  perform require_manager(p_building);
  if p_amount is null or p_amount <= 0 then perform raise_tr('Tutar sıfırdan büyük olmalı.'); end if;
  if char_length(btrim(coalesce(p_description,''))) < 1 then perform raise_tr('Açıklama yaz.'); end if;
  if p_spent_on is null or p_spent_on > istanbul_today() then perform raise_tr('Gider tarihi bugünden ileri olamaz.'); end if;
  if p_attachment_path is not null and split_part(p_attachment_path, '/', 1) <> p_building::text then perform raise_tr('Dosya geçersiz.'); end if;
  insert into expenses(building_id, category, description, vendor, amount, spent_on, attachment_path, recorded_by)
  values (p_building, btrim(coalesce(nullif(p_category,''),'Diğer')), btrim(p_description), nullif(btrim(p_vendor),''), round(p_amount,2), p_spent_on, p_attachment_path, auth.uid())
  returning id into v;
  return v;
end $$;

create or replace function public.void_expense(p_expense uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare e expenses%rowtype;
begin
  select * into e from expenses where id = p_expense and voided_at is null;
  if not found then perform raise_tr('Gider bulunamadı ya da zaten iptal edilmiş.'); end if;
  perform require_manager(e.building_id);
  update expenses set voided_at = now(), voided_by = auth.uid(), void_reason = require_reason(p_reason) where id = e.id;
end $$;

create or replace function public.add_cash_entry(p_building uuid, p_direction text, p_amount numeric, p_description text, p_effective_on date)
returns uuid language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  perform require_manager(p_building);
  if p_direction not in ('in','out') then perform raise_tr('İşlem türü giriş veya çıkış olmalı.'); end if;
  if p_amount is null or p_amount <= 0 then perform raise_tr('Tutar sıfırdan büyük olmalı.'); end if;
  if char_length(btrim(coalesce(p_description,''))) < 3 then perform raise_tr('Açıklama zorunlu (en az 3 karakter).'); end if;
  if p_effective_on is null or p_effective_on > istanbul_today() then perform raise_tr('İşlem tarihi bugünden ileri olamaz.'); end if;
  insert into cash_entries(building_id, kind, direction, amount, description, effective_on, created_by)
  values (p_building, 'manual', p_direction, round(p_amount,2), btrim(p_description), p_effective_on, auth.uid()) returning id into v;
  return v;
end $$;

-- Yanlış kasa hareketi silinmez; ters kayıtla düzeltilir.
create or replace function public.reverse_cash_entry(p_entry uuid, p_reason text)
returns uuid language plpgsql security definer set search_path = public as $$
declare x cash_entries%rowtype; v uuid; r text;
begin
  select * into x from cash_entries where id = p_entry;
  if not found then perform raise_tr('Kayıt bulunamadı.'); end if;
  perform require_manager(x.building_id);
  if x.kind = 'reversal' then perform raise_tr('Ters kayıt tekrar ters çevrilemez. Gerekirse yeni bir hareket ekle.'); end if;
  if exists (select 1 from cash_entries where reverses_id = x.id) then perform raise_tr('Bu kayıt zaten ters kayıtla düzeltilmiş.'); end if;
  r := require_reason(p_reason);
  insert into cash_entries(building_id, kind, direction, amount, description, effective_on, reverses_id, created_by)
  values (x.building_id, 'reversal', case when x.direction = 'in' then 'out' else 'in' end, x.amount,
          'Düzeltme: ' || r, istanbul_today(), x.id, auth.uid()) returning id into v;
  return v;
end $$;

-- Başlangıç bakiyesi: tek geçerli kayıt. Değiştirmek eskisini ters kayıtla kapatır, geçmiş korunur.
create or replace function public.set_opening_balance(p_building uuid, p_amount numeric, p_effective_on date, p_note text)
returns uuid language plpgsql security definer set search_path = public as $$
declare old cash_entries%rowtype; v uuid;
begin
  perform require_manager(p_building);
  if p_amount is null or p_amount < 0 then perform raise_tr('Tutar negatif olamaz.'); end if;
  if p_effective_on is null or p_effective_on > istanbul_today() then perform raise_tr('Tarih bugünden ileri olamaz.'); end if;
  select * into old from cash_entries x where x.building_id = p_building and x.kind = 'opening'
    and not exists (select 1 from cash_entries y where y.reverses_id = x.id) order by created_at desc limit 1;
  if found then
    if char_length(btrim(coalesce(p_note,''))) < 3 then perform raise_tr('Başlangıç bakiyesini değiştirmek için gerekçe yaz.'); end if;
    insert into cash_entries(building_id, kind, direction, amount, description, effective_on, reverses_id, created_by)
    values (p_building, 'reversal', case when old.direction = 'in' then 'out' else 'in' end, old.amount,
            'Başlangıç bakiyesi düzeltmesi: ' || btrim(p_note), old.effective_on, old.id, auth.uid());
  end if;
  if p_amount > 0 then
    insert into cash_entries(building_id, kind, direction, amount, description, effective_on, created_by)
    values (p_building, 'opening', 'in', round(p_amount,2),
            'Başlangıç bakiyesi (kasa + banka)' || coalesce(' · ' || nullif(btrim(p_note),''), ''), p_effective_on, auth.uid())
    returning id into v;
  end if;
  return v;
end $$;

create or replace function public.cash_balance(p_building uuid)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(sum(case when direction = 'in' then amount else -amount end), 0)::numeric(14,2)
  from ledger where building_id = p_building and voided_at is null and is_member(p_building)
$$;

-- ---------------------------------------------------------------------
-- RPC: duyuru, arıza, evrak
-- ---------------------------------------------------------------------
create or replace function public.post_announcement(p_building uuid, p_title text, p_body text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  perform require_manager(p_building);
  insert into announcements(building_id, title, body, created_by) values (p_building, btrim(p_title), btrim(p_body), auth.uid()) returning id into v;
  perform notify_residents(p_building, 'announcement', 'Duyuru: ' || btrim(p_title), left(btrim(p_body), 140), '/duyurular', auth.uid());
  return v;
end $$;

create or replace function public.archive_announcement(p_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare b uuid;
begin
  select building_id into b from announcements where id = p_id and archived_at is null;
  if b is null then perform raise_tr('Duyuru bulunamadı.'); end if;
  perform require_manager(b);
  update announcements set archived_at = now(), archived_by = auth.uid(), archive_reason = require_reason(p_reason) where id = p_id;
end $$;

create or replace function public.create_maintenance_request(p_building uuid, p_title text, p_description text, p_photo_path text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v uuid; lbl text;
begin
  if not is_member(p_building) then perform raise_tr('Bu apartmanın üyesi değilsin.'); end if;
  if char_length(btrim(coalesce(p_title,''))) < 3 then perform raise_tr('Sorunu kısaca yaz (en az 3 karakter).'); end if;
  if p_photo_path is not null and split_part(p_photo_path, '/', 1) <> p_building::text then perform raise_tr('Fotoğraf dosyası geçersiz.'); end if;
  insert into maintenance_requests(building_id, unit_id, created_by, title, description, photo_path)
  values (p_building, my_unit(p_building), auth.uid(), btrim(p_title), nullif(btrim(p_description),''), p_photo_path) returning id into v;
  insert into maintenance_updates(request_id, status, note, created_by) values (v, 'new', 'Talep oluşturuldu', auth.uid());
  select label into lbl from units where id = my_unit(p_building);
  if not is_manager(p_building) then
    perform notify_managers(p_building, 'maintenance_new', 'Yeni arıza talebi', coalesce(lbl || ' · ', '') || btrim(p_title), '/talepler');
  end if;
  return v;
end $$;

create or replace function public.update_maintenance_status(p_request uuid, p_status text, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare r maintenance_requests%rowtype; label text;
begin
  select * into r from maintenance_requests where id = p_request;
  if not found then perform raise_tr('Talep bulunamadı.'); end if;
  perform require_manager(r.building_id);
  if p_status not in ('received','in_progress','resolved') then perform raise_tr('Geçersiz durum.'); end if;
  if r.status = p_status and coalesce(btrim(p_note),'') = '' then perform raise_tr('Durum zaten bu. Açıklama ekleyebilirsin.'); end if;
  update maintenance_requests set status = p_status, updated_at = now() where id = r.id;
  insert into maintenance_updates(request_id, status, note, created_by) values (r.id, p_status, nullif(btrim(p_note),''), auth.uid());
  label := case p_status when 'received' then 'Alındı' when 'in_progress' then 'İşlemde' else 'Çözüldü' end;
  if r.created_by <> auth.uid() then
    perform notify(r.created_by, r.building_id, 'maintenance_status', 'Talebin: ' || label,
      r.title || coalesce(' · ' || nullif(btrim(p_note),''), ''), '/talepler');
  end if;
end $$;

create or replace function public.add_document(p_building uuid, p_title text, p_category text, p_file_path text, p_mime text, p_size int, p_visibility text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  perform require_manager(p_building);
  if p_visibility not in ('managers','residents') then perform raise_tr('Görünürlük seçimi geçersiz.'); end if;
  if p_mime not in ('application/pdf','image/jpeg','image/png') then perform raise_tr('Yalnızca PDF, JPG veya PNG yüklenebilir.'); end if;
  if p_size is null or p_size > 5242880 then perform raise_tr('Dosya en fazla 5 MB olabilir.'); end if;
  if split_part(p_file_path, '/', 1) <> p_building::text then perform raise_tr('Dosya geçersiz.'); end if;
  insert into documents(building_id, title, category, file_path, mime, size_bytes, visibility, uploaded_by)
  values (p_building, btrim(p_title), coalesce(nullif(btrim(p_category),''),'Diğer'), p_file_path, p_mime, p_size, p_visibility, auth.uid()) returning id into v;
  if p_visibility = 'residents' then
    perform notify_residents(p_building, 'document', 'Yeni belge paylaşıldı', btrim(p_title), '/evrak', auth.uid());
  end if;
  return v;
end $$;

create or replace function public.archive_document(p_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare b uuid;
begin
  select building_id into b from documents where id = p_id and archived_at is null;
  if b is null then perform raise_tr('Belge bulunamadı.'); end if;
  perform require_manager(b);
  update documents set archived_at = now(), archived_by = auth.uid(), archive_reason = require_reason(p_reason) where id = p_id;
end $$;

-- ---------------------------------------------------------------------
-- RPC: hatırlatmalar ve bildirimler
-- ---------------------------------------------------------------------
create or replace function public.set_reminder_settings(p_building uuid, p_enabled boolean, p_day int, p_hour int)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform require_manager(p_building);
  if p_day not between 1 and 28 then perform raise_tr('Gün 1 ile 28 arasında olmalı.'); end if;
  if p_hour not between 0 and 23 then perform raise_tr('Saat 0 ile 23 arasında olmalı.'); end if;
  update buildings set reminder_enabled = p_enabled, reminder_day = p_day, reminder_hour = p_hour where id = p_building;
end $$;

-- Borcu devam eden dairelere hatırlatma. Tamamen ödenmiş ve dekontu
-- inceleme bekleyen borçlar atlanır. Kaç kişiye gittiğini döndürür.
create or replace function public.remind_unpaid(p_building uuid) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into notifications(user_id, building_id, kind, title, body, url)
  select m.user_id, p_building, 'dues_reminder', 'Aidat hatırlatması',
    'Ödenmemiş aidat borcun: ' || tl(sum(c.remaining)) || '. Ödediysen dekontunu uygulamadan bildirebilirsin.', '/aidat'
  from charge_status c join memberships m on m.unit_id = c.unit_id and m.ended_at is null
  where c.building_id = p_building and c.status in ('unpaid','partial') and c.pending = 0
  group by m.user_id;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.send_dues_reminder(p_building uuid) returns int
language plpgsql security definer set search_path = public as $$
begin
  perform require_manager(p_building);
  return remind_unpaid(p_building);
end $$;

-- Zamanlayıcı her saat çağırır (servis rolü). İstanbul saatine göre gün ve saat tutan binalara bir kez gönderir.
create or replace function public.run_due_reminders(p_now timestamptz default now()) returns int
language plpgsql security definer set search_path = public as $$
declare b record; total int := 0; local_ts timestamp := p_now at time zone 'Europe/Istanbul';
begin
  for b in select id from buildings
           where reminder_enabled and reminder_day = extract(day from local_ts)::int
             and reminder_hour = extract(hour from local_ts)::int
             and reminder_last_run is distinct from local_ts::date
  loop
    total := total + remind_unpaid(b.id);
    update buildings set reminder_last_run = local_ts::date where id = b.id;
  end loop;
  return total;
end $$;

create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then perform raise_tr('Oturum açman gerekiyor.'); end if;
  -- Aynı cihaz başka hesapla kullanıldıysa abonelik bu hesaba geçer.
  delete from push_subscriptions where endpoint = p_endpoint;
  insert into push_subscriptions(user_id, endpoint, p256dh, auth, user_agent) values (auth.uid(), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 200));
end $$;

create or replace function public.send_test_notification() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then perform raise_tr('Oturum açman gerekiyor.'); end if;
  perform notify(auth.uid(), null, 'test', 'KOMŞUM test bildirimi', 'Bildirimler bu telefonda çalışıyor.', '/');
end $$;

create or replace function public.mark_notifications_read() returns void
language sql security definer set search_path = public as $$
  update notifications set read_at = now() where user_id = auth.uid() and read_at is null
$$;

-- Aylık özet (yönetici paneli)
create or replace function public.monthly_summary(p_building uuid, p_period text)
returns json language plpgsql stable security definer set search_path = public as $$
declare start_d date := (p_period || '-01')::date; end_d date := ((p_period || '-01')::date + interval '1 month')::date;
begin
  if not is_member(p_building) then perform raise_tr('Bu apartmanın üyesi değilsin.'); end if;
  return json_build_object(
    'period', p_period,
    'billed', (select coalesce(sum(amount),0) from dues_charges where building_id = p_building and period = p_period and cancelled_at is null),
    'collected_for_period', (select coalesce(sum(p.amount),0) from payments p join dues_charges c on c.id = p.charge_id
                             where p.building_id = p_building and c.period = p_period and p.voided_at is null and c.cancelled_at is null),
    'income_in_month', (select coalesce(sum(amount),0) from ledger where building_id = p_building and voided_at is null and direction = 'in'
                        and source = 'payment' and effective_on >= start_d and effective_on < end_d),
    'expense_in_month', (select coalesce(sum(amount),0) from expenses where building_id = p_building and voided_at is null
                         and spent_on >= start_d and spent_on < end_d),
    'outstanding_total', case when is_manager(p_building) then (select coalesce(sum(remaining),0) from charge_status where building_id = p_building and status in ('unpaid','partial')) end,
    'units_with_debt', case when is_manager(p_building) then (select count(distinct unit_id) from charge_status where building_id = p_building and status in ('unpaid','partial')) end,
    'balance', cash_balance(p_building),
    'pending_notices', case when is_manager(p_building) then (select count(*) from payment_notices where building_id = p_building and status = 'pending') end,
    'open_requests', (select count(*) from maintenance_requests where building_id = p_building and status <> 'resolved'
                      and (is_manager(p_building) or created_by = auth.uid()))
  );
end $$;

-- "Aidatım nereye gitti?": seçilen aralıktaki giderlerin kategori dağılımı ve
-- sakinin bu giderlerdeki payı (dairesine tahakkuk eden aidat / binanın toplam tahakkuku).
create or replace function public.expense_breakdown(p_building uuid, p_from date, p_to date)
returns json language plpgsql stable security definer set search_path = public as $$
declare u uuid; mine numeric; total_billed numeric; unit_n int; ratio numeric;
begin
  if not is_member(p_building) then perform raise_tr('Bu apartmanın üyesi değilsin.'); end if;
  if p_from is null or p_to is null or p_to < p_from then perform raise_tr('Tarih aralığı geçersiz.'); end if;
  u := my_unit(p_building);
  select coalesce(sum(amount),0) into total_billed from dues_charges
    where building_id = p_building and cancelled_at is null and due_date between p_from and p_to;
  select coalesce(sum(amount),0) into mine from dues_charges
    where building_id = p_building and cancelled_at is null and due_date between p_from and p_to and unit_id = u;
  select count(*) into unit_n from units where building_id = p_building and archived_at is null;
  ratio := case when u is null then null
                when total_billed > 0 then mine / total_billed
                when unit_n > 0 then 1.0 / unit_n end;
  return json_build_object(
    'from', p_from, 'to', p_to,
    'total_expense', (select coalesce(sum(amount),0) from expenses where building_id = p_building and voided_at is null and spent_on between p_from and p_to),
    'categories', (select coalesce(json_agg(json_build_object('category', category, 'amount', amount, 'count', n) order by amount desc), '[]'::json)
                   from (select category, sum(amount) amount, count(*) n from expenses
                         where building_id = p_building and voided_at is null and spent_on between p_from and p_to group by category) t),
    'my_billed', case when u is null then null else mine end,
    'building_billed', total_billed,
    'share_ratio', ratio,
    'unit_count', unit_n
  );
end $$;

-- ---------------------------------------------------------------------
-- RPC: toplu davet ve hesap silme
-- ---------------------------------------------------------------------
-- Sakini olmayan her daire için geçerli bir davet döndürür (varsa mevcut olanı, yoksa yenisini).
create or replace function public.bulk_invites(p_building uuid)
returns table(unit_id uuid, unit_label text, token text, expires_at timestamptz)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare r record; t text;
begin
  perform require_manager(p_building);
  for r in select x.id, x.label from units x
           where x.building_id = p_building and x.archived_at is null
             and not exists (select 1 from memberships m where m.unit_id = x.id and m.ended_at is null)
  loop
    select i.token into t from invites i
      where i.unit_id = r.id and i.used_at is null and i.revoked_at is null and i.expires_at > now() + interval '1 day'
      order by i.created_at desc limit 1;
    if t is null then
      update invites set revoked_at = now() where invites.unit_id = r.id and used_at is null and revoked_at is null;
      t := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
      insert into invites(building_id, unit_id, token, created_by, expires_at) values (p_building, r.id, t, auth.uid(), now() + interval '7 days');
    end if;
    unit_id := r.id; unit_label := r.label; token := t;
    select i.expires_at into expires_at from invites i where i.token = t;
    return next;
    t := null;
  end loop;
end $$;

-- Hesap silmenin veritabanı kısmı: üyelikleri sonlandırır, kişisel bilgileri siler.
-- Kayıt geçmişi (ödeme, gider vb.) apartmanın muhasebe kaydı olduğu için korunur; kişi adı "Silinmiş kullanıcı" görünür.
create or replace function public.prepare_account_deletion()
returns void language plpgsql security definer set search_path = public as $$
declare b record;
begin
  if auth.uid() is null then perform raise_tr('Oturum açman gerekiyor.'); end if;
  for b in select m.building_id, bl.name from memberships m join buildings bl on bl.id = m.building_id
           where m.user_id = auth.uid() and m.role = 'manager' and m.ended_at is null loop
    if exists (select 1 from memberships o where o.building_id = b.building_id and o.ended_at is null and o.user_id <> auth.uid()) then
      perform raise_tr(b.name || ' apartmanının yöneticisisin. Hesabını silmeden önce yönetimi bir sakine devret.');
    end if;
  end loop;
  update memberships set ended_at = now(), ended_reason = 'Hesap silindi' where user_id = auth.uid() and ended_at is null;
  update profiles set full_name = 'Silinmiş kullanıcı', phone = null where id = auth.uid();
  delete from push_subscriptions where user_id = auth.uid();
  delete from notifications where user_id = auth.uid();
  update invites set revoked_at = now() where created_by = auth.uid() and used_at is null and revoked_at is null;
end $$;

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

-- ---------------------------------------------------------------------
-- Fonksiyon yetkileri
-- ---------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated, service_role;
-- İç yardımcılar ve zamanlayıcı yalnızca sunucu tarafında
revoke execute on function public.notify(uuid,uuid,text,text,text,text) from authenticated;
revoke execute on function public.notify_managers(uuid,text,text,text,text) from authenticated;
revoke execute on function public.notify_residents(uuid,text,text,text,text,uuid) from authenticated;
revoke execute on function public.notify_unit(uuid,text,text,text,text) from authenticated;
revoke execute on function public.remind_unpaid(uuid) from authenticated;
revoke execute on function public.run_due_reminders(timestamptz) from authenticated;
-- Davet önizlemesi giriş yapmadan da görülebilir
grant execute on function public.invite_info(text) to anon;

-- ---------------------------------------------------------------------
-- Dosya depolama (dekont, arıza fotoğrafı, evrak, gider faturası)
-- Yol düzeni: <bina_id>/<kullanıcı_id>/<dosya>
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('komsum', 'komsum', false, 5242880, array['application/pdf','image/jpeg','image/png'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types, public = false;

create or replace function public.can_read_file(p_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when split_part(p_name, '/', 1) !~ '^[0-9a-f-]{36}$' then false
    when is_manager(split_part(p_name, '/', 1)::uuid) then true
    when split_part(p_name, '/', 2) = auth.uid()::text then true
    else exists (select 1 from documents d where d.file_path = p_name and d.visibility = 'residents'
                 and d.archived_at is null and is_member(d.building_id))
      or exists (select 1 from expenses e where e.attachment_path = p_name and e.voided_at is null and is_member(e.building_id))
  end
$$;
grant execute on function public.can_read_file(text) to authenticated;

do $$ begin
  drop policy if exists komsum_upload on storage.objects;
  create policy komsum_upload on storage.objects for insert to authenticated with check (
    bucket_id = 'komsum'
    and split_part(name, '/', 1) ~ '^[0-9a-f-]{36}$'
    and public.is_member(split_part(name, '/', 1)::uuid)
    and split_part(name, '/', 2) = auth.uid()::text);
  drop policy if exists komsum_read on storage.objects;
  create policy komsum_read on storage.objects for select to authenticated using (
    bucket_id = 'komsum' and public.can_read_file(name));
end $$;

-- ---------------------------------------------------------------------
-- Telefon bildirimi gönderimi ve saatlik zamanlayıcı
-- app_config içine 'dispatch_url' (uygulama adresi + /api/dispatch) ve
-- 'dispatch_secret' yazıldığında yeni bildirimler anında gönderilir.
-- ---------------------------------------------------------------------
create or replace function public.dispatch_push() returns trigger
language plpgsql security definer set search_path = public as $$
declare u text; s text;
begin
  select value into u from app_config where key = 'dispatch_url';
  select value into s from app_config where key = 'dispatch_secret';
  if u is not null and s is not null then
    begin
      execute 'select net.http_post(url := $1, body := $2, headers := $3)'
        using u, '{}'::jsonb, jsonb_build_object('Content-Type','application/json','x-dispatch-secret', s);
    exception when others then null; -- pg_net yoksa ya da hata olursa zamanlayıcı yine gönderir
    end;
  end if;
  return null;
end $$;

drop trigger if exists notifications_dispatch on public.notifications;
create trigger notifications_dispatch after insert on public.notifications
for each statement execute function public.dispatch_push();

create or replace function public.cron_tick() returns void
language plpgsql security definer set search_path = public as $$
declare u text; s text;
begin
  perform run_due_reminders(now());
  -- gönderilemeyen bildirimleri tekrar dener
  select value into u from app_config where key = 'dispatch_url';
  select value into s from app_config where key = 'dispatch_secret';
  if u is not null and s is not null and exists (select 1 from notifications where push_sent_at is null and push_attempts < 3 and created_at > now() - interval '1 day') then
    begin
      execute 'select net.http_post(url := $1, body := $2, headers := $3)'
        using u, '{}'::jsonb, jsonb_build_object('Content-Type','application/json','x-dispatch-secret', s);
    exception when others then null;
    end;
  end if;
end $$;
revoke execute on function public.cron_tick() from authenticated;
revoke execute on function public.dispatch_push() from authenticated;

do $$ begin
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    if exists (select 1 from pg_namespace where nspname = 'extensions') then
      create extension if not exists pg_net with schema extensions;
    else
      create extension if not exists pg_net;
    end if;
  end if;
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.unschedule(jobid) from cron.job where jobname = 'komsum-hourly';
    perform cron.schedule('komsum-hourly', '0 * * * *', 'select public.cron_tick()');
  end if;
end $$;
