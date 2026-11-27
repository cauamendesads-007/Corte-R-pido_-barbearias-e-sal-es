import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
var isGitHubPages = process.env.GITHUB_PAGES === 'true';
var repoName = 'Corte-R-pido_-barbearias-e-sal-es';
var isAnalyze = process.env.ANALYZE === 'true';
export default defineConfig({
    plugins: [
        react(),
        isAnalyze && visualizer({
            filename: 'dist/stats.html',
            open: true,
            gzipSize: true,
            brotliSize: true,
        }),
    ].filter(Boolean),
    base: isGitHubPages ? "/".concat(repoName, "/") : '/',
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 3000,
        open: true,
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
        rollupOptions: {
            output: {
                manualChunks: {
                    'vendor-react': ['react', 'react-dom', 'react-router-dom'],
                    'vendor-ui': ['@headlessui/react', '@heroicons/react'],
                    'vendor-utils': ['date-fns', 'zod'],
                },
                chunkFileNames: 'assets/js/[name]-[hash].js',
                entryFileNames: 'assets/js/[name]-[hash].js',
                assetFileNames: function (assetInfo) {
                    var _a;
                    var name = (_a = assetInfo.name) !== null && _a !== void 0 ? _a : 'asset';
                    var info = name.split('.');
                    var ext = info[info.length - 1];
                    if (/\.(png|jpe?g|gif|svg|webp|avif|woff2?|ttf|eot)$/.test(name)) {
                        return "assets/media/[name]-[hash].".concat(ext);
                    }
                    if (/\.css$/.test(name)) {
                        return "assets/css/[name]-[hash].".concat(ext);
                    }
                    return "assets/[name]-[hash].".concat(ext);
                },
            },
        },
        cssCodeSplit: true,
        modulePreload: {
            polyfill: true,
        },
        minify: 'esbuild',
        target: 'es2022',
    },
    test: {
        environment: 'jsdom',
        setupFiles: ['./src/testes/setup.ts'],
        include: ['src/**/*.test.{ts,tsx}'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html', 'lcov'],
            exclude: ['node_modules/', 'src/testes/', '*.config.ts', '*.d.ts'],
            thresholds: {
                lines: 80,
                functions: 80,
                branches: 70,
                statements: 80,
            },
        },
    },
});
