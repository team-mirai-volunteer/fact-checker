const WORD_JOINER = "\u2060"; // U+2060（ゼロ幅ノンブレーク）で自動リンクを阻止

/** 文字列中の README.md → README⁠.md へ変換して URL 解析を回避する */
export function preventAutolink(text: string): string {
  // 1) README.md → README⁠.md
  let out = text.replace(/README\.md/gi, `README${WORD_JOINER}.md`);

  // 2) http / https URL のドメイン中 '.' に ZWJ を挿入してリンクを無効化
  //    例: https://example.com → https://example⁠.com
  out = out.replace(/\bhttps?:\/\/([^\/\s]+)/gi, (match, domain) => {
    const modifiedDomain = domain.replace(/\./g, `${WORD_JOINER}.`);
    return match.replace(domain, modifiedDomain);
  });

  return out;
}

/** https://twitter.com/.../status/123 → 123 を抽出する */
export function extractTweetId(url: string): string | undefined {
  const m = url.match(/status\/(\d+)/);
  return m ? m[1] : undefined;
}

/** メンション文字列を除去（<@U123456> hoge → hoge） */
export function removeMentions(text: string): string {
  return text.replace(/<@[^>]+>/g, "").trim();
}
