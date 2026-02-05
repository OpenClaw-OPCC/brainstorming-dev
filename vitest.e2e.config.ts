import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/e2e/**/*.test.ts"],
    globalSetup: ["src/e2e/globalSetup.ts"],
    testTimeout: 300000,
    hookTimeout: 300000,
  },
});
