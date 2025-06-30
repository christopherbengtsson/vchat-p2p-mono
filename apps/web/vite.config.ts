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
          // React core
          'react-core': ['react', 'react-dom', 'react-router'],

          // UI components
          'ui-components': [
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-label',
            '@radix-ui/react-slot',
            'lucide-react',
            'react-icons',
            'sonner',
            'vaul',
          ],

          // Game chunks - dynamically generated
          ...generateGameChunks(),

          // Form handling
          'form-utils': ['react-hook-form', '@hookform/resolvers', 'zod'],

          // Data management
          'data-management': ['@tanstack/react-query', 'mobx', 'mobx-react'],

          // WebRTC and networking
          networking: ['socket.io-client', '@supabase/supabase-js'],

          // Styling utilities
          styling: ['class-variance-authority', 'clsx', 'tailwind-merge'],

          // Monitoring
          monitoring: ['@grafana/faro-react', '@grafana/faro-web-tracing'],

          // Content moderation
          'content-moderation': ['@tensorflow/tfjs', 'nsfwjs'],
        },
      },
    },
  },

  /** Development */

  server: {
    port: 3000,
    host: true,
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
