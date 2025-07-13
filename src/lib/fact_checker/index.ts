import { createDifyFactChecker } from "./dify";
import { createLocalFactChecker } from "./local";
import { createOpenAIFactChcker } from "./openapi";
import type { FactChcker } from "./types";

export function createFactChecker(): FactChcker {
  const provider = process.env.FACT_CHECKER_PROVIDER || "local";

  switch (provider) {
    case "openai":
      return createOpenAIFactChcker();
    case "local":
      return createLocalFactChecker();
    case "dify":
      return createDifyFactChecker();
    default:
      throw new Error(`Unsupported fact checker provider: ${provider}`);
  }
}
