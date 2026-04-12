import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}'],
    exclude: ['tests/**', 'node_modules/**', 'build/**'],
    coverage: {
      reporter: ['text', 'html'],
    },
  },
});
