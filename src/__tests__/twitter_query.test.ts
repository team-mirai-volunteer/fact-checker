import { describe, expect, test } from "vitest";
import { searchFilters, searchKeywords } from "../lib/twitter_query/config";
import { buildSearchQuery } from "../lib/twitter_query/query_build";

describe("buildSearchQuery", () => {
  test("キーワードが1つの場合、ORが含まれないクエリが構築される", () => {
    const singleKeyword = ["単一キーワード"];
    const filters = ["-is:retweet"];

    const query = buildSearchQuery(singleKeyword, filters);

    // ORが含まれていないことを確認
    expect(query).not.toContain("OR");

    // 期待される結果
    const expectedQuery = `("単一キーワード") -is:retweet`;
    expect(query).toBe(expectedQuery);
  });

  test("キーワードが複数の場合、ORで結合されたクエリが構築される", () => {
    const multipleKeywords = ["キーワード1", "キーワード2"];
    const filters = ["-is:retweet"];

    const query = buildSearchQuery(multipleKeywords, filters);

    // ORが含まれていることを確認
    expect(query).toContain(" OR ");

    // 期待される結果
    const expectedQuery = `("キーワード1" OR "キーワード2") -is:retweet`;
    expect(query).toBe(expectedQuery);
  });

  test("フィルタが複数指定された場合、スペース区切りで結合される", () => {
    const singleKeyword = ["単一キーワード"];
    const filters = ["-is:retweet", "-is:reply"];

    const query = buildSearchQuery(singleKeyword, filters);

    // 期待される結果
    const expectedQuery = `("単一キーワード") -is:retweet -is:reply`;
    expect(query).toBe(expectedQuery);
  });

  test("設定ファイルの値を使って正しくクエリが構築される", () => {
    const query = buildSearchQuery();

    // 期待される形式の検証
    // 先頭と末尾の括弧とスペースを確認
    expect(query.charAt(0)).toBe("(");
    expect(query.indexOf(") ")).toBeGreaterThan(0);

    // すべてのキーワードが引用符で囲まれていることを確認
    for (const keyword of searchKeywords) {
      expect(query).toContain(`"${keyword}"`);
    }

    // すべてのフィルターが含まれていることを確認
    for (const filter of searchFilters) {
      expect(query).toContain(filter);
    }

    // キーワードの数に基づいてORの有無を確認
    if (searchKeywords.length > 1) {
      expect(query).toContain(" OR ");
    } else {
      expect(query).not.toContain(" OR ");
    }

    // 手動で構築した場合と同じ結果になることを確認
    const manualQuery = `(${searchKeywords.map((k) => `"${k}"`).join(" OR ")}) ${searchFilters.join(" ")}`;
    expect(query).toBe(manualQuery);
  });
});
