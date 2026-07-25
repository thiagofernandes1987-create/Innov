import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", "docs/referencias/**"],
    coverage: {
      reporter: ["text", "json-summary"]
    }
  }
});
