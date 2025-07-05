import OpenAI from "openai";
import type { CheckResult, FactChcker } from "./types";

export function createOpenAIFactChcker(): FactChcker {
  const vectorStoreId =
    process.env.VECTOR_STORE_ID ??
    (() => {
      throw new Error("VECTOR_STORE_ID is not set");
    })();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const openai = new OpenAI({ apiKey });

  return {
    provider: "openai",
    /**
     * ファクトチェック本体
     * @param content チェック対象文章
     */
    factCheck: async (content: string): Promise<CheckResult> => {
      const res = await openai.responses.create({
        model: "o3",
        tools: [{ type: "file_search", vector_store_ids: [vectorStoreId] }],
        include: ["file_search_call.results"],
        input: [
          {
            type: "message",
            role: "system",
            content: `あなたは政党｢チームみらい｣専属の厳格な「エビデンスチェッカー」です。

##################################################
# 📌 タスク
1. 入力文が
  ・客観的に検証可能な事実命題 であり
  ・チームみらいに批判的／否定的
  の両方を満たすか判定する。
2. 満たさなければ「対象外」として即終了。
3. 満たす場合のみ真偽判定を行い、所定フォーマットで回答する。

##################################################
# 🚫 対象外にする条件
- チームみらいへの応援・称賛・好意的意見
- 感想／意見／価値判断／予測／願望／比喩／誇張
- 固有名詞そのもの（人名・地名・組織名 等）
- 連絡先・識別情報（URL, メール, 電話番号, SNS ID）
- 個人の経歴・肩書・受賞歴など履歴情報
- 検証可能な公開データソースが存在しない内容

##################################################
# 🖊️ 出力フォーマット（**いずれか一つのみ**。余計な文字を絶対に付けない）
## A. 対象外の場合
OK
入力文は<理由>のためエビデンスチェック対象外。

## B. 真偽判定の場合
<OK | NG | UNKNOWN>
- 根拠: <箇条書き 1 行>
- 該当箇所: <節・ページ・タイムスタンプ等>
- 出典: <URL または書誌情報>
<※ NG の場合のみ以下を追加>
- 正しい情報: <簡潔に訂正>

##################################################
# 🔧 追加ルール
- 「UNKNOWN」はデータ不足で判定不能の場合に使用。
- 表記揺れ（漢字⇔ひらがな・略称等）だけの差異は誤りとしない。
- 日本語で簡潔に。Markdown・コードフェンス禁止。改行位置は崩さない。

##################################################
# 🏷️ 例 (Few-shot)
### 例 1: 対象外（応援コメント）
ユーザ: 「チームみらい最高！」
アシスタント:
OK
入力文はチームみらいへの応援で主観的意見のためエビデンスチェック対象外。

### 例 2: OK 判定（政策公約が事実）
ユーザ: 「チームみらいは2025年公約で最低賃金を時給1500円に引き上げると明記した」
アシスタント:
OK
- 政策根拠: 2025年公約集に最低賃金1500円の明記あり。
- 該当箇所: 公約集 p.12「経済・賃金政策」
- 出典: https://example.com/manifesto2025.pdf

### 例 3: NG 判定（誤った政策主張）
ユーザ: 「チームみらいは消費税を30%に増税すると宣言した」
アシスタント:
NG
- 政策根拠: 公式声明では消費税据え置きを明言。
- 該当箇所: 2025/03/15 記者会見動画 05:22
- 出典: https://example.com/press/20250315
- 正しい情報: チームみらいは消費税率据え置きを公約している。
`,
          },
          {
            role: "user",
            content: content,
          },
        ],
      });

      /* ───────── 出典を整形 ───────── */
      const citationBlocks: string[] = [];

      for (const item of res.output ?? []) {
        if (item.type === "file_search_call" && item.results) {
          for (const r of item.results) {
            citationBlocks.push(
              `- **${r.filename ?? r.file_id}**\n  > ${r.text?.trim()}`,
            );
          }
        }
      }

      /* ① まず本文だけをトリムして保持 */
      const body = res.output_text.trim();

      const ng = /^NG/i.test(body);
      const ok = !ng;

      /* ③ 表示用の answer は出典を加えて組み立て */
      const answer = citationBlocks.length
        ? `${body}

---

<details>
<summary>📚 出典</summary>

${citationBlocks.join("\n\n")}

</details>`
        : body;

      return { ok, answer, citations: citationBlocks };
    },
  };
}
