import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  server: {
    host: "127.0.0.1",
  },
  test: {
    environment: "node",
    include: ["src/e2e/**/*.test.ts"],
  },
});
