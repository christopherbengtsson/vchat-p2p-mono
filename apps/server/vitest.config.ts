import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/setupTest.ts'],
    env: {
      ...dotenv.config({ path: '.env.test' }).parsed,
    },
  },
});
