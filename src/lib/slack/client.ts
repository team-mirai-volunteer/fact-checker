import { App } from "@slack/bolt";
import { WebClient } from "@slack/web-api";
import { createFactChecker } from "../fact_checker";

const factChecker = createFactChecker();

// 遅延初期化: 初回アクセス時にSlackクライアントを作成
let _slackClient: WebClient | null = null;
let _slackApp: App | null = null;

export const slack = {
  get chat() {
    if (!_slackClient) {
      console.log("Initializing Slack client...");
      const token = process.env.SLACK_BOT_TOKEN;
      if (!token) throw new Error("SLACK_BOT_TOKEN is not set");
      _slackClient = new WebClient(token);
    }
    return _slackClient.chat;
  }
};

function initializeSlackApp() {
  if (_slackApp) return _slackApp;
  
  console.log("Initializing Slack app...");
  const token = process.env.SLACK_BOT_TOKEN;
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!token) throw new Error("SLACK_BOT_TOKEN is not set");
  if (!signingSecret) throw new Error("SLACK_SIGNING_SECRET is not set");
  
  _slackApp = new App({ token, signingSecret });
  
  // event handlerを設定
  _slackApp.event("app_mention", async ({ event, client }) => {
    const rawText = event.text?.replace(/<@[^>]+>\s*/, "").trim() ?? "";
    if (!rawText) return;

    const check = await factChecker.factCheck(rawText);
    const label = check.ok ? "✅ OK" : "❌ NG";

    await client.chat.postMessage({
      channel: event.channel,
      thread_ts: event.thread_ts ?? event.ts,
      text: `${label} ${check.answer}`,
    });
  });
  
  return _slackApp;
}

export const slackApp = {
  get processEvent() {
    return initializeSlackApp().processEvent.bind(initializeSlackApp());
  },
  action: (actionId: string, handler: any) => {
    initializeSlackApp().action(actionId, handler);
  }
};

