import build from "@hono/vite-build/node";
import devServer from "@hono/vite-dev-server";
import { defineConfig } from "vite";

export default defineConfig(() => {
  return {
    build: {
      commonjsOptions: {
        include: ["@slack/bolt", "@slack/web-api", "@slack/events-api"],
      },
    },
    plugins: [
      build({
        entry: "src/index.ts",
      }),
      devServer({
        entry: "src/index.ts",
      }),
    ],
    test: {
      include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
      typecheck: {
        tsconfig: "./tsconfig.json",
      },
    },
  };
});
