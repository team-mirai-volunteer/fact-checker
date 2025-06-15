import type { ReceiverEvent } from "@slack/bolt";
import type { KnownBlock } from "@slack/types";

export interface SlackNotificationParams {
  answer: string;
  tweet: string;
  tweetUrl: string;
}

export interface SlackMessageParams {
  text: string;
  blocks?: KnownBlock[];
}

export interface SlackEventBody {
  type?: string;
  challenge?: string;
  event?: {
    type: string;
    text?: string;
    user?: string;
    channel?: string;
    thread_ts?: string;
    ts?: string;
  };
  actions?: Array<{
    action_id: string;
    value?: string;
  }>;
}

export type ButtonValue = {
  originalTweet: string; // 200 字以内に切り詰めておく
  originalTweetUrl: string;
  factCheckResult: string; // 1 行目だけなら 200 byte も行かない
};

export interface MentionParams {
  text: string;
  channel?: string;
  user?: string;
  ts?: string;
  thread_ts?: string;
}

export interface BaseSlackProvider {
  notify(params: SlackNotificationParams): Promise<void>;
  sendMessage(params: SlackMessageParams): Promise<void>;
  processEvent(params: ReceiverEvent): Promise<void>;
  handleMention?(params: MentionParams): Promise<void>;
}
