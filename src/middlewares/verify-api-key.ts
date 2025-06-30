import type { Context, Next } from "hono";

export const verifyApiKey = async (c: Context, next: Next) => {
  const expected = Bun.env.API_SECRET_KEY;

  if (!expected) {
    await next();
    return;
  }

  const received = c.req.header("x-api-key");
  if (received !== expected) return c.text("Forbidden", 403);

  await next();
};
