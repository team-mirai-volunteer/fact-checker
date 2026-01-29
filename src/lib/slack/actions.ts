import type { App, BlockAction, ButtonAction } from "@slack/bolt";
import { createTwitterProvider } from "../twitter";
import type { ButtonValue } from "./types";
import { extractTweetId, preventAutolink } from "./utils";

type ActionParam = Parameters<
  typeof App.prototype.action<BlockAction<ButtonAction>>
>[1];

export interface ActionHandlers {
  approve_and_post: ActionParam;
}

export function createActionHandlers(): ActionHandlers {
  const twitterProvider = createTwitterProvider();

  return {
    approve_and_post: async ({ ack, action, body, client, logger }) => {
      /* 1. 3 秒以内に ACK */
      await ack();

      /* 2. ボタン value を安全にパース */
      if (!action.value) {
        logger.error("action.value is undefined");
        return;
      }
      let payload: ButtonValue;
      try {
        payload = JSON.parse(action.value);
      } catch (e) {
        logger.error("action.value is not valid JSON", e);
        return;
      }
      console.log(payload);

      /* 3. ツイート文面を組み立て（冒頭行を簡潔に & README.md 対策） */
      const status = [
        "ファクトチェック結果：❌ NG",
        "",
        preventAutolink(payload.factCheckResult),
      ].join("\n");

      /* 4. 引用 RT でポスト（URL でなく quote_tweet_id を使う） */
      const quoteId = extractTweetId(payload.originalTweetUrl);
      try {
        await twitterProvider.postTweet({
          text: status,
          quote_tweet_id: quoteId,
        });
      } catch (e) {
        logger.error("post tweet failed", e);
      }

      /* 5. Slack メッセージ識別子を取得 */
      const channel = body.container?.channel_id;
      const ts = body.container?.message_ts;
      if (!channel || !ts) {
        logger.error("channel_id or message_ts not found in container");
        return;
      }

      const userId = body.user?.id;
      const tweetExcerpt = payload.originalTweet.slice(0, 200);
      const tweetEllipsis = payload.originalTweet.length > 200 ? "..." : "";

      /* 6. 元メッセージを「確認済み」に更新（ボタンを除去し、コンテキストは残す） */
      await client.chat.update({
        channel,
        ts,
        text: "✅ 確認済み",
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: "✅ 確認済み" },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*ツイート:*\n> ${tweetExcerpt}${tweetEllipsis}`,
            },
            accessory: {
              type: "button",
              text: { type: "plain_text", text: "🔗 ツイートを表示" },
              url: payload.originalTweetUrl,
              action_id: "view_tweet",
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: payload.factCheckResult,
            },
          },
        ],
      });

      /* 7. 同じスレッドに投稿完了を返信（#23） */
      await client.chat.postMessage({
        channel,
        thread_ts: ts,
        text: "✅ X への投稿が完了しました",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: userId
                ? `:white_check_mark: <@${userId}> が承認し、X への投稿が完了しました。`
                : ":white_check_mark: X への投稿が完了しました。",
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*投稿内容:*\n\`\`\`\n${status}\n\`\`\``,
            },
          },
        ],
      });
    },
  };
}
