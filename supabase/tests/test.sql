\set ON_ERROR_STOP 1
\set QUIET 1
\o /dev/null
-- ---------- yardımcılar ----------
create or replace function public.t_expect_err(q text, frag text) returns void language plpgsql as $$
declare ok boolean := false;
begin
  begin
    execute q;
    ok := true;
  exception when others then
    if sqlerrm not like '%' || frag || '%' then
      raise exception 'Farklı hata. Sorgu: % | Gelen: % | Beklenen parça: %', q, sqlerrm, frag;
    end if;
  end;
  if ok then raise exception 'Hata bekleniyordu ama olmadı: %', q; end if;
end $$;
grant execute on function public.t_expect_err(text,text) to authenticated;

create or replace function public.t_eq(a anyelement, b anyelement, label text) returns void language plpgsql as $$
begin
  if a is distinct from b then raise exception 'BAŞARISIZ: % → beklenen %, gelen %', label, b, a; end if;
  raise notice 'ok  %', label;
end $$;
grant execute on function public.t_eq(anyelement, anyelement, text) to authenticated;

insert into auth.users(id, email) values
 ('00000000-0000-0000-0000-00000000000a','yonetici@test'),
 ('00000000-0000-0000-0000-00000000000b','sakin1@test'),
 ('00000000-0000-0000-0000-00000000000c','sakin2@test'),
 ('00000000-0000-0000-0000-00000000000d','yabanci@test');

-- ---------- 1. Profil ve bina kurulumu ----------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', false);
set role authenticated;
select t_expect_err($q$select create_building('Lale Apt', 'Kadıköy', 4, 750, 10)$q$, 'profilini tamamla');
select save_profile('Hamza Yönetici', '0555');
select create_building('Lale Apartmanı', 'Kadıköy', 12, 750, 10) as bid \gset
select t_eq((select count(*)::int from units where building_id = :'bid'), 12, 'bina 12 daireyle oluştu');
select t_eq((select monthly_price from my_buildings() where building_id = :'bid'), 199, '12 daire = 199 TL abonelik');
select t_eq(komsum_price(10), 99, '10 daire 99 TL');
select t_eq(komsum_price(11), 199, '11 daire 199 TL');
select t_eq(komsum_price(60), 599, '60 daire 599 TL');
select t_eq(komsum_price(61), 699, '61 daire 699 TL');
select t_eq((select role from my_buildings() where building_id = :'bid'), 'manager', 'oluşturan yönetici');
select id as u1 from units where building_id = :'bid' and label = 'Daire 1' \gset
select id as u2 from units where building_id = :'bid' and label = 'Daire 2' \gset
select id as u3 from units where building_id = :'bid' and label = 'Daire 3' \gset
-- Daire 3'ün aidatı farklı, Daire 12 aidatsız
select save_unit(:'bid', :'u3', 'Daire 3 (Dükkan)', 1200, 15);
select save_unit(:'bid', (select id from units where building_id = :'bid' and label = 'Daire 12'), 'Daire 12', 0, 10);
select t_expect_err(format($q$select save_unit(%L, %L, 'Daire 1', 100, 10)$q$, :'bid', :'u2'), 'başka bir daire');

-- ---------- 2. Davetler ----------
select create_invite(:'u1') as inv1 \gset
select create_invite(:'u2') as inv2_old \gset
select create_invite(:'u2') as inv2 \gset
select t_eq((select status from invite_info(:'inv2_old')), 'revoked', 'yeni davet eskisini geçersiz kılar');

reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', false);
set role authenticated;
select t_eq((select count(*)::int from units), 0, 'üye olmayan daireleri göremez');
select t_expect_err(format($q$select create_invite(%L)$q$, :'u1'), 'yalnızca yönetici');
select save_profile('Ali Sakin', null);
select accept_invite(:'inv1');
select t_eq((select role from my_buildings()), 'resident', 'davetle katılan bina sakini');
select t_eq((select unit_label from my_buildings()), 'Daire 1', 'sakin kendi dairesine bağlandı');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c"}', false);
set role authenticated;
select save_profile('Ayşe Sakin', null);
select t_expect_err(format($q$select accept_invite(%L)$q$, :'inv1'), 'daha önce kullanılmış');
select t_expect_err(format($q$select accept_invite(%L)$q$, :'inv2_old'), 'iptal edilmiş');
select accept_invite(:'inv2');

