\set ON_ERROR_STOP 1
\set QUIET 1
\o /dev/null
create or replace function pg_temp.as_user(e text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', md5(e)::uuid)::text, false)::text::void $$;
insert into auth.users(id, email) select md5(e)::uuid, e from unnest(array[
 'murat@demo.komsum','ayse@demo.komsum','can@demo.komsum','elif@demo.komsum','selin@demo.komsum','burak@demo.komsum','zeynep@demo.komsum','emre@demo.komsum']) e;

-- yönetici
select set_config('request.jwt.claims', json_build_object('sub', md5('murat@demo.komsum')::uuid)::text, false);
set role authenticated;
select save_profile('Murat Kaya', '0532 111 22 33');
select create_building('Lale Apartmanı', 'Caferağa Mah. Moda Cad. No: 24, Kadıköy / İstanbul', 12, 1500, 10) as bid \gset
select save_unit(:'bid', (select id from units where building_id=:'bid' and label='Daire 1'), 'Daire 1 (Dükkan)', 2000, 10);
-- davetler
select token as t2 from bulk_invites(:'bid') where unit_label='Daire 2' \gset
select token as t3 from bulk_invites(:'bid') where unit_label='Daire 3' \gset
select token as t5 from bulk_invites(:'bid') where unit_label='Daire 5' \gset
select token as t7 from bulk_invites(:'bid') where unit_label='Daire 7' \gset
select token as t8 from bulk_invites(:'bid') where unit_label='Daire 8' \gset
select token as t10 from bulk_invites(:'bid') where unit_label='Daire 10' \gset
select token as t11 from bulk_invites(:'bid') where unit_label='Daire 11' \gset
-- başlangıç bakiyesi ve dönemler
select set_opening_balance(:'bid', 38450, '2026-08-01', null);
select generate_dues(:'bid', '2026-08');
select generate_dues(:'bid', '2026-09');
select generate_dues(:'bid', '2026-10');
reset role;

-- sakinler katılır
\set join 'select save_profile(:name, null); select accept_invite(:tok);'
select set_config('request.jwt.claims', json_build_object('sub', md5('ayse@demo.komsum')::uuid)::text, false); set role authenticated;
select save_profile('Ayşe Yılmaz', '0533 444 55 66'); select accept_invite(:'t7'); reset role;
select set_config('request.jwt.claims', json_build_object('sub', md5('can@demo.komsum')::uuid)::text, false); set role authenticated;
select save_profile('Can Demir', null); select accept_invite(:'t2'); reset role;
select set_config('request.jwt.claims', json_build_object('sub', md5('elif@demo.komsum')::uuid)::text, false); set role authenticated;
select save_profile('Elif Şahin', null); select accept_invite(:'t3'); reset role;
select set_config('request.jwt.claims', json_build_object('sub', md5('selin@demo.komsum')::uuid)::text, false); set role authenticated;
select save_profile('Selin Arslan', null); select accept_invite(:'t5'); reset role;
select set_config('request.jwt.claims', json_build_object('sub', md5('burak@demo.komsum')::uuid)::text, false); set role authenticated;
select save_profile('Burak Öztürk', null); select accept_invite(:'t8'); reset role;
select set_config('request.jwt.claims', json_build_object('sub', md5('zeynep@demo.komsum')::uuid)::text, false); set role authenticated;
select save_profile('Zeynep Aydın', null); select accept_invite(:'t10'); reset role;
select set_config('request.jwt.claims', json_build_object('sub', md5('emre@demo.komsum')::uuid)::text, false); set role authenticated;
select save_profile('Emre Koç', null); select accept_invite(:'t11'); reset role;

-- yönetici: ödemeler, giderler, duyuru, acil rehber
select set_config('request.jwt.claims', json_build_object('sub', md5('murat@demo.komsum')::uuid)::text, false);
set role authenticated;
-- Ağustos ve Eylül: hemen herkes ödemiş
select record_payment(c.id, c.amount, (c.period || '-0' || (3 + (row_number() over (order by c.unit_label))::int % 6))::date, case when random() < .8 then 'bank' else 'cash' end, null)
  from charge_status c where c.building_id = :'bid' and c.period in ('2026-08','2026-09') and c.unit_label not in ('Daire 9');
-- Ekim: bir kısmı ödendi
select record_payment(c.id, c.amount, ('2026-10-0' || (2 + (row_number() over (order by c.unit_label))::int % 7))::date, 'bank', null)
  from charge_status c where c.building_id = :'bid' and c.period = '2026-10' and c.unit_label in ('Daire 1 (Dükkan)','Daire 2','Daire 3','Daire 4','Daire 5','Daire 8','Daire 10');
select record_payment((select id from charge_status where building_id=:'bid' and period='2026-10' and unit_label='Daire 11'), 750, '2026-10-09', 'cash', 'Kalanı ay sonunda');
-- giderler
select add_expense(:'bid', 'Temizlik', 'Ağustos merdiven ve ortak alan temizliği', 'Pırıl Temizlik', 4200, '2026-08-28', null);
select add_expense(:'bid', 'Temizlik', 'Eylül merdiven ve ortak alan temizliği', 'Pırıl Temizlik', 4200, '2026-09-28', null);
select add_expense(:'bid', 'Temizlik', 'Ekim merdiven ve ortak alan temizliği', 'Pırıl Temizlik', 4200, '2026-10-13', null);
select add_expense(:'bid', 'Asansör', 'Aylık asansör bakımı (Ağustos)', 'Yükselen Asansör', 2400, '2026-08-15', null);
select add_expense(:'bid', 'Asansör', 'Aylık asansör bakımı (Eylül)', 'Yükselen Asansör', 2400, '2026-09-15', null);
select add_expense(:'bid', 'Asansör', 'Aylık asansör bakımı (Ekim)', 'Yükselen Asansör', 2400, '2026-10-14', null);
select add_expense(:'bid', 'Asansör', 'Kapı kilit mekanizması değişimi', 'Yükselen Asansör', 3850, '2026-09-21', null);
select add_expense(:'bid', 'Elektrik', 'Ortak alan elektriği', 'Enerjisa', 1380, '2026-08-20', null);
select add_expense(:'bid', 'Elektrik', 'Ortak alan elektriği', 'Enerjisa', 1295, '2026-09-20', null);
select add_expense(:'bid', 'Elektrik', 'Ortak alan elektriği', 'Enerjisa', 1340, '2026-10-12', null);
select add_expense(:'bid', 'Su', 'Ortak alan ve bahçe suyu', 'İSKİ', 640, '2026-08-25', null);
select add_expense(:'bid', 'Su', 'Ortak alan ve bahçe suyu', 'İSKİ', 585, '2026-09-25', null);
select add_expense(:'bid', 'Bahçe', 'Bahçe bakımı ve çim biçme', 'Yeşil Bahçe', 1500, '2026-09-06', null);
select add_expense(:'bid', 'Bakım-onarım', 'Çatı oluk temizliği ve onarımı', 'Usta Çatı', 3200, '2026-10-08', null);
select add_expense(:'bid', 'Sigorta', 'Bina sigortası (yıllık, taksit)', 'Örnek Sigorta', 1750, '2026-08-10', null);
select add_expense(:'bid', 'Kırtasiye', 'Toplantı tutanağı ve duyuru çıktıları', null, 180, '2026-09-02', null);
select post_announcement(:'bid', 'Çatı oluk temizliği tamamlandı', 'Yağmur öncesi çatı olukları temizlendi ve iki noktadaki sızıntı onarıldı. Faturayı Kasa bölümünde görebilirsiniz.');
select post_announcement(:'bid', 'Asansör bakımı 14 Ekim Salı', 'Yarın 10:00–12:00 arası asansör bakımda olacak. Anlayışınız için teşekkürler.');
select save_emergency_info(:'bid', '{"water_valve":"Bodrum kat, kazan dairesi kapısının solunda kırmızı vana","electric_panel":"Giriş kat, merdiven altındaki gri dolap","gas_valve":"Bina dışı, bahçe kapısının sağında","elevator_company":"Yükselen Asansör","elevator_phone":"0216 555 12 34","caretaker_name":"Mehmet Usta","caretaker_phone":"0542 222 33 44","gathering_area":"Moda Parkı, deniz tarafındaki giriş","notes":"Yangın tüpleri her katta merdiven başında. Sığınak anahtarı kapıcıda."}');
reset role;

-- Ayşe Ekim için dekont bildirdi, Can arıza açtı
select set_config('request.jwt.claims', json_build_object('sub', md5('ayse@demo.komsum')::uuid)::text, false); set role authenticated;
insert into storage.objects(bucket_id, name, owner) values ('komsum', :'bid' || '/' || md5('ayse@demo.komsum')::uuid || '/dekont-ekim.png', auth.uid());
select submit_payment_notice((select id from charge_status where period='2026-10'), 1500, '2026-10-14', :'bid' || '/' || md5('ayse@demo.komsum')::uuid || '/dekont-ekim.png', 'Ekim aidatı');
select create_maintenance_request(:'bid', 'Garaj kapısı kumandası çalışmıyor', 'Sabahtan beri kumandayla açılmıyor, elle açılabiliyor.', null);
reset role;
select set_config('request.jwt.claims', json_build_object('sub', md5('can@demo.komsum')::uuid)::text, false); set role authenticated;
select create_maintenance_request(:'bid', '3. kat merdiven lambası yanmıyor', null, null);
reset role;
\o
select :'bid' as building;
