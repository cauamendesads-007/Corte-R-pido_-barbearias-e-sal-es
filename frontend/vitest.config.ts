/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/testes/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache', 'src/features/checkout/**/*', 'src/features/onboarding/**/*', 'src/features/painel-barbeiro/**/*', 'src/features/perfil/**/*', 'src/features/painel-admin/**/*', 'src/features/agendamento/**/*', 'src/features/estabelecimentos/**/*', 'src/features/feed/**/*', 'src/features/configuracoes/**/*', 'src/features/auth/**/*', 'src/features/assinaturas/**/*'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      all: true,
      include: ['src/features/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.stories.tsx',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/**/index.ts',
        'src/**/constants.ts',
        'src/**/*.constantes.tsx',
        'src/componentes/**',
        'src/hooks/**',
        'src/regras/**',
        'src/servicos/**',
        'src/tipos/**',
        'src/estilos/**',
      ],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
      watermarks: {
        statements: [80, 100],
        branches: [80, 100],
        functions: [80, 100],
        lines: [80, 100],
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    isolate: true,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        minThreads: 1,
        maxThreads: 4,
      },
    },
    reporters: ['verbose'],
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,
    sequence: {
      shuffle: true,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});