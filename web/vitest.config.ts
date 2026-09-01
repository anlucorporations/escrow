import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.{ts,tsx}'],
    // Q9/H-24: cobertura con umbrales de no-regresión en CI (npm run test:coverage).
    // Meta documentada: subir progresivamente a >=70% líneas / >=70% ramas.
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['server/**/*.js', 'lib/**/*.{ts,tsx}'],
      thresholds: {
        statements: 40,
        branches: 50,
        functions: 40,
        lines: 40,
      },
    },
  },
})
