import { describe, expect, mock, test } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  parseArgs,
  pushToGithub,
  sanitizeFilename,
  validateRepositoryName,
} from "../get-note-articles.js";

// simple-gitのモック
const addRemoteMock = mock(() => Promise.resolve());
const simpleGitMock = mock(() => ({
  init: mock(() => Promise.resolve()),
  addRemote: addRemoteMock,
  listRemote: mock(() => Promise.resolve("refs/heads/main")),
  fetch: mock(() => Promise.resolve()),
  checkout: mock(() => Promise.resolve()),
  add: mock(() => Promise.resolve()),
  status: mock(() =>
    Promise.resolve({ modified: [], not_added: [], created: [] }),
  ),
  commit: mock(() => Promise.resolve()),
  push: mock(() => Promise.resolve()),
}));
mock.module("simple-git", () => ({ simpleGit: simpleGitMock }));

// Octokitのモック
const getMock = mock(() =>
  Promise.resolve({ data: { default_branch: "main" } }),
);
const OctokitMock = mock(() => ({
  repos: {
    get: getMock,
  },
}));
mock.module("@octokit/rest", () => ({ Octokit: OctokitMock }));

describe("CLI引数パース処理のセキュリティテスト", () => {
  test("パストラバーサル攻撃のパターン", () => {
    const maliciousPatterns = [
      ["--username", "../../../etc/passwd"],
      ["--output-dir", "..\\..\\..\\Windows\\System32"],
      ["--username", "/etc/passwd"],
      ["--output-dir", "C:\\Windows\\System32"],
    ];

    for (const pattern of maliciousPatterns) {
      expect(() => parseArgs(pattern)).toThrow("Invalid input");
    }
  });

  test("コマンドインジェクションのパターン", () => {
    const injectionPatterns = [
      ["--username", "user; rm -rf /"],
      ["--output-dir", "dir; cat /etc/passwd"],
      ["--username", "user && rm -rf /"],
      ["--output-dir", "dir | cat /etc/passwd"],
    ];

    for (const pattern of injectionPatterns) {
      expect(() => parseArgs(pattern)).toThrow("Invalid input");
    }
  });

  test("特殊文字の処理", () => {
    const specialChars = [
      ["--username", "user\nname"],
      ["--output-dir", "dir\tname"],
      ["--username", "user\rname"],
      ["--output-dir", "dir\0name"],
    ];

    for (const pattern of specialChars) {
      expect(() => parseArgs(pattern)).toThrow("Invalid input");
    }
  });
});

describe("リポジトリ名検証のセキュリティテスト", () => {
  test("不正なリポジトリ名パターン", () => {
    const invalidPatterns = [
      "owner/repo/extra",
      "owner/repo.git/extra",
      "owner/repo.git/../../../etc",
      "owner/repo+plus",
    ];

    for (const pattern of invalidPatterns) {
      expect(() => validateRepositoryName(pattern)).toThrow("Invalid input");
    }
  });

  test("長さ制限のテスト", () => {
    const longOwner = "a".repeat(40);
    const longRepo = "b".repeat(101);

    expect(() => validateRepositoryName(`${longOwner}/repo`)).toThrow(
      "Invalid input",
    );
    expect(() => validateRepositoryName(`owner/${longRepo}`)).toThrow(
      "Invalid input",
    );
  });

  test("許可されるリポジトリ名", () => {
    const validPatterns = [
      "owner/repo-with-dash",
      "owner/repo_with_underscore",
      "owner/repo.with.dot",
      "owner/repo123",
    ];

    for (const pattern of validPatterns) {
      expect(() => validateRepositoryName(pattern)).not.toThrow();
    }
  });
});