-- ---------- 3. Aidat oluşturma ----------
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', false);
set role authenticated;
select t_eq((select unit_count from dues_preview(:'bid', '2026-10')), 11, 'önizleme: aidatlı 11 daire');
select t_eq((select total from dues_preview(:'bid', '2026-10')), 10*750 + 1200::numeric, 'önizleme toplamı');
select t_eq(generate_dues(:'bid', '2026-10'), 11, '11 borç oluştu');
select t_expect_err(format($q$select generate_dues(%L, '2026-10')$q$, :'bid'), 'zaten oluşturulmuş');
select t_eq((select due_date from dues_charges where unit_id = :'u3' and period = '2026-10'), '2026-10-15'::date, 'son ödeme günü daireye göre');
select id as c1 from dues_charges where unit_id = :'u1' and period = '2026-10' \gset
select id as c2 from dues_charges where unit_id = :'u2' and period = '2026-10' \gset
-- aidat değişikliği geçmiş borcu etkilemez
select save_unit(:'bid', :'u1', 'Daire 1', 900, 10);
select t_eq((select amount from dues_charges where id = :'c1'), 750.00::numeric, 'aidat değişince eski borç korunur');
select t_eq(cash_balance(:'bid'), 0::numeric, 'borç oluşunca kasaya para eklenmez');

-- ---------- 4. Yönetici ödeme kaydı ----------
select t_expect_err(format($q$select record_payment(%L, 800, current_date, 'cash', null)$q$, :'c1'), 'kalan borçtan');
select record_payment(:'c1', 300, current_date, 'cash', null) as p1 \gset
select t_eq((select status from charge_status where id = :'c1'), 'partial', '300 TL sonrası kısmi ödendi');
select t_eq((select remaining from charge_status where id = :'c1'), 450.00::numeric, 'kalan 450 TL');
select record_payment(:'c1', 450, current_date, 'bank', null) as p2 \gset
select t_eq((select status from charge_status where id = :'c1'), 'paid', 'tamamı ödenince Ödendi');
select t_expect_err(format($q$select void_payment(%L, '')$q$, :'p2'), 'gerekçe');
select void_payment(:'p2', 'Yanlış daireye girildi');
select t_eq((select status from charge_status where id = :'c1'), 'partial', 'iptal sonrası tekrar kısmi');
select t_eq(cash_balance(:'bid'), 300::numeric, 'iptal edilen ödeme kasadan düşer');

-- ---------- 5. Dekont bildirimi ve onay ----------
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c"}', false);
set role authenticated;
select t_eq((select count(*)::int from charge_status), 1, 'sakin yalnızca kendi borcunu görür');
select t_expect_err(format($q$select submit_payment_notice(%L, 100, current_date, null, null)$q$, :'c1'), 'kendi dairenin');
select t_expect_err(format($q$select submit_payment_notice(%L, 100, current_date + 3, null, null)$q$, :'c2'), 'ileri olamaz');
select submit_payment_notice(:'c2', 300, current_date, :'bid' || '/00000000-0000-0000-0000-00000000000c/dekont.pdf', 'Ekim aidatı') as n1 \gset
select t_expect_err(format($q$select submit_payment_notice(%L, 500, current_date, null, null)$q$, :'c2'), 'bekleyen bildirimlerin');
select t_expect_err(format($q$select approve_payment_notice(%L)$q$, :'n1'), 'yalnızca yönetici');
select t_eq((select remaining from charge_status where id = :'c2'), 750.00::numeric, 'bekleyen bildirim borcu değiştirmez');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', false);
set role authenticated;
select t_eq(cash_balance(:'bid'), 300::numeric, 'bekleyen bildirim kasayı değiştirmez');
select t_eq((select count(*)::int from notifications where kind = 'notice_submitted'), 1, 'yöneticiye dekont bildirimi gitti');
select approve_payment_notice(:'n1');
select t_eq((select remaining from charge_status where id = :'c2'), 450.00::numeric, 'onay sonrası 450 TL kalır');
select t_eq(cash_balance(:'bid'), 600::numeric, 'onaylanan ödeme kasaya gelir yazıldı');
select t_expect_err(format($q$select approve_payment_notice(%L)$q$, :'n1'), 'zaten sonuçlandırılmış');

reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c"}', false);
set role authenticated;
select t_eq((select count(*)::int from notifications where kind = 'notice_approved'), 1, 'sakine onay bildirimi gitti');
select submit_payment_notice(:'c2', 100, current_date, null, null) as n2 \gset
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', false);
set role authenticated;
select reject_payment_notice(:'n2', 'Hesaba para gelmedi');
select t_eq((select remaining from charge_status where id = :'c2'), 450.00::numeric, 'reddedilen bildirim borcu değiştirmez');

-- ---------- 6. Kasa, giderler, başlangıç bakiyesi, elle hareketler ----------
select add_expense(:'bid', 'Temizlik', 'Ekim temizlik', 'Pırıl Ltd', 100, current_date, null) as e1 \gset
select t_eq(cash_balance(:'bid'), 500::numeric, '100 TL gider sonrası kasa 500');
select set_opening_balance(:'bid', 10000, current_date - 30, null) as ob1 \gset
select t_eq(cash_balance(:'bid'), 10500::numeric, 'başlangıç bakiyesi eklendi');
select t_expect_err(format($q$select set_opening_balance(%L, 12000, current_date - 30, '')$q$, :'bid'), 'gerekçe');
select set_opening_balance(:'bid', 12000, current_date - 30, 'Banka hesabı unutulmuş');
select t_eq(cash_balance(:'bid'), 12500::numeric, 'başlangıç bakiyesi düzeltildi, eski kayıt ters kayıtla kapandı');
select t_eq((select count(*)::int from cash_entries where building_id = :'bid'), 3, 'düzeltme geçmişi korunur (3 kayıt)');
select add_cash_entry(:'bid', 'in', 2500, 'Eski yönetimden devir', current_date) as ce1 \gset
select t_expect_err(format($q$select add_cash_entry(%L, 'out', 50, '', current_date)$q$, :'bid'), 'Açıklama zorunlu');
select t_eq(cash_balance(:'bid'), 15000::numeric, 'elle giriş kasaya eklendi');
select reverse_cash_entry(:'ce1', 'Tutar yanlış girildi');
select t_eq(cash_balance(:'bid'), 12500::numeric, 'ters kayıt etkiyi sıfırladı');
select t_expect_err(format($q$select reverse_cash_entry(%L, 'tekrar')$q$, :'ce1'), 'zaten ters kayıtla');
select void_expense(:'e1', 'Fatura mükerrer');
select t_eq(cash_balance(:'bid'), 12600::numeric, 'iptal edilen gider kasaya geri döner');

reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', false);
set role authenticated;
select t_eq(cash_balance(:'bid'), 12600::numeric, 'sakin de güncel kasayı görür');
select t_eq((select count(*)::int from cash_entries), 5, 'sakin kasa hareketlerini görür');
select t_expect_err(format($q$select add_cash_entry(%L, 'in', 50, 'deneme', current_date)$q$, :'bid'), 'yalnızca yönetici');
select t_expect_err($q$update cash_entries set amount = 1$q$, 'permission denied');
select t_expect_err($q$delete from payments$q$, 'permission denied');
select t_expect_err($q$insert into announcements(building_id,title,body,created_by) values (gen_random_uuid(),'x','y',auth.uid())$q$, 'permission denied');
select t_eq((select count(*)::int from payments), 2, 'sakin 1 yalnızca kendi dairesinin ödemelerini görür');

-- ---------- 7. Dönem iptali ----------
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', false);
set role authenticated;
select id as per from dues_periods where building_id = :'bid' and period = '2026-10' \gset
select t_expect_err(format($q$select cancel_dues_period(%L, 'Yanlış ay')$q$, :'per'), 'kayıtlı ödemeler');
select generate_dues(:'bid', '2026-11');
select id as per11 from dues_periods where building_id = :'bid' and period = '2026-11' \gset
select cancel_dues_period(:'per11', 'Yanlışlıkla oluşturuldu');
select t_eq((select count(*)::int from charge_status where period = '2026-11' and status = 'cancelled'), 11, 'iptal edilen dönemin borçları iptal');
select t_eq(generate_dues(:'bid', '2026-11'), 11, 'iptal sonrası aynı ay yeniden oluşturulabilir');

