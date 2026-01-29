import { describe, expect, test } from "bun:test";
import { LocalTwitterProvider } from "../lib/twitter/local";

describe("start_time による重複排除フィルタリング", () => {
  const provider = new LocalTwitterProvider();

  test("start_time を指定しない場合、全てのツイートが返される", async () => {
    const result = await provider.searchTweets({
      query: "チームみらい",
      max_results: 10,
    });

    expect(result.tweets).toBeDefined();
    expect(result.tweets?.length).toBeGreaterThan(0);
  });

  test("start_time を指定した場合、それ以降のツイートのみ返される", async () => {
    // モックデータの created_at は 2024-01-15T10:30:00 〜 14:00:00
    const startTime = "2024-01-15T12:00:00.000Z";

    const result = await provider.searchTweets({
      query: "チームみらい",
      max_results: 10,
      start_time: startTime,
    });

    expect(result.tweets).toBeDefined();
    for (const tweet of result.tweets ?? []) {
      expect(new Date(tweet.created_at ?? "").getTime()).toBeGreaterThanOrEqual(
        new Date(startTime).getTime(),
      );
    }
  });

  test("start_time が全ツイートより未来の場合、空の結果が返される", async () => {
    const result = await provider.searchTweets({
      query: "チームみらい",
      max_results: 10,
      start_time: "2025-01-01T00:00:00.000Z",
    });

    expect(result.tweets).toBeDefined();
    expect(result.tweets?.length).toBe(0);
  });

  test("start_time が全ツイートより過去の場合、全てのマッチするツイートが返される", async () => {
    const allResult = await provider.searchTweets({
      query: "チームみらい",
      max_results: 10,
    });

    const filteredResult = await provider.searchTweets({
      query: "チームみらい",
      max_results: 10,
      start_time: "2020-01-01T00:00:00.000Z",
    });

    expect(filteredResult.tweets?.length).toBe(allResult.tweets?.length ?? 0);
  });
});
