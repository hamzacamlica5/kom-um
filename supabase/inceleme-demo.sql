-- Apartmanca · App Store / Google Play inceleme ekibi için demo apartman
-- ÖNCE: Supabase → Authentication → Users → "Add user" → "Create new user" ile iki kullanıcı ekle
--   1) inceleme@apartmanca.com        (yönetici)  — "Auto Confirm User" işaretli, güçlü bir şifre
--   2) inceleme-sakin@apartmanca.com  (sakin)     — "Auto Confirm User" işaretli, güçlü bir şifre
-- SONRA bu dosyanın tamamını SQL Editor'de çalıştır. Tarihler çalıştırıldığı aya göre ayarlanır.
-- Uygulamada bu iki e-posta için kod yerine şifre sorulur (src/screens/auth.tsx → REVIEW_EMAILS).

do $$
declare
  m uuid; r uuid; bid uuid; t7 text; c record; n int := 0;
  p0 text := to_char(current_date, 'YYYY-MM');
  p1 text := to_char(current_date - interval '1 month', 'YYYY-MM');
  p2 text := to_char(current_date - interval '2 month', 'YYYY-MM');
  d0 date := date_trunc('month', current_date)::date;
  d1 date := (date_trunc('month', current_date) - interval '1 month')::date;
  d2 date := (date_trunc('month', current_date) - interval '2 month')::date;
  as_user text;
begin
  select id into m from auth.users where email = 'inceleme@apartmanca.com';
  select id into r from auth.users where email = 'inceleme-sakin@apartmanca.com';
  if m is null or r is null then
    raise exception 'Önce iki inceleme kullanıcısını Authentication → Users bölümünden ekleyin.';
  end if;
  if exists (select 1 from memberships where user_id = m and ended_at is null) then
    raise notice 'İnceleme hesabının zaten bir apartmanı var; hiçbir şey değiştirilmedi.';
    return;
  end if;

  -- yönetici
  perform set_config('request.jwt.claims', json_build_object('sub', m, 'role', 'authenticated')::text, true);
  perform save_profile('Deniz Yönetici', '0500 000 00 00');
  bid := create_building('Örnek Apartmanı', 'Örnek Mah. Deneme Sok. No: 1, Kadıköy / İstanbul', 12, 1500, 10);
  select token into t7 from bulk_invites(bid) where unit_label = 'Daire 7';
  perform set_opening_balance(bid, 38450, d2, 'Önceki yönetimden devreden');
  perform generate_dues(bid, p2);
  perform generate_dues(bid, p1);
  perform generate_dues(bid, p0);

  -- iki ay önce ve geçen ay: Daire 9 hariç herkes ödemiş
  for c in select id, amount, period from charge_status
           where building_id = bid and period in (p2, p1) and unit_label <> 'Daire 9' loop
    n := n + 1;
    perform record_payment(c.id, c.amount, (to_date(c.period || '-01', 'YYYY-MM-DD') + (2 + n % 6))::date, case when n % 5 = 0 then 'cash' else 'bank' end, null);
  end loop;
  -- bu ay: bir kısmı ödedi
  for c in select id, amount from charge_status
           where building_id = bid and period = p0 and unit_label in ('Daire 1','Daire 2','Daire 3','Daire 4','Daire 5','Daire 8','Daire 10') loop
    perform record_payment(c.id, c.amount, least(current_date, d0 + 2), 'bank', null);
  end loop;

  perform add_expense(bid, 'Temizlik', 'Merdiven ve ortak alan temizliği', 'Örnek Temizlik', 4200, d2 + 27, null);
  perform add_expense(bid, 'Temizlik', 'Merdiven ve ortak alan temizliği', 'Örnek Temizlik', 4200, d1 + 27, null);
  perform add_expense(bid, 'Asansör', 'Aylık asansör bakımı', 'Örnek Asansör', 2400, d2 + 14, null);
  perform add_expense(bid, 'Asansör', 'Aylık asansör bakımı', 'Örnek Asansör', 2400, d1 + 14, null);
  perform add_expense(bid, 'Elektrik', 'Ortak alan elektriği', 'Elektrik dağıtım şirketi', 1380, d2 + 19, null);
  perform add_expense(bid, 'Elektrik', 'Ortak alan elektriği', 'Elektrik dağıtım şirketi', 1295, d1 + 19, null);
  perform add_expense(bid, 'Su', 'Ortak alan ve bahçe suyu', 'Su idaresi', 640, d1 + 24, null);
  perform add_expense(bid, 'Bakım-onarım', 'Çatı oluk temizliği ve onarımı', 'Örnek Usta', 3200, least(current_date, d0 + 1), null);
  perform post_announcement(bid, 'Çatı oluk temizliği tamamlandı', 'Yağmur öncesi çatı olukları temizlendi ve iki noktadaki sızıntı onarıldı. Faturayı Kasa bölümünde görebilirsiniz.');
  perform post_announcement(bid, 'Asansör bakımı', 'Bu hafta asansör iki saatliğine bakımda olacak. Anlayışınız için teşekkürler.');
  perform save_emergency_info(bid, '{"water_valve":"Bodrum kat, kazan dairesi kapısının solunda kırmızı vana","electric_panel":"Giriş kat, merdiven altındaki gri dolap","gas_valve":"Bina dışı, bahçe kapısının sağında","elevator_company":"Örnek Asansör","elevator_phone":"0000 000 00 00","caretaker_name":"Görevli","caretaker_phone":"0000 000 00 00","gathering_area":"Bina önündeki park","notes":"Yangın tüpleri her katta merdiven başında."}'::jsonb);

  -- sakin: Daire 7'ye katılır, bu ayın aidatı için ödeme bildirir, arıza açar
  perform set_config('request.jwt.claims', json_build_object('sub', r, 'role', 'authenticated')::text, true);
  perform save_profile('Ece Sakin', null);
  perform accept_invite(t7);
  perform submit_payment_notice((select id from charge_status where building_id = bid and unit_label = 'Daire 7' and period = p0), 1500, current_date, null, 'Bu ayın aidatı');
  perform create_maintenance_request(bid, 'Garaj kapısı kumandası çalışmıyor', 'Sabahtan beri kumandayla açılmıyor, elle açılabiliyor.', null);

  perform set_config('request.jwt.claims', '', true);
  raise notice 'Demo apartman hazır: %', bid;
end $$;
