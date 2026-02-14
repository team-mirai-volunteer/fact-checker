import { describe, expect, test } from "vitest";
import {
  extractTweetId,
  preventAutolink,
  removeMentions,
} from "../lib/slack/utils";

describe("slack utils", () => {
  describe("preventAutolink", () => {
    test.each([
      [
        "README.mdがリンク防止文字で変換されること",
        "See README.md for details",
        ["README\u2060.md"],
        ["README.md"],
      ],
      [
        "HTTPSのURLがリンク防止文字で変換されること",
        "Visit https://example.com for more info",
        ["https://example\u2060.com"],
        ["https://example.com"],
      ],
      [
        "複数のURLが変換されること",
        "Check https://github.com and http://example.org",
        ["https://github\u2060.com", "http://example\u2060.org"],
        [],
      ],
    ])("%s", (_, input, expectedContains, expectedNotContains) => {
      const result = preventAutolink(input);

      for (const expected of expectedContains) {
        expect(result).toContain(expected);
      }

      for (const notExpected of expectedNotContains) {
        expect(result).not.toContain(notExpected);
      }
    });
  });

  describe("extractTweetId", () => {
    test.each([
      [
        "Twitter URLからIDが正しく抽出されること",
        "https://twitter.com/user/status/1234567890",
        "1234567890",
      ],
      [
        "X.com URLからIDが正しく抽出されること",
        "https://x.com/user/status/9876543210",
        "9876543210",
      ],
      [
        "statusが含まれないURLではundefinedが返されること",
        "https://twitter.com/user",
        undefined,
      ],
      ["無効なURLではundefinedが返されること", "invalid-url", undefined],
    ])("(%s) %s -> %s", (_, url, expected) => {
      const result = extractTweetId(url);
      const matcher = expect(result);
      if (expected === undefined) {
        matcher.toBeUndefined();
      } else {
        matcher.toBe(expected);
      }
    });
  });

  describe("removeMentions", () => {
    test.each([
      [
        "メンション文字列が除去されること",
        "<@U1234567> hello world",
        "hello world",
      ],
      [
        "複数のメンションが除去されること",
        "<@U1234567> <@W8901234> hello world",
        "hello world",
      ],
      [
        "メンションがない場合はそのまま返されること",
        "hello world",
        "hello world",
      ],
      [
        "前後の空白が適切にトリムされること",
        "  <@U1234567>  hello world  ",
        "hello world",
      ],
    ])("%s", (_, input, expected) => {
      const result = removeMentions(input);
      expect(result).toBe(expected);
    });
  });
});
