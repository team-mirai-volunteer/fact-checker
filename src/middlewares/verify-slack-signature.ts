// src/middlewares/verify-slack-signature.ts
import { isValidSlackRequest } from "@slack/bolt";
import type { Context, Next } from "hono";

// Slack が許容するリクエスト時刻のずれ(秒)
const MAX_TIMESTAMP_DELTA_SEC = 60 * 5;

/**
 * Slack からのリクエストであることを署名(X-Slack-Signature)で検証する。
 * - SLACK_SIGNING_SECRET が未設定の場合は常に拒否する(fail-closed)
 * - タイムスタンプが現在時刻から 5 分以上ずれている場合は拒否する
 * - 検証に使った生の body は Hono 側でキャッシュされるため、後続のハンドラでも c.req.text() で再取得できる
 */
export const verifySlackSignature = async (c: Context, next: Next) => {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) {
    console.error("SLACK_SIGNING_SECRET is not set");
    return c.text("Unauthorized", 401);
  }

  const signature = c.req.header("x-slack-signature");
  const timestampHeader = c.req.header("x-slack-request-timestamp");
  if (!signature || !timestampHeader || !/^\d+$/.test(timestampHeader)) {
    return c.text("Unauthorized", 401);
  }

  const timestamp = Number(timestampHeader);
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - timestamp) > MAX_TIMESTAMP_DELTA_SEC) {
    return c.text("Unauthorized", 401);
  }

  // JSON / フォームとしてパースする前の生の body で検証する
  const rawBody = await c.req.text();

  const valid = isValidSlackRequest({
    signingSecret,
    body: rawBody,
    headers: {
      "x-slack-signature": signature,
      "x-slack-request-timestamp": timestamp,
    },
  });
  if (!valid) {
    return c.text("Unauthorized", 401);
  }

  await next();
};
