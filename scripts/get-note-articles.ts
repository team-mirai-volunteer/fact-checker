import * as fs from "node:fs";
import * as path from "node:path";
import { Octokit } from "@octokit/rest";
import { config } from "dotenv";
import { simpleGit } from "simple-git";
import TurndownService from "turndown";
// Node.js環境でfetchを使用するためのポリフィル
import { fetch } from "undici";

// 環境変数の読み込み
config();

// HTML to Markdown converter
const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

// 型定義
interface NoteArticle {
  key: string;
  title: string;
  body: string;
}

interface NoteListResponse {
  data: {
    contents: Array<{
      key: string;
    }>;
    isLastPage: boolean;
  };
}

interface NoteArticleResponse {
  data: {
    name: string;
    body: string;
    id: number;
    user_id: number;
    status: string;
    type: string;
    key: string;
    slug: string;
  };
}

// CLI引数の型定義
interface CliArgs {
  username: string;
  outputDir: string;
  githubRepo?: string;
}

// デフォルト値の設定
const DEFAULT_ARGS: CliArgs = {
  username: "annotakahiro24",
  outputDir: "media/note",
};

// ログ出力用の関数
function log(
  message: string,
  type: "info" | "error" | "success" = "info",
): void {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: "ℹ️",
    error: "❌",
    success: "✅",
  }[type];
  console.log(`${prefix} [${timestamp}] ${message}`);
}

// エラーハンドリング用の関数
class NoteApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "NoteApiError";
  }
}

// セキュリティチェック用の関数
function validateInput(input: string): void {
  // コマンドインジェクションのチェック
  if (input.includes(";") || input.includes("&&") || input.includes("|")) {
    throw new Error("Invalid input");
  }
  // パストラバーサル攻撃のチェック
  if (input.includes("..") || input.includes("\\") || input.includes("/")) {
    throw new Error("Invalid input");
  }
  // 特殊文字のチェック
  if (/[\n\r\t\0`$()[\]{}]/.test(input)) {
    throw new Error("Invalid input");
  }
}

// output-dir用のバリデーション関数
function validateOutputDir(input: string): void {
  // コマンドインジェクションのチェック
  if (input.includes(";") || input.includes("&&") || input.includes("|")) {
    throw new Error("Invalid input");
  }
  // パストラバーサル攻撃のチェック（/は許可）
  if (input.includes("..") || input.includes("\\")) {
    throw new Error("Invalid input");
  }
  // 特殊文字のチェック
  if (/[\n\r\t\0`$()[\]{}]/.test(input)) {
    throw new Error("Invalid input");
  }
}

