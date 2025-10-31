// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      // map figma:* ไปที่รูป placeholder เพื่อให้ build ผ่าน
      { find: /^figma:asset\/.*/, replacement: path.resolve(__dirname, './src/assets/figma/placeholder.png') },
      { find: /^figma:.*/, replacement: path.resolve(__dirname, './src/assets/figma/placeholder.png') },
    ],
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          radix: [
            '@radix-ui/react-dialog',
            '@radix-ui/react-navigation-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-tooltip',
          ],
          charts: ['recharts'],
          pdf: ['jspdf', 'jspdf-autotable', 'html2canvas'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
    chunkSizeWarningLimit: 1500,
  },
  server: { port: 3000, open: true },
});
