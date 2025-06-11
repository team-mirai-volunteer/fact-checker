import { TwitterApi } from "twitter-api-v2";

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

// 遅延初期化: 初回アクセス時にTwitterクライアントを作成
let _twitterClient: TwitterApi | null = null;

export const twitter = {
  get v2() {
    if (!_twitterClient) {
      console.log("Initializing Twitter client...");
      _twitterClient = createTwitterClient();
    }
    return _twitterClient.v2;
  }
};
