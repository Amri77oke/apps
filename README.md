# SA Animation Studio
Deploy ke Netlify: push ke GitHub lalu "Import project" (build otomatis dari netlify.toml), atau `npm i && npm run build` lalu seret folder `dist` ke app.netlify.com/drop.
Dukungan browser (UI berjalan di semua browser modern dengan dukungan ES module):
- Ekspor WebCodecs (kualitas terbaik): Chrome/Edge 94+, Firefox 130+, Safari 16.4+.
- Fallback MediaRecorder: Chrome 47+, Firefox 30+ (hasil WebM), Safari 14.1+ (hasil MP4).
- Browser lebih tua: UI tetap jalan, ekspor video menampilkan pesan yang jelas.
