-- Yeni fiyat: daire başı 15 TL (KDV dahil), en az 99 TL
create or replace function public.komsum_price(unit_count int) returns int
language sql immutable as $$
  select greatest(99, 15 * coalesce(unit_count,0))
$$;
