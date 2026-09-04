import { defineConfig } from "vitest/config";

export default defineConfig({
  root: "..",
  test: { environment: "jsdom", include: ["tests/frontend/**/*.test.ts", "tests/frontend/**/*.test.tsx"] }
});
