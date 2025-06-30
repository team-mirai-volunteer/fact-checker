import type {
  BaseTwitterProvider,
  GetTweetByIdParams,
  PostTweetParams,
  SearchTweetsParams,
  SearchTweetsResult,
  Tweet,
} from "./types";

export class LocalTwitterProvider implements BaseTwitterProvider {
  async searchTweets(params: SearchTweetsParams): Promise<SearchTweetsResult> {
    console.log("🔍 [LocalTwitter] Search Tweets:");
    console.log("────────────────────────────────");
    console.log("Query:", params.query);
    console.log("Max Results:", params.max_results || 10);
    console.log("────────────────────────────────\n");

    const allMockTweets = [
      {
        id: "1234567890123456789",
        text: "チームみらいは素晴らしい政策を提案しています。教育改革について詳しく説明してくれました。",
        author_id: "user123",
        created_at: "2024-01-15T10:30:00.000Z",
      },
      {
        id: "9876543210987654321",
        text: "チームみらいの代表は経済学博士号を持っていると聞きました。本当でしょうか？",
        author_id: "user456",
        created_at: "2024-01-15T11:45:00.000Z",
      },
      {
        id: "5555555555555555555",
        text: "チームみらいの環境政策は他の政党とは違ったアプローチですね。興味深いです。",
        author_id: "user789",
        created_at: "2024-01-15T12:20:00.000Z",
      },
      {
        id: "1111111111111111111",
        text: "今日は良い天気ですね。散歩に行こうと思います。",
        author_id: "user999",
        created_at: "2024-01-15T13:00:00.000Z",
      },
      {
        id: "2222222222222222222",
        text: "チームミライの新しい政策について話し合いました。",
        author_id: "user888",
        created_at: "2024-01-15T14:00:00.000Z",
      },
    ];

    const filteredTweets = allMockTweets.filter(
      (tweet) =>
        tweet.text.toLowerCase().includes(params.query.toLowerCase()) ||
        params.query
          .split(" ")
          .some((keyword) =>
            tweet.text.toLowerCase().includes(keyword.toLowerCase()),
          ),
    );

    const maxResults = params.max_results || 10;
    const limitedTweets = filteredTweets.slice(0, maxResults);

    return { tweets: limitedTweets };
  }

  async postTweet(params: PostTweetParams): Promise<void> {
    console.log("🐦 [LocalTwitter] Post Tweet:");
    console.log("────────────────────────────────");
    console.log("Text:", params.text);
    if (params.quote_tweet_id) {
      console.log("Quote Tweet ID:", params.quote_tweet_id);
    }
    console.log("All Params:", JSON.stringify(params, null, 2));
    console.log("────────────────────────────────\n");
  }

  async getTweetById(params: GetTweetByIdParams): Promise<Tweet | null> {
    const allMockTweets = [
      {
        id: "1234567890123456789",
        text: "チームみらいは素晴らしい政策を提案しています。教育改革について詳しく説明してくれました。",
        author_id: "user123",
        created_at: "2024-01-15T10:30:00.000Z",
      },
      {
        id: "9876543210987654321",
        text: "チームみらいの代表は経済学博士号を持っていると聞きました。本当でしょうか？",
        author_id: "user456",
        created_at: "2024-01-15T11:45:00.000Z",
      },
      {
        id: "5555555555555555555",
        text: "チームみらいの環境政策は他の政党とは違ったアプローチですね。興味深いです。",
        author_id: "user789",
        created_at: "2024-01-15T12:20:00.000Z",
      },
      {
        id: "1111111111111111111",
        text: "今日は良い天気ですね。散歩に行こうと思います。",
        author_id: "user999",
        created_at: "2024-01-15T13:00:00.000Z",
      },
      {
        id: "2222222222222222222",
        text: "チームミライの新しい政策について話し合いました。",
        author_id: "user888",
        created_at: "2024-01-15T14:00:00.000Z",
      },
    ];

    const mockTweet = allMockTweets.find(
      (tweet) => tweet.id === params.tweetId,
    );
    if (mockTweet) {
      return mockTweet;
    }

    return null;
  }
}
