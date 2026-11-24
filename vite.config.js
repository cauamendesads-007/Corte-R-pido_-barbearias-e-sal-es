import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
var isGitHubPages = process.env.GITHUB_PAGES === 'true';
var repoName = 'Corte-R-pido_-barbearias-e-sal-es';
export default defineConfig({
    plugins: [react()],
    base: isGitHubPages ? "/".concat(repoName, "/") : '/',
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
