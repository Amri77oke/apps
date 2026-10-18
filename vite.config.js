import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  build: {
    // es2018: sintaks diturunkan agar UI berjalan di browser lama (Safari 11.1+, Chrome 61+,
    // Firefox 60+ — batas dukungan ES module). Ekspor video tetap memakai WebCodecs bila
    // tersedia, dengan fallback MediaRecorder dan pesan error yang jelas di browser lebih tua.
    target: 'es2018',
    chunkSizeWarningLimit: 4000,
  },
});
