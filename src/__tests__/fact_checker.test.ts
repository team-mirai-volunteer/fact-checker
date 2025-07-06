import { afterEach, beforeEach, describe, expect, test } from "vitest";
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
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    test.each([
      ["dev", "openai"],
      ["prod", "openai"],
      ["local", "local"],
      ["test", "local"],
    ])("ENVが%sの場合、%sが使用されること", (env, want) => {
      process.env.ENV = env;

      expect(() => createFactChecker()).not.toThrow();

      const factChecker = createFactChecker();
      expect(factChecker).toBeDefined();
      expect(factChecker.provider).toBe(want as "openai" | "local");
    });
  });
});
