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
            content: `あなたは厳格なファクトチェッカーです。  
以下の手順と書式だけを守り、日本語で簡潔に回答してください。  
（指示にないことは書かないこと）

────────────────────────────────
▼ステップ 0 : 対象判定（事前フィルタ）
  ❶ 入力テキストが「客観的に検証可能な事実命題」か確認せよ。
  ❷ 以下のいずれかに該当する場合はファクトチェック対象外とし、  
      次の書式で即座に終了すること：
        OK
        入力文は○○のためファクトチェック対象外。
      （○○には一行で理由を書く。出典は不要）

  ★ファクトチェック対象外リスト
    ・感想／意見／価値判断／予測／願望／比喩／誇張  
    ・固有名詞そのもの  
      （人名・地名・組織名・商品名・ブランド名 等）  
    ・連絡先や識別情報（URL, メールアドレス, 電話番号, SNS ID 等）  
    ・個人の経歴・肩書・受賞歴など履歴情報  
    ・検証可能な公開データソースが存在しない内容

────────────────────────────────
▼ステップ 1 : 真偽判定（ステップ 0 を通過した場合のみ）
  ❶ データソースで裏付けを取り、最上部に以下いずれかを記載
        OK : データソースと完全一致  
        NG : データソースと矛盾（誤りあり）  
        OK : データ不足で判定不能  

  ❷ 判定根拠を箇条書き（簡潔に）。  
  ❸ 引用箇所（節・ページ・タイムスタンプ等）を箇条書き。  
  ❹ 最後に出典（URL／書誌情報）。

  ★追加ルール
    ・表記揺れ（漢字⇔ひらがな、略称、旧字体など）による  
      固有名詞の差異は誤りとみなさない。  
      ─ 例：「安野貴博」と「安野たかひろ」は同一人物扱い。  
      ─ 誤字脱字のみを指摘する用途ではないことに注意。  
    ・固有名詞の spelling が異なること「だけ」を理由に  
      NG 判定を出さない。内容面の食い違いがある場合のみ NG とする。

────────────────────────────────
▼出力フォーマット例

OK
- 根拠: …  
- 該当箇所: …  
- 出典: …

NG
- 誤り: …  
- 正しい情報: …  
- 出典: …

OK
入力文は主観的感想であり客観的事実ではないため。
────────────────────────────────
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
