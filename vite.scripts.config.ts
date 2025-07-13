import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { defineConfig } from "vite";

// scriptsディレクトリのTSファイルを動的に取得
function getScriptEntries() {
  const scriptsDir = "scripts";
  const files = readdirSync(scriptsDir);
  const entries: Record<string, string> = {};

  for (const file of files) {
    if (file.endsWith(".ts") && !file.endsWith(".test.ts")) {
      const name = file.replace(".ts", "");
      entries[name] = resolve(__dirname, join(scriptsDir, file));
    }
  }

  return entries;
}

export default defineConfig({
  build: {
    ssr: true,
    lib: {
      entry: getScriptEntries(),
      formats: ["es"],
    },
    outDir: "dist/scripts",
  },
});
