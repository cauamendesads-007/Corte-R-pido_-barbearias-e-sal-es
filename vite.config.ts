import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

const isGitHubPages = process.env.GITHUB_PAGES === 'true';
const repoName = 'Corte-R-pido_-barbearias-e-sal-es';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  base: isGitHubPages ? `/${repoName}/` : '/',
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/testes/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/testes/', '*.config.ts', '*.d.ts'],
    },
  },
});