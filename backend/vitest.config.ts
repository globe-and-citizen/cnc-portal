import { defineConfig } from "vitest/config";
// import tsconfigPaths from "vite-tsconfig-paths"; // only if you are using custom tsconfig paths

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: 'istanbul',
      enabled: true
    }
  },
  // plugins: [tsconfigPaths()], // only if you are using custom tsconfig paths
});
