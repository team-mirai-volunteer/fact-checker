import type { KnownBlock, SectionBlock } from "@slack/types";
import type { ButtonValue, SlackNotificationParams } from "./types";

/**
 * Slack用のリッチメッセージを構築する
 */
export function buildNotificationMessage({
  answer,
  tweet,
  tweetUrl,
}: SlackNotificationParams): {
  text: string;
  blocks: KnownBlock[];
} {
  const tweetSection: SectionBlock = {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*ツイート:*\n> ${tweet.slice(0, 200)}${tweet.length > 200 ? "..." : ""}`,
    },
    accessory: {
      type: "button",
      text: { type: "plain_text", text: "🔗 ツイートを表示" },
      url: tweetUrl,
      action_id: "view_tweet",
    },
  };

  const blocks: KnownBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "🔍 要確認",
      },
    },
    tweetSection,
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${answer.split("\n").slice(1, 3).join("\n")}`,
      },
    },
  ];

  // ボタンデータの準備
  const buttonData: ButtonValue = {
    originalTweet: tweet.slice(0, 500),
    originalTweetUrl: tweetUrl,
    factCheckResult: `${answer.split("\n").slice(1, 3).join("\n")}`,
  };

  blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        text: { type: "plain_text", text: "✅ 承認してXに投稿" },
        style: "primary",
        action_id: "approve_and_post",
        value: JSON.stringify(buttonData),
      },
    ],
  });

  return {
    text: "🔍 要確認",
    blocks,
  };
}
