import build from "@hono/vite-build/node";
import devServer from "@hono/vite-dev-server";
import { defineConfig } from "vite";

export default defineConfig(() => {
  return {
    server: {
      port: 8080,
    },
    build: {
      commonjsOptions: {
        include: ["@slack/bolt", "@slack/web-api"],
      },
      rollupOptions: {
        external: ["@slack/bolt", "@slack/web-api"],
      },
    },
    plugins: [
      build({
        entry: "src/index.ts",
      }),
      devServer({
        entry: "src/index.ts",
        injectClientScript: false, // APIサーバーとして起動する場合はtrueだと、Viteクライアントスクリプトが注入され、console.logでfavicon.ico等の404エラーが発生
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
