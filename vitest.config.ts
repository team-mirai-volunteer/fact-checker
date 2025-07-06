import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
    typecheck: {
      tsconfig: "./tsconfig.json",
    },
  },
});
