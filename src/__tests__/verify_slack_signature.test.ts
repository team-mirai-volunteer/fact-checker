import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createHmac } from "node:crypto";
import { Hono } from "hono";
import { verifySlackSignature } from "../middlewares/verify-slack-signature";

const SECRET = "test-signing-secret";

function sign(body: string, timestamp: number, secret = SECRET) {
  const hash = createHmac("sha256", secret)
    .update(`v0:${timestamp}:${body}`)
    .digest("hex");
  return `v0=${hash}`;
}

function buildApp() {
  const app = new Hono();
  app.post("/slack", verifySlackSignature, async (c) => {
    return c.text(await c.req.text());
  });
  return app;
}

function request(
  app: Hono,
  body: string,
  headers: Record<string, string | undefined>,
) {
  const h = new Headers({ "content-type": "application/json" });
  for (const [k, v] of Object.entries(headers)) {
    if (v !== undefined) h.set(k, v);
  }
  return app.request("/slack", { method: "POST", body, headers: h });
}

describe("verifySlackSignature", () => {
  const originalEnv = process.env;
  const body = JSON.stringify({ type: "event_callback" });

  beforeEach(() => {
    process.env = { ...originalEnv, SLACK_SIGNING_SECRET: SECRET };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test("正しい署名なら後続ハンドラが生 body を受け取れること", async () => {
    const ts = Math.floor(Date.now() / 1000);
    const res = await request(buildApp(), body, {
      "x-slack-signature": sign(body, ts),
      "x-slack-request-timestamp": String(ts),
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe(body);
  });

  test.each([
    ["署名ヘッダが無い", undefined, 0],
    ["署名が異なる secret で作られている", "wrong-secret", 0],
    ["タイムスタンプが5分超過去", SECRET, -301],
    ["タイムスタンプが5分超未来", SECRET, 301],
  ])("%sの場合は401になること", async (_name, secret, offset) => {
    const ts = Math.floor(Date.now() / 1000) + offset;
    const res = await request(buildApp(), body, {
      "x-slack-signature": secret ? sign(body, ts, secret) : undefined,
      "x-slack-request-timestamp": String(ts),
    });
    expect(res.status).toBe(401);
  });

  test("body が改ざんされている場合は401になること", async () => {
    const ts = Math.floor(Date.now() / 1000);
    const res = await request(buildApp(), `${body} `, {
      "x-slack-signature": sign(body, ts),
      "x-slack-request-timestamp": String(ts),
    });
    expect(res.status).toBe(401);
  });

  test("SLACK_SIGNING_SECRET が未設定なら401になること", async () => {
    delete process.env.SLACK_SIGNING_SECRET;
    const ts = Math.floor(Date.now() / 1000);
    const res = await request(buildApp(), body, {
      "x-slack-signature": sign(body, ts),
      "x-slack-request-timestamp": String(ts),
    });
    expect(res.status).toBe(401);
  });
});