describe("ファイル名サニタイズのセキュリティテスト", () => {
  test("危険なファイル名パターン", () => {
    const dangerousPatterns = [
      "../../../etc/passwd",
      "C:\\Windows\\System32\\config",
      "/etc/shadow",
      "~/.ssh/id_rsa",
    ];

    for (const pattern of dangerousPatterns) {
      const sanitized = sanitizeFilename(pattern);
      expect(sanitized).not.toContain("..");
      expect(sanitized).not.toContain("\\");
      expect(sanitized).not.toContain("/");
    }
  });

  test("特殊文字の処理", () => {
    const specialChars = [
      "file\nname",
      "file\tname",
      "file\rname",
      "file\0name",
      "file name",
      "file:name",
      "file*name",
      "file?name",
    ];

    for (const pattern of specialChars) {
      const sanitized = sanitizeFilename(pattern);
      // ファイル名部分と拡張子部分を分けて検証
      const lastDotIndex = sanitized.lastIndexOf(".");
      const name =
        lastDotIndex === -1 ? sanitized : sanitized.slice(0, lastDotIndex);
      const ext = lastDotIndex === -1 ? "" : sanitized.slice(lastDotIndex);

      // ファイル名部分の検証
      expect(name).toMatch(/^[a-zA-Z0-9-_]+$/);
      // 拡張子部分の検証
      if (ext) {
        expect(ext).toMatch(/^\.[a-zA-Z0-9]+$/);
      }
    }
  });

  test("長さ制限のテスト", () => {
    const longName = "a".repeat(256);
    const sanitized = sanitizeFilename(longName);
    expect(sanitized.length).toBeLessThanOrEqual(255);
  });

  test("拡張子を保持する", () => {
    const testCases = [
      { input: "test.md", expected: "test.md" },
      { input: "test.txt.md", expected: "test_txt.md" },
      { input: "test with spaces.md", expected: "test_with_spaces.md" },
      { input: "test.with.dots.md", expected: "test_with_dots.md" },
      { input: "test!@#$%.md", expected: "test_.md" },
    ];

    for (const { input, expected } of testCases) {
      expect(sanitizeFilename(input)).toBe(expected);
    }
  });

  test("実際のユースケース", () => {
    const testCases = [
      { input: "na5a45f10cc65.md", expected: "na5a45f10cc65.md" },
      { input: "n8496ce10aac6.md", expected: "n8496ce10aac6.md" },
    ];

    for (const { input, expected } of testCases) {
      expect(sanitizeFilename(input)).toBe(expected);
    }
  });

  test("複数のドットを含むファイル名の処理", () => {
    const testCases = [
      { input: "test.txt.md", expected: "test_txt.md" },
      { input: "test.with.dots.md", expected: "test_with_dots.md" },
      { input: "test..double..dots.md", expected: "test_double_dots.md" },
      { input: "test...triple...dots.md", expected: "test_triple_dots.md" },
    ];

    for (const { input, expected } of testCases) {
      expect(sanitizeFilename(input)).toBe(expected);
    }
  });
});

describe("GitHubリポジトリへのアップロードのセキュリティテスト", () => {
  describe("pushToGithub", () => {
    test("リモートURLにトークンが含まれないことを確認", async () => {
      process.env.NOTE_REPO_TOKEN = "test-token";
      // テスト用の一時ディレクトリ作成
      const tempDir = path.join(process.cwd(), "temp_repo");
      fs.mkdirSync(tempDir, { recursive: true });
      fs.writeFileSync(path.join(tempDir, "test.md"), "test content");

      try {
        await pushToGithub(tempDir, "owner/repo");
        // addRemoteが正しいURLで呼ばれたことを確認
        expect(addRemoteMock).toHaveBeenCalledWith(
          "origin",
          "https://github.com/owner/repo.git",
        );
        // addRemoteが正しく呼ばれたことを確認
        expect(addRemoteMock).toHaveBeenCalledTimes(1);
      } finally {
        // 一時ディレクトリの削除
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test("環境変数が設定されていない場合のエラー処理", async () => {
      // 環境変数をクリア
      const originalToken = process.env.NOTE_REPO_TOKEN;
      process.env.NOTE_REPO_TOKEN = undefined;

      // テスト用の一時ディレクトリ作成
      const tempDir = "/tmp/test-repo";
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      try {
        // エラーが発生することを確認
        await expect(pushToGithub(tempDir, "owner/repo")).rejects.toThrow(
          "NOTE_REPO_TOKEN environment variable is not set",
        );
      } finally {
        // 一時ディレクトリの削除
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
        // 環境変数を元に戻す
        process.env.NOTE_REPO_TOKEN = originalToken;
      }
    });
  });
});
