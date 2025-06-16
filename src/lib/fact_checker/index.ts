import { createLocalFactChecker } from "./local";
import { createOpenAIFactChcker } from "./openapi";
import type { FactChcker } from "./types";

export function createFactChecker(): FactChcker {
  const env = process.env.ENV || "local";
  const provider = ["prod", "dev"].includes(env) ? "openai" : "local";

  switch (provider) {
    case "openai":
      return createOpenAIFactChcker();
    case "local":
      return createLocalFactChecker();
  }
}
