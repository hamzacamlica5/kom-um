# Tanıtım videosu (16:9)

1. `seed.sql` ile örnek "Lale Apartmanı" verisini yerel bir veritabanına yükle.
2. `DEV_DB=.../komsum_demo PORT=5174 bun scripts/dev-server.ts` ile örnek sunucuyu başlat.
3. `node tanitim/capture.mjs` → uygulama ekranlarını `shots/` klasörüne kaydeder.
4. `node tanitim/render.mjs` → kareleri üretir; ardından `ffmpeg -framerate 30 -i frames/f%04d.jpg -c:v libx264 -crf 18 -pix_fmt yuv420p -movflags +faststart komsum-tanitim-16x9.mp4`.

Web adresi `promo.html` içindeki `#url` öğesinde; alan adı alınınca güncellenip yeniden üretilir.
