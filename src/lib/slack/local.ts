import type { ReceiverEvent } from "@slack/bolt";
import { buildNotificationMessage } from "./message_builder";
import type {
  BaseSlackProvider,
  MentionParams,
  SlackMessageParams,
  SlackNotificationParams,
} from "./types";

export class LocalSlackProvider implements BaseSlackProvider {
  async notify(params: SlackNotificationParams): Promise<void> {
    console.log("🔔 [LocalSlack] Notification:");
    console.log("────────────────────────────────");
    console.log("Answer:", params.answer);
    console.log("Tweet:", params.tweet);
    console.log("URL:", params.tweetUrl);

    // リッチメッセージのブロック構造も出力
    const message = buildNotificationMessage(params);
    console.log("📋 [LocalSlack] Rich Message Blocks:");
    console.log(JSON.stringify(message.blocks, null, 2));
    console.log("────────────────────────────────\n");
  }

  async sendMessage(params: SlackMessageParams): Promise<void> {
    console.log("💬 [LocalSlack] Message:", params.text);
    if (params.blocks) {
      console.log(
        "📋 [LocalSlack] Blocks:",
        JSON.stringify(params.blocks, null, 2),
      );
    }
  }

  async processEvent(params: ReceiverEvent): Promise<void> {
    console.log("📨 [LocalSlack] Processing event:");
    console.log(JSON.stringify(params.body, null, 2));

    if (params.body.type === "url_verification") {
      console.log(
        "✅ [LocalSlack] URL verification challenge:",
        params.body.challenge,
      );
    }

    await params.ack();
  }

  async handleMention(params: MentionParams): Promise<void> {
    console.log("📢 [LocalSlack] Mention received:");
    console.log("Text:", params.text);
    console.log("Channel:", params.channel);
    console.log("User:", params.user);
    console.log("────────────────────────────────\n");
  }
}
