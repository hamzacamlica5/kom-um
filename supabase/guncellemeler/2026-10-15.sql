-- KOMŞUM güncellemesi · 15 Ekim 2026
-- "Aidatım nereye gitti?", toplu davet ve hesap silme için veritabanı fonksiyonları.
-- Supabase → SQL Editor → New query → bu dosyanın tamamını yapıştır → Run.

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


revoke execute on function public.expense_breakdown(uuid, date, date) from public, anon;
revoke execute on function public.bulk_invites(uuid) from public, anon;
revoke execute on function public.prepare_account_deletion() from public, anon;
grant execute on function public.expense_breakdown(uuid, date, date) to authenticated, service_role;
grant execute on function public.bulk_invites(uuid) to authenticated, service_role;
grant execute on function public.prepare_account_deletion() to authenticated, service_role;
