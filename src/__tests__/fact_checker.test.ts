import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createFactChecker } from "../lib/fact_checker";
import { createOpenAIFactChcker } from "../lib/fact_checker/openapi";

describe("createFactChecker", () => {
  describe("createOpenAIFactChecker", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    test("必須環境変数がない場合エラーになること", () => {
      process.env.OPENAI_API_KEY = "test-api-key";
      process.env.VECTOR_STORE_ID = undefined;

      expect(() => createOpenAIFactChcker()).toThrow(
        "VECTOR_STORE_ID is not set",
      );

      process.env.OPENAI_API_KEY = undefined;
      process.env.VECTOR_STORE_ID = "test-vector-store-id";

      expect(() => createOpenAIFactChcker()).toThrow(
        "OPENAI_API_KEY is not set",
      );
    });

    test("必須環境変数がある場合エラーにならないこと", () => {
      process.env.OPENAI_API_KEY = "test-api-key";
      process.env.VECTOR_STORE_ID = "test-vector-store-id";

      expect(() => createOpenAIFactChcker()).not.toThrow();

      const factChecker = createOpenAIFactChcker();
      expect(factChecker).toBeDefined();
      expect(factChecker.factCheck).toBeDefined();
      expect(typeof factChecker.factCheck).toBe("function");
    });
  });

  describe("環境変数によるプロバイダー選択", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
      process.env.OPENAI_API_KEY = "test-api-key";
      process.env.VECTOR_STORE_ID = "test-vector-store-id";
      process.env.FACT_CHECKER_PROVIDER_ENDPOINT = "https://example.com/api";
      process.env.FACT_CHECKER_PROVIDER_TOKEN = "token";
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    test.each([
      ["openai", "openai"],
      ["local", "local"],
      ["dify", "dify"],
      ["", "local"], // デフォルトは local
    ])("ENVが%sの場合、%sが使用されること", (env, want) => {
      process.env.FACT_CHECKER_PROVIDER = env;

      expect(() => createFactChecker()).not.toThrow();

      const factChecker = createFactChecker();
      expect(factChecker).toBeDefined();
      expect(factChecker.provider).toBe(want as "openai" | "local" | "dify");
    });
  });
});
