import { configDefaults, defineConfig, mergeConfig } from 'vitest/config';
import vitestConfig from './vitest.config';

export default mergeConfig(
  vitestConfig,
  defineConfig({
    test: {
      // Keep unit coverage limited to backend source tests; integration suites
      // require their own explicit configuration and database setup.
      include: ['src/**/*.test.ts'],
      exclude: [...configDefaults.exclude, '**/*.e2e-{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    },
  })
);
