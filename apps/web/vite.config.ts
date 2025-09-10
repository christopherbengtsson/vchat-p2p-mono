/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { qrcode } from 'vite-plugin-qrcode';
import path from 'path';
import { generateGameChunks } from './scripts/generateGameChunks.js';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react({
      babel: {
        plugins: [
          [
            '@babel/plugin-proposal-decorators',
            {
              version: '2023-05',
            },
          ],
        ],
      },
    }),
    qrcode(),
  ],
  assetsInclude: ['**/*.md'],
  define: {
    APP_VERSION: JSON.stringify(process.env.npm_package_version),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  worker: {
    format: 'es',
  },
  build: {
    // Generate source maps for better debugging
    sourcemap: mode === 'development',
    // Optimize CSS
    cssCodeSplit: true,
    // Reduce chunk size warnings threshold
    rollupOptions: {
      output: {
        // TODO: Implement preloading?
        manualChunks: {
          // Critical path - loads first
          'vendor-core': ['react', 'react-dom'],
          'vendor-3d': ['three', '@react-three/fiber', '@react-three/drei'],

          // Router can be separate if not needed immediately
          router: ['react-router'],

          // UI layer - frequently used together
          'ui-system': [
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-avatar',
            // ... other Radix components
            'lucide-react',
            'react-icons',
            'sonner',
            'vaul',
            'class-variance-authority',
            'clsx',
            'tailwind-merge',
          ],

          // Game chunks
          ...generateGameChunks(),

          // Forms and validation
          forms: ['react-hook-form', '@hookform/resolvers', 'zod'],

          // State and data
          'state-management': ['@tanstack/react-query', 'mobx', 'mobx-react'],

          // Network layer
          network: ['socket.io-client', '@supabase/supabase-js', 'axios'],

          // Heavy ML libraries (are lazy loaded)
          'ml-tensorflow': ['@tensorflow/tfjs'],
          'ml-moderation': ['nsfwjs'],

          // Early-load monitoring
          monitoring: ['@grafana/faro-react', '@grafana/faro-web-tracing'],

          // Security
          security: ['@cap.js/widget'],
        },
        chunkFileNames: ({ name }) => {
          return `assets/${name}-[hash].js`;
        },
        assetFileNames: ({ name }) => {
          const ext = name?.split('.').pop();
          if (ext === 'css') return 'assets/[name]-[hash].css';
          return 'assets/[name]-[hash].[ext]';
        },
      },
    },
    modulePreload: true,
  },

  /** Development */

  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/captcha': {
        target: 'http://localhost:8000/api/v1',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['**/*.test.{tsx,ts}'],
    setupFiles: ['./src/testSetup.ts'],
    env: loadEnv(mode, process.cwd(), ''),
    css: true,
    exclude: [
      '**/e2e/**',
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{vite,vitest,eslint,prettier}.config.*',
    ],
  },
}));
