import { createFactChecker } from "../src/lib/fact_checker";

async function main() {
  const statement = process.argv.slice(2).join(" ").trim();

  if (!statement) {
    console.error(
      '❌ 文章を引数で渡してください。例:\n  bun run fact-check "地球は平らである"',
    );
    process.exit(1);
  }

  try {
    const factChecker = createFactChecker();
    const { ok, answer } = await factChecker.factCheck(statement);

    console.log("\n=== ファクトチェック回答 =================");
    console.log(answer);

    console.log("\n=== 判定 ================================");
    console.log(JSON.stringify({ ok }, null, 2));
  } catch (err) {
    console.error("💥 factCheck 実行中にエラー:", err);
    process.exit(1);
  }
}

main();
