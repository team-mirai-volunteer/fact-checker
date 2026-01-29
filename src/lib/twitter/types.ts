export interface Tweet {
  id: string;
  text: string;
  author_id?: string;
  created_at?: string;
}

export interface SearchTweetsParams {
  query: string;
  max_results?: number;
  start_time?: string;
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
