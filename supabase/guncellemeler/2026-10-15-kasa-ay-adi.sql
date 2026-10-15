-- KOMŞUM güncellemesi · 15 Ekim 2026 (3)
-- Kasa hareketlerinde aidat dönemi "2026-10" yerine "Ekim 2026" yazsın.
-- Supabase → SQL Editor → New query → yapıştır → Run.

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

