import { Hono } from "hono";
import { createFactChecker } from "./lib/fact_checker";
import { createSlackProvider } from "./lib/slack";
import { extractTweetId } from "./lib/slack/utils";
import { createTwitterProvider } from "./lib/twitter";
import { buildSearchQuery } from "./lib/twitter_query/query_build";
import { verifyApiKey } from "./middlewares/verify-api-key";
import { verifyCron } from "./middlewares/verify-cron";

/* ------------------------------------------------------------------ */
/*  Hono ルーティング定義                                             */
/* ------------------------------------------------------------------ */
const app = new Hono();

const factChcker = createFactChecker();
const slackProvider = createSlackProvider();
const twitterProvider = createTwitterProvider();

app.get("/", (c) => c.text("Hello Hono!"));

/* ------------------------------------------------------------------ */
/*  共通: ツイート本文のファクトチェック＆通知処理                    */
/* ------------------------------------------------------------------ */
async function checkAndNotify(tweetText: string, tweetUrl: string) {
  const check = await factChcker.factCheck(tweetText);

  const label = check.ok ? "✅ OK" : "❌ NG";
  console.log("────────────────────────────────");
  console.log(label);
  console.log("> ", tweetText.replace(/\n/g, " "));
  console.log(check.answer);
  console.log("────────────────────────────────\n");

  if (!check.ok) {
    // NG のときだけ即 Slack 通知
    await slackProvider.notify({
      answer: check.answer,
      tweet: tweetText,
      tweetUrl: tweetUrl,
    });
    return { notified: true, check };
  }

  // OK の場合はここでは何もしない
  return { notified: false, check };
}

// Slack通知テスト用エンドポイント
// FYI localの動作確認用で一旦設置

app.get("/test/slack", verifyCron, async (c) => {
  try {
    const testTweet = "チームみらいはエンジニアチームを作りません｡";
    const testTweetUrl = "https://x.com/idobata_ai/status/1926171130294939673";

    const { notified, check } = await checkAndNotify(testTweet, testTweetUrl);

    // NG が無かったらここで OK 通知を 1 回だけ送る
    if (!notified) {
      await slackProvider.sendMessage({
        text: "✅ ファクトチェックが必要なツイートはありませんでした",
      });
    }

    return c.json({
      ok: true,
      message: notified
        ? `Slack通知（${check.ok ? "OK" : "NG"}）を送信しました`
        : "ファクトチェックが必要なツイートはありませんでした",
    });
  } catch (error) {
    console.error("テスト通知エラー:", error);
    return c.json({ ok: false, error: String(error) }, 500);
  }
});

// Twitter Provider テスト用エンドポイント
// FYI localの動作確認用で一旦設置
app.get("/test/twitter", async (c) => {
  const query = c.req.query("q") || "";
  const maxResults = Number(c.req.query("max_results")) || 10;

  try {
    const result = await twitterProvider.searchTweets({
      query,
      max_results: maxResults,
    });

    return c.json({
      provider: process.env.ENV || "local",
      query,
      max_results: maxResults,
      result,
    });
  } catch (error) {
    return c.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        provider: process.env.ENV || "local",
      },
      500,
    );
  }
});

/* ------------------------------------------------------------ */
/* 1. cron 用エンドポイント (Vercel / Cloudflare Cron でも OK)  */
/* ------------------------------------------------------------ */
app.get("/cron/fetch", verifyCron, async (c) => {
  const query = buildSearchQuery();

  // Twitter 検索
  const res = await twitterProvider.searchTweets({ query, max_results: 30 });

  // ───────────────────────────────────────────
  // 並列でファクトチェック & NG 通知を実行
  // ───────────────────────────────────────────
  const results = await Promise.all(
    (res.tweets ?? []).map((t) => {
      const tweetUrl = `https://x.com/i/web/status/${t.id}`;
      return checkAndNotify(t.text, tweetUrl);
    }),
  );
  const hasNg = results.some((r) => r.notified);

  // NG が 1 件も無かったら OK 通知を 1 回だけ送信
  if (!hasNg) {
    await slackProvider.sendMessage({
      text: "✅ ファクトチェックが必要なツイートはありませんでした",
    });
  }

  return c.json({ ok: true, hasNg });
});

/* ---------------- Slack Events 受信 ---------------- */
app.post("/slack/events", async (c) => {
  try {
    const body = await c.req.json();

    // URL Verification
    if (body.type === "url_verification") {
      return c.json({ challenge: body.challenge });
    }

    // Provider へは body と ack を渡す
    await slackProvider.processEvent({
      body,
      ack: async () => {}, // 即時 ack
    });

    // HTTP レスポンスは単に 200 を返す
    return c.json({});
  } catch (error) {
    console.error("Error handling Slack event:", error);
    return c.json({ error: "Failed to process Slack event" }, 500);
  }
});

app.post("/slack/actions", async (c) => {
  // ① URL-encoded フォームを取得
  const form = await c.req.formData();
  const raw = form.get("payload");

  // payload が無ければ 400
  if (typeof raw !== "string") {
    return c.json({ error: "payload missing" }, 400);
  }

  // ② JSON へ変換
  const payload = JSON.parse(raw);

  // ③ Provider へ委譲 — ack はレスポンスを返さず Promise<void>
  await slackProvider.processEvent({
    body: payload,
    ack: async () => {}, // 型：AckFn => Promise<void>
  });

  // ④ 最後に Hono として 200 OK を返す
  return c.json({});
});

/* ------------------------------------------------------------ */
/* API エンドポイント: TwitterのURL指定によるファクトチェック    */
/* ------------------------------------------------------------ */
app.post("/api/fact-check-url", verifyApiKey, async (c) => {
  try {
    const body = await c.req.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return c.json({ error: "URL is required" }, 400);
    }

    const tweetId = extractTweetId(url);
    if (!tweetId) {
      return c.json({ error: "Invalid Twitter URL format" }, 400);
    }

    const tweet = await twitterProvider.getTweetById({ tweetId });
    if (!tweet) {
      return c.json({ error: "Tweet not found or not accessible" }, 404);
    }

    const factCheckResult = await checkAndNotify(tweet.text, url);

    return c.json({
      success: true,
      tweet: {
        id: tweet.id,
        text: tweet.text,
        author_id: tweet.author_id,
        created_at: tweet.created_at,
      },
      fact_check_result: factCheckResult,
      checked_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in fact-check-url endpoint:", error);
    return c.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      },
      500,
    );
  }
});

/* 型互換のために一応 export も残しておく */

export default {
  fetch: app.fetch,
  port: Number(process.env.PORT) || 8080,
  hostname: "0.0.0.0",
  idleTimeout: 120,
};