// メイン処理
async function main() {
  try {
    // CLI引数の処理
    const args = parseArgs();
    log(`Starting process for user: ${args.username}`);

    // 出力ディレクトリの作成
    if (!fs.existsSync(args.outputDir)) {
      fs.mkdirSync(args.outputDir, { recursive: true });
      log(`Created output directory: ${args.outputDir}`);
    }

    // 記事一覧の取得
    log("Fetching article list...");
    const articles = await fetchAllArticles(args.username);
    log(`Found ${articles.length} articles`);

    // 各記事の取得と保存
    for (const [index, article] of articles.entries()) {
      log(
        `Processing article ${index + 1}/${articles.length} (key: ${article.key})`,
      );
      await processArticle(article.key, args.outputDir);
    }

    // GitHubへのプッシュ
    if (args.githubRepo) {
      log("Pushing changes to GitHub...");
      await pushToGithub(args.outputDir, args.githubRepo);
    }

    log("Process completed successfully", "success");
  } catch (error) {
    if (error instanceof NoteApiError) {
      log(
        `API Error: ${error.message}${error.status ? ` (Status: ${error.status})` : ""}`,
        "error",
      );
    } else {
      log(
        `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
        "error",
      );
    }
    process.exit(1);
  }
}

// CLI引数のパース
export function parseArgs(args: string[] = process.argv.slice(2)): CliArgs {
  const parsedArgs: Partial<CliArgs> = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace("--", "");
    const value = args[i + 1];
    if (!key || value === undefined) continue;
    // 入力値の検証
    switch (key) {
      case "output-dir":
        validateOutputDir(value);
        parsedArgs.outputDir = value;
        break;
      case "github-repo":
        validateRepositoryName(value);
        parsedArgs.githubRepo = value;
        break;
      default:
        validateInput(value);
        switch (key) {
          case "username":
            parsedArgs.username = value;
            break;
        }
    }
  }
  return { ...DEFAULT_ARGS, ...parsedArgs };
}

// 記事一覧の取得
async function fetchAllArticles(
  username: string,
): Promise<Array<{ key: string }>> {
  const articles: Array<{ key: string }> = [];
  let page = 1;
  let isLastPage = false;

  while (!isLastPage) {
    try {
      const response = await fetch(
        `https://note.com/api/v2/creators/${username}/contents?kind=note&page=${page}`,
      );

      if (!response.ok) {
        throw new NoteApiError("Failed to fetch article list", response.status);
      }

      const data = (await response.json()) as NoteListResponse;

      articles.push(...data.data.contents);
      isLastPage = data.data.isLastPage;
      page++;

      log(`Fetched page ${page - 1} of articles`);
    } catch (error) {
      if (error instanceof NoteApiError) throw error;
      throw new NoteApiError(
        `Failed to fetch article list: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return articles;
}

// 個別記事の処理
async function processArticle(key: string, outputDir: string): Promise<void> {
  try {
    const response = await fetch(`https://note.com/api/v3/notes/${key}`);

    if (!response.ok) {
      throw new NoteApiError(`Failed to fetch article ${key}`, response.status);
    }

    const responseData = (await response.json()) as NoteArticleResponse;

    // Convert HTML content to markdown
    const markdownContent = turndownService.turndown(responseData.data.body);
    const markdown = `# ${responseData.data.name}\n\n${markdownContent}`;
    const filePath = path.join(outputDir, sanitizeFilename(`${key}.md`));

    fs.writeFileSync(filePath, markdown);
    log(`Saved article: ${key}.md`);
  } catch (error) {
    if (error instanceof NoteApiError) throw error;
    throw new NoteApiError(
      `Failed to process article ${key}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// リポジトリ名の検証関数
export function validateRepositoryName(repo: string): {
  owner: string;
  repoName: string;
} {
  // GitHubの仕様に基づく正規表現
  // オーナー名: アルファベット、数字、ハイフンのみ許可（先頭はアルファベットまたは数字）
  // リポジトリ名: アルファベット、数字、ハイフン、アンダースコア、ドットのみ許可（先頭はアルファベットまたは数字）
  const repoRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\/[a-zA-Z0-9][a-zA-Z0-9-_.]*$/;
  if (!repoRegex.test(repo)) {
    throw new Error("Invalid input");
  }
  // パストラバーサル対策
  if (repo.includes("..")) {
    throw new Error("Invalid input");
  }
  const [owner, repoName] = repo.split("/");
  if (!owner || !repoName) {
    throw new Error("Invalid input");
  }
  // 長さの制限
  if (owner.length > 39) {
    throw new Error("Invalid input");
  }
  if (repoName.length > 100) {
    throw new Error("Invalid input");
  }
  // URLエンコーディングを適用
  return {
    owner: encodeURIComponent(owner),
    repoName: encodeURIComponent(repoName),
  };
}

// GitHubへのプッシュ
export async function pushToGithub(
  outputDir: string,
  repo: string,
): Promise<void> {
  try {
    // リポジトリ名の検証
    const { owner, repoName } = validateRepositoryName(repo);

    if (!process.env.NOTE_REPO_TOKEN) {
      throw new Error("NOTE_REPO_TOKEN environment variable is not set");
    }

    const octokit = new Octokit({ auth: process.env.NOTE_REPO_TOKEN });

    // 一時ディレクトリの作成
    const tempDir = path.join(process.cwd(), "temp_repo");
    if (fs.existsSync(tempDir)) {
      // 既存の一時ディレクトリを削除
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });

    // 一時ディレクトリにGitリポジトリを初期化
    const git = simpleGit(tempDir);
    log("Initializing temporary Git repository...");
    await git.init();

    // リモートの設定（安全なURL構築）
    log("Adding GitHub remote...");
    const remoteUrl = `https://github.com/${owner}/${repoName}.git`;
    await git.addRemote("origin", remoteUrl);

    // リモートブランチの確認（存在すれば取得）
    let defaultBranch = "main";
    try {
      log("Checking remote repository...");
      const remoteInfo = await git.listRemote(["--heads", "origin"]);

      if (!remoteInfo) {
        // リモートリポジトリが空の場合
        log("Creating new main branch for empty repository...");
        await git.checkout(["-b", defaultBranch]);
      } else {
        // リモートブランチが存在する場合
        log("Fetching from remote...");
        await git.fetch("origin");

        // デフォルトブランチの確認
        defaultBranch = await octokit.repos
          .get({ owner, repo: repoName })
          .then((res) => res.data.default_branch)
          .catch(() => "main");

        log(`Checking out ${defaultBranch} branch...`);
        try {
          await git.checkout(["-b", defaultBranch, `origin/${defaultBranch}`]);
        } catch {
          // ローカルブランチが既に存在する場合
          await git.checkout(defaultBranch);
        }
      }
    } catch (error) {
      throw new Error(
        `Failed to access remote repository: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // markdownファイルだけをコピー
    log("Copying markdown files...");
    const files = fs.readdirSync(outputDir);
    let hasChanges = false;

    for (const file of files) {
      if (file.endsWith(".md")) {
        const sourcePath = path.join(outputDir, file);
        const destPath = path.join(tempDir, file);
        fs.copyFileSync(sourcePath, destPath);
        hasChanges = true;
      }
    }

    if (!hasChanges) {
      log("No markdown files to push");
      // 一時ディレクトリを削除
      fs.rmSync(tempDir, { recursive: true, force: true });
      return;
    }

    // 変更のコミットとプッシュ
    await git.add(".");
    const status = await git.status();

    if (
      !status.modified.length &&
      !status.not_added.length &&
      !status.created.length
    ) {
      log("No changes to push");
      // 一時ディレクトリを削除
      fs.rmSync(tempDir, { recursive: true, force: true });
      return;
    }

    const timestamp = new Date().toISOString();
    await git.commit(`Update articles: ${timestamp}`);

    try {
      log("Pushing to GitHub repository...");
      await git.push("origin", defaultBranch, ["--set-upstream", "--force"]);
      log("Successfully pushed changes to GitHub", "success");
    } catch (error) {
      throw new Error(
        `Push failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      // 一時ディレクトリを削除
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  } catch (error) {
    throw new Error(
      `Failed to push to GitHub: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// 新しい関数を追加
export function sanitizeFilename(filename: string): string {
  // ファイル名と拡張子を分離
  const lastDotIndex = filename.lastIndexOf(".");
  const name = lastDotIndex === -1 ? filename : filename.slice(0, lastDotIndex);
  const ext = lastDotIndex === -1 ? "" : filename.slice(lastDotIndex);

  // ファイル名部分のみをサニタイズ（特殊文字を1つのアンダースコアに変換）
  const sanitizedName = name.replace(/[^a-zA-Z0-9-_]+/g, "_");

  // 拡張子部分はそのまま保持（ドットとアルファベット、数字のみ許可）
  const sanitizedExt = ext.replace(/[^a-zA-Z0-9.]/g, "");

  // 長さ制限（拡張子を含めて255文字）
  const maxNameLength = 255 - sanitizedExt.length;
  return sanitizedName.slice(0, maxNameLength) + sanitizedExt;
}

// スクリプトの実行
main();
