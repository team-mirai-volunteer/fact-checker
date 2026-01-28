export interface PublicMetrics {
  like_count: number;
  retweet_count: number;
  reply_count: number;
  quote_count: number;
}

export interface Tweet {
  id: string;
  text: string;
  author_id?: string;
  created_at?: string;
  public_metrics?: PublicMetrics;
}

export interface SearchTweetsParams {
  query: string;
  max_results?: number;
  min_likes?: number;
  min_retweets?: number;
}

export interface SearchTweetsResult {
  tweets?: Tweet[];
}

export interface PostTweetParams {
  text: string;
  quote_tweet_id?: string;
}

export interface GetTweetByIdParams {
  tweetId: string;
}

export interface BaseTwitterProvider {
  searchTweets(params: SearchTweetsParams): Promise<SearchTweetsResult>;
  postTweet(params: PostTweetParams): Promise<void>;
  getTweetById(params: GetTweetByIdParams): Promise<Tweet | null>;
}
