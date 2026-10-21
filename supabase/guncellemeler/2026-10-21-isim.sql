-- Apartmanca güncellemesi · 21 Ekim 2026 — test bildirimindeki ad
create or replace function public.send_test_notification() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then perform raise_tr('Oturum açman gerekiyor.'); end if;
  perform notify(auth.uid(), null, 'test', 'Apartmanca test bildirimi', 'Bildirimler bu telefonda çalışıyor.', '/');
end $$;
