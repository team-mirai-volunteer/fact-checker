import type { Context, Next } from "hono";

export const basicAuth = () => {
  const username =
    process.env.BASIC_AUTH_USER ??
    (() => {
      throw new Error("BASIC_AUTH_USER is not set");
    })();
  const password =
    process.env.BASIC_AUTH_PASS ??
    (() => {
      throw new Error("BASIC_AUTH_PASS is not set");
    })();

  return async (c: Context, next: Next) => {
    const authHeader = c.req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Basic ")) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const base64Credentials = authHeader.slice(6);
    const credentials = atob(base64Credentials);
    const [user, pass] = credentials.split(":");

    if (user !== username || pass !== password) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    await next();
  };
};
