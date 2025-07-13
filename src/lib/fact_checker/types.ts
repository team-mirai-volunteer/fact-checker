export interface CheckResult {
  ok: boolean; // 事実と概ね一致?
  answer: string; // GPT が生成した全文 (OK / NG + 詳細 & 出典)
  citations: string[]; // 出典だけを配列で保持
}

export type FactChcker = {
  provider: "openai" | "dify" | "local"; // 使用するプロバイダー
  factCheck: (content: string) => Promise<CheckResult>;
};
