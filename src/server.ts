// 本番環境用のサーバー起動ファイル
// index.tsとの分離理由:
// - 開発時: Vite dev serverがindex.tsを直接使用してホットリロード
// - 本番時: このファイルが@hono/node-serverでスタンドアロン起動
// - テスト時: index.tsのappオブジェクトのみを使用してサーバー起動を回避
import { serve } from "@hono/node-server";
import app from "./index";

serve({
  fetch: app.fetch,
  port: Number(process.env.PORT) || 8080,
  hostname: "0.0.0.0",
});
