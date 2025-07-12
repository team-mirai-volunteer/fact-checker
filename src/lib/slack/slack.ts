import {
  App,
  type BlockAction,
  type ButtonAction,
  type ReceiverEvent,
} from "@slack/bolt";
import { WebClient } from "@slack/web-api";
import { createFactChecker } from "../fact_checker";
import type { FactChcker } from "../fact_checker/types";
import { createActionHandlers } from "./actions";
import { buildNotificationMessage } from "./message_builder";
import type {
  BaseSlackProvider,
  SlackMessageParams,
  SlackNotificationParams,
} from "./types";
import { removeMentions } from "./utils";

export class SlackProvider implements BaseSlackProvider {
  private app: App;
  private client: WebClient;
  private factChecker: FactChcker;
  private channelId: string;

  constructor() {
    const botToken =
      process.env.SLACK_BOT_TOKEN ??
      (() => {
        throw new Error("SLACK_BOT_TOKEN is not set");
      })();

    const signingSecret =
      process.env.SLACK_SIGNING_SECRET ??
      (() => {
        throw new Error("SLACK_SIGNING_SECRET is not set");
      })();

    this.channelId =
      process.env.SLACK_CHANNEL_ID ??
      (() => {
        throw new Error("SLACK_CHANNEL_ID is not set");
      })();

    this.client = new WebClient(botToken);
    this.app = new App({
      token: botToken,
      signingSecret: signingSecret,
    });
    this.factChecker = createFactChecker();

    this.setupEventHandlers();
    this.setupActionHandlers();
  }

  private setupEventHandlers() {
    /**
     * App にメンションされたテキストをファクトチェックし、同じスレッドに返信する
     */
    this.app.event("app_mention", async ({ event, client }) => {
      // `<@U12345678> ここが実際の本文…` となっているのでメンション部分を除去
      const rawText = removeMentions(event.text);
      if (!rawText.trim()) return;

      // 処理が5s以内に完了しないとslack側がeventを再送するため、awaitしない
      this.factChecker.factCheck(rawText).then(async (check) => {
        const label = check.ok ? "✅ OK" : "❌ NG";
        // // スレッド (thread_ts) があればそこへ、無ければ新規メッセージ
        await client.chat.postMessage({
          channel: event.channel,
          thread_ts: event.thread_ts ?? event.ts,
          text: `${label} ${check.answer}`,
        });
      });
    });
  }

  private setupActionHandlers() {
    const handlers = createActionHandlers();

    this.app.action<BlockAction<ButtonAction>>(
      "approve_and_post",
      handlers.approve_and_post,
    );
  }

  async notify(params: SlackNotificationParams): Promise<void> {
    const message = buildNotificationMessage(params);
    await this.sendMessage(message);
  }

  async sendMessage(params: SlackMessageParams): Promise<void> {
    await this.client.chat.postMessage({
      channel: this.channelId,
      text: params.text,
      blocks: params.blocks,
    });
  }

  async processEvent(params: ReceiverEvent): Promise<void> {
    await this.app.processEvent({
      body: params.body,
      ack: params.ack,
    });
  }
}