-- ---------- 8. Hatırlatmalar ----------
-- Daire 2: bekleyen bildirim yok, borç var → hatırlatma alır. Daire 1: borçlu → alır.
select set_reminder_settings(:'bid', true, 5, 10);
reset role;
select t_eq(run_due_reminders('2026-12-05 07:00:00+00'), 2, 'İstanbul 10:00 → 2 sakine hatırlatma');
select t_eq(run_due_reminders('2026-12-05 07:30:00+00'), 0, 'aynı gün ikinci kez gönderilmez');
select t_eq(run_due_reminders('2026-12-06 07:00:00+00'), 0, 'yanlış gün gönderilmez');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c"}', false);
set role authenticated;
select submit_payment_notice((select id from dues_charges where unit_id = :'u2' and period = '2026-11' and cancelled_at is null), 100, current_date, null, null);
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', false);
set role authenticated;
-- Daire 2'nin Ekim borcu hâlâ açık ve o borçta bekleyen bildirim yok → yine hatırlatılır
select t_eq(send_dues_reminder(:'bid'), 2, 'elle hatırlatma');

-- ---------- 9. Duyuru, arıza, evrak ----------
select post_announcement(:'bid', 'Su kesintisi', 'Yarın 10:00-14:00 arası su kesilecek.') as a1 \gset
select add_document(:'bid', 'Asansör sözleşmesi', 'Sözleşme', :'bid' || '/00000000-0000-0000-0000-00000000000a/a.pdf', 'application/pdf', 1000, 'managers');
select add_document(:'bid', 'Toplantı tutanağı', 'Tutanak', :'bid' || '/00000000-0000-0000-0000-00000000000a/b.pdf', 'application/pdf', 1000, 'residents');
select t_expect_err(format($q$select add_document(%L, 'x', 'y', %L, 'application/zip', 100, 'residents')$q$, :'bid', :'bid' || '/x/y.zip'), 'PDF, JPG');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', false);
set role authenticated;
select t_eq((select count(*)::int from announcements), 1, 'sakin duyuruyu görür');
select t_eq((select count(*)::int from documents), 1, 'sakin yalnızca paylaşılan belgeyi görür');
select t_eq(can_read_file(:'bid' || '/00000000-0000-0000-0000-00000000000a/b.pdf'), true, 'paylaşılan belge dosyası okunabilir');
select t_eq(can_read_file(:'bid' || '/00000000-0000-0000-0000-00000000000a/a.pdf'), false, 'yönetime özel belge okunamaz');
select t_eq(can_read_file(:'bid' || '/00000000-0000-0000-0000-00000000000c/dekont.pdf'), false, 'başkasının dekontu okunamaz');
select t_eq((select count(*)::int from notifications where kind = 'announcement'), 1, 'duyuru bildirimi geldi');
select t_eq((select count(*)::int from notifications where kind = 'document'), 1, 'belge bildirimi geldi');
select create_maintenance_request(:'bid', 'Asansör çalışmıyor', '3. katta takılı', null) as mr1 \gset
select t_expect_err(format($q$select update_maintenance_status(%L, 'resolved', null)$q$, :'mr1'), 'yalnızca yönetici');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c"}', false);
set role authenticated;
select t_eq((select count(*)::int from maintenance_requests), 0, 'başka sakinin talebi görünmez');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', false);
set role authenticated;
select t_eq((select count(*)::int from notifications where kind = 'maintenance_new'), 1, 'yöneticiye arıza bildirimi');
select update_maintenance_status(:'mr1', 'in_progress', 'Asansörcü yolda');
select update_maintenance_status(:'mr1', 'resolved', null);
select t_eq((select count(*)::int from maintenance_updates where request_id = :'mr1'), 3, 'durum geçmişi saklandı');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', false);
set role authenticated;
select t_eq((select count(*)::int from notifications where kind = 'maintenance_status'), 2, 'sakine durum bildirimleri');

