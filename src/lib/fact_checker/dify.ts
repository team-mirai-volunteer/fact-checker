import type { CheckResult, FactChcker } from "./types";

let checker: FactChcker;

export function createDifyFactChecker(): FactChcker {
  if (checker) return checker;

  const endpoint =
    process.env.FACT_CHECKER_PROVIDER_ENDPOINT ??
    (() => {
      throw new Error("FACT_CHECKER_PROVIDER_ENDPOINT is not set");
    })();

  const token =
    process.env.FACT_CHECKER_PROVIDER_TOKEN ??
    (() => {
      throw new Error("FACT_CHECKER_PROVIDER_TOKEN is not set");
    })();

  checker = {
    provider: "dify",
    factCheck: async (content: string): Promise<CheckResult> => {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: {},
            query: content,
            user: "abc-123",
            files: [],
          }),
        });

        if (!response.ok) {
          const msg = await response.text();
          return {
            ok: false,
            answer: `エラーが発生しました: ${msg}\n管理者に連絡してください`,
            citations: [],
          };
        }

        const data: { answer: string } = await response.json();

        return {
          ok: !/NG/.test(data.answer),
          answer: data.answer,
          citations: [],
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return {
          ok: false,
          answer: `エラーが発生しました: ${msg}\n管理者に連絡してください`,
          citations: [],
        };
      }
    },
  };
  return checker;
}
