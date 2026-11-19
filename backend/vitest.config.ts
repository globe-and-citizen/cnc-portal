import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: 'istanbul',
      enabled: true,
    },
    env: {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db',
      NODE_ENV: 'test',
    },
  },
});