-- ---------- 10. Yabancı erişimi ----------
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000d"}', false);
set role authenticated;
select t_eq((select count(*)::int from buildings), 0, 'yabancı binayı görmez');
select t_eq((select count(*)::int from expenses), 0, 'yabancı giderleri görmez');
select t_eq((select count(*)::int from ledger), 0, 'yabancı kasa defterini görmez');
select t_eq(cash_balance(:'bid'), 0::numeric, 'yabancı kasa bakiyesini göremez');
select t_expect_err(format($q$select monthly_summary(%L, '2026-10')$q$, :'bid'), 'üyesi değilsin');
select t_expect_err(format($q$select create_maintenance_request(%L, 'deneme talep', null, null)$q$, :'bid'), 'üyesi değilsin');

-- ---------- 11. Aylık özet ve yönetici devri ----------
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a"}', false);
set role authenticated;
select t_eq((monthly_summary(:'bid', '2026-10')->>'billed')::numeric, 8700::numeric, 'özet: ekim tahakkuk');
select t_eq((monthly_summary(:'bid', '2026-10')->>'collected_for_period')::numeric, 600::numeric, 'özet: ekim tahsilat');
select t_eq((monthly_summary(:'bid', '2026-10')->>'pending_notices')::int, 1, 'özet: bekleyen bildirim');
select t_expect_err(format($q$select transfer_management(%L, '00000000-0000-0000-0000-00000000000d')$q$, :'bid'), 'katılmış bir sakine');
select transfer_management(:'bid', '00000000-0000-0000-0000-00000000000b');
select t_eq((select role from my_buildings() where building_id = :'bid'), 'resident', 'eski yönetici sakin oldu');
select t_expect_err(format($q$select add_expense(%L, 'x', 'y', null, 5, current_date, null)$q$, :'bid'), 'yalnızca yönetici');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b"}', false);
set role authenticated;
select t_eq((select role from my_buildings() where building_id = :'bid'), 'manager', 'yeni yönetici devraldı');
select t_eq((select count(*)::int from charge_status where period = '2026-10'), 11, 'yeni yönetici tüm borçları görür');
select t_eq((select count(*)::int from documents), 2, 'yeni yönetici tüm belgeleri görür');
select t_eq((select count(*)::int from notifications where kind = 'management'), 1, 'devir bildirimi');

-- ---------- 12. Biçim ----------
reset role;
select t_eq(tl(1234.5), '1.234,50 TL', 'TL biçimi');
select t_eq(tl(750), '750 TL', 'tam sayı TL biçimi');
select t_eq(tl(1500000), '1.500.000 TL', 'milyon TL biçimi');

\o
\o /dev/null
select t_eq(period_tr('2026-10'), 'Ekim 2026', 'dönem adı');
select t_eq(period_tr('2027-01'), 'Ocak 2027', 'dönem adı ocak');
\o

-- ---------- 13. Gider dağılımı, toplu davet, hesap silme ----------
\o /dev/null
-- Yeni bina: 4 daire, D1 1000 TL, diğerleri 500 TL
insert into auth.users(id, email) values
 ('00000000-0000-0000-0000-0000000000e1','y2@test'), ('00000000-0000-0000-0000-0000000000e2','s2@test'), ('00000000-0000-0000-0000-0000000000e3','s3@test');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1"}', false);
