import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

// Pecah vendor jadi chunk terpisah agar cache browser efektif: perubahan kode app
// tidak membatalkan cache lib besar (react/remotion/sucrase). mediabunny,
// @remotion/web-renderer, dan fflate sudah otomatis jadi chunk on-demand lewat
// dynamic import di kode aplikasi.
const splitVendor = (id) => {
  if (!id.includes('node_modules')) return null;
  if (id.includes('/remotion') || id.includes('@remotion')) return 'remotion';
  if (id.includes('framer-motion') || id.includes('motion-dom') || id.includes('motion-utils')) return 'framer-motion';
  if (id.includes('lucide-react')) return 'lucide';
  if (id.includes('react-dom') || id.match(/[\\/]react[\\/]/) || id.includes('scheduler')) return 'react';
  if (id.includes('sucrase')) return 'sucrase';
  return 'vendor';
};

export default defineConfig({
  plugins: [react()],
  build: {
    // es2018: sintaks diturunkan agar UI berjalan di browser lama (Safari 11.1+, Chrome 61+,
    // Firefox 60+ — batas dukungan ES module). Ekspor video tetap memakai WebCodecs bila
    // tersedia, dengan fallback MediaRecorder dan pesan error yang jelas di browser lebih tua.
    target: 'es2018',
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      output: {
        manualChunks: splitVendor,
      },
    },
  },
});
