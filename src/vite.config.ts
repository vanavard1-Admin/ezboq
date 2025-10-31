import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      './components': path.resolve(__dirname, './components'),
      './pages': path.resolve(__dirname, './pages'),
      './utils': path.resolve(__dirname, './utils'),
      './types': path.resolve(__dirname, './types'),
      './data': path.resolve(__dirname, './data'),
      './styles': path.resolve(__dirname, './styles')
    }
  },
  server: {
    port: 5173,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Clear cache before build
    emptyOutDir: true,
    rollupOptions: {
      // Ignore figma:asset imports that might be in cache
      external: (id) => {
        if (id.startsWith('figma:')) {
          console.warn(`⚠️  Ignoring Figma asset: ${id}`);
          return true;
        }
        return false;
      },
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'pdf-vendor': ['jspdf', 'html2canvas'],
          'supabase-vendor': ['@supabase/supabase-js']
        }
      }
    }
  }
})