set role authenticated;
select save_profile('Yönetici İki', null);
select create_building('Gül Apt', null, 4, 500, 5) as b2 \gset
select save_unit(:'b2', (select id from units where building_id = :'b2' and label = 'Daire 1'), 'Daire 1', 1000, 5);
select generate_dues(:'b2', to_char(current_date, 'YYYY-MM'));
select add_expense(:'b2', 'Temizlik', 'Merdiven', null, 600, current_date, null);
select add_expense(:'b2', 'Asansör', 'Bakım', null, 300, current_date, null);
select add_expense(:'b2', 'Temizlik', 'Malzeme', null, 100, current_date, null);
select void_expense(add_expense(:'b2', 'Elektrik', 'Mükerrer', null, 999, current_date, null), 'Yanlış girildi');
-- toplu davet: 4 boş daire
select t_eq((select count(*)::int from bulk_invites(:'b2')), 4, 'toplu davet: 4 boş daire');
select t_eq((select count(distinct token)::int from bulk_invites(:'b2')), 4, 'toplu davet: her daireye bir bağlantı');
select token as tk1 from bulk_invites(:'b2') where unit_label = 'Daire 1' \gset
select t_eq((select token from bulk_invites(:'b2') where unit_label = 'Daire 1'), :'tk1', 'toplu davet tekrar çağrılınca aynı bağlantıyı verir');
select t_eq((select (expense_breakdown(:'b2', date_trunc('month', current_date)::date, current_date + 40)->>'total_expense')::numeric), 1000::numeric, 'dağılım: iptal edilen gider hariç toplam');
select t_eq((select expense_breakdown(:'b2', date_trunc('month', current_date)::date, current_date + 40)->'categories'->0->>'category'), 'Temizlik', 'dağılım: en büyük kategori temizlik');
select t_eq((select (expense_breakdown(:'b2', date_trunc('month', current_date)::date, current_date + 40)->'categories'->0->>'amount')::numeric), 700::numeric, 'dağılım: temizlik toplamı');
select t_eq((select expense_breakdown(:'b2', date_trunc('month', current_date)::date, current_date + 40)->>'share_ratio'), null, 'dağılım: dairesiz yöneticinin payı yok');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e2"}', false);
set role authenticated;
select save_profile('Sakin İki', null);
select accept_invite(:'tk1');
select t_eq(round((expense_breakdown(:'b2', date_trunc('month', current_date)::date, current_date + 40)->>'share_ratio')::numeric, 2), 0.40::numeric, 'dağılım: 1000/2500 = %40 pay');
select t_eq((select count(*)::int from expenses), 4, 'sakin giderleri görür');
select t_expect_err(format($q$select bulk_invites(%L)$q$, :'b2'), 'yalnızca yönetici');
-- sakin hesabını siler
select prepare_account_deletion();
select t_eq((select count(*)::int from my_buildings()), 0, 'hesap silinince üyelik biter');
reset role;
select t_eq((select full_name from profiles where id = '00000000-0000-0000-0000-0000000000e2'), 'Silinmiş kullanıcı', 'profil anonimleşti');
select t_eq((select count(*)::int from dues_charges where building_id = :'b2'), 4, 'apartmanın kayıtları korunur');
-- yönetici, başka üye varken silemez
select token as tk2 from invites where building_id = :'b2' and unit_id = (select id from units where building_id = :'b2' and label = 'Daire 2') and used_at is null and revoked_at is null \gset
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3"}', false);
set role authenticated;
select save_profile('Sakin Üç', null);
select accept_invite(:'tk2');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1"}', false);
set role authenticated;
select t_expect_err($q$select prepare_account_deletion()$q$, 'yönetimi bir sakine devret');
select t_eq((select count(*)::int from bulk_invites(:'b2')), 3, 'toplu davet: dolu daire atlanır, hesabı silinenin dairesi tekrar boş');
reset role;
\o

-- ---------- 14. Bina acil rehberi ----------
\o /dev/null
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1"}', false);
set role authenticated;
select save_emergency_info(:'b2', '{"water_valve":"Bodrum kat, kazan dairesi kapısının solu","elevator_company":"ABC Asansör","elevator_phone":"0212 000 00 00","gathering_area":"Moda Parkı","notes":"  "}');
select t_eq((select water_valve from building_emergency where building_id = :'b2'), 'Bodrum kat, kazan dairesi kapısının solu', 'acil rehber kaydedildi');
select t_eq((select notes from building_emergency where building_id = :'b2'), null, 'boş alan null kaydedilir');
select save_emergency_info(:'b2', '{"water_valve":"Bodrum kat","gathering_area":"Moda Parkı"}');
select t_eq((select elevator_company from building_emergency where building_id = :'b2'), null, 'güncelleme tüm alanları yeniler');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e3"}', false);
set role authenticated;
select t_eq((select gathering_area from building_emergency where building_id = :'b2'), 'Moda Parkı', 'sakin acil rehberi görür');
select t_eq((select full_name from building_managers(:'b2')), 'Yönetici İki', 'sakin yöneticiyi görür');
select t_expect_err(format($q$select save_emergency_info(%L, '{}')$q$, :'b2'), 'yalnızca yönetici');
reset role;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000d"}', false);
set role authenticated;
select t_eq((select count(*)::int from building_emergency), 0, 'yabancı acil rehberi görmez');
select t_eq((select count(*)::int from building_managers(:'b2')), 0, 'yabancı yöneticiyi görmez');
reset role;
\o
\echo 'TÜM TESTLER GEÇTİ'
