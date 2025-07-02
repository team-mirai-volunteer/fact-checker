// src/middlewares/verify-cron.ts
import type { Context, Next } from "hono";

export const verifyCron = async (c: Context, next: Next) => {
  const expected = Bun.env.CRON_SECRET; // Secret Manager から注入
  const received = c.req.header("x-cron-secret");

  if (!expected || received !== expected) return c.text("Forbidden", 403);
  await next();
};
