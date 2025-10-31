import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      { find: /^figma:asset\/.*/, replacement: path.resolve(__dirname, './src/assets/figma/placeholder.png') },
      { find: /^figma:.*/, replacement: path.resolve(__dirname, './src/assets/figma/placeholder.png') }
    ]
  },
  build: { target: 'esnext', outDir: 'dist' },
  server: { port: 3000, open: true }
});
