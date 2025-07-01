import result from "./data/fact-check-result.json" with { type: "json" };
import type { CheckResult, FactChcker } from "./types";

export function createLocalFactChecker(): FactChcker {
  return {
    provider: "local",
    factCheck: async (_content: string): Promise<CheckResult> => {
      return result;
    },
  };
}
