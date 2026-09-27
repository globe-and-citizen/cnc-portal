import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/integration/payroll-database.integration.test.ts'],
    maxWorkers: 1,
    testTimeout: 30_000,
  },
});
