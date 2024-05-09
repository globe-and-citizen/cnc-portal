import tsconfigPaths from "vite-tsconfig-paths"; // only if you are using custom tsconfig paths
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
  },
  plugins: [tsconfigPaths()], // only if you are using custom tsconfig paths
});
