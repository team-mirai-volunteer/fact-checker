import { TwitterApi } from "twitter-api-v2";
import type {
  BaseTwitterProvider,
  PostTweetParams,
  SearchTweetsParams,
  SearchTweetsResult,
} from "./types";

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function createTwitterClient() {
  const hasOAuth1 =
    process.env.X_APP_KEY &&
    process.env.X_APP_SECRET &&
    process.env.X_ACCESS_TOKEN &&
    process.env.X_ACCESS_SECRET;

  if (hasOAuth1) {
    // OAuth1.0a（読み書き両方）
    return new TwitterApi({
      appKey: getEnv("X_APP_KEY"),
      appSecret: getEnv("X_APP_SECRET"),
      accessToken: getEnv("X_ACCESS_TOKEN"),
      accessSecret: getEnv("X_ACCESS_SECRET"),
    });
  }

  // OAuth2 Bearer（読み取り専用）
  return new TwitterApi(getEnv("X_BEARER_TOKEN"));
}

export class TwitterProvider implements BaseTwitterProvider {
  private client: TwitterApi;

  constructor() {
    this.client = createTwitterClient();
  }

  async searchTweets(params: SearchTweetsParams): Promise<SearchTweetsResult> {
    const result = await this.client.v2.search(params.query, {
      max_results: params.max_results,
    });

    return {
      tweets: result.data?.data?.map((tweet) => ({
        id: tweet.id,
        text: tweet.text,
        author_id: tweet.author_id,
        created_at: tweet.created_at,
      })),
    };
  }

  async postTweet(params: PostTweetParams): Promise<void> {
    await this.client.v2.tweet({
      text: params.text,
      quote_tweet_id: params.quote_tweet_id,
    });
  }
}
