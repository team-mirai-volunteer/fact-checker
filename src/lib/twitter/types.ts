export interface Tweet {
  id: string;
  text: string;
  author_id?: string;
  created_at?: string;
}

export interface SearchTweetsParams {
  query: string;
  max_results?: number;
}

export interface SearchTweetsResult {
  tweets?: Tweet[];
}

export interface PostTweetParams {
  text: string;
  quote_tweet_id?: string;
}

export interface BaseTwitterProvider {
  searchTweets(params: SearchTweetsParams): Promise<SearchTweetsResult>;
  postTweet(params: PostTweetParams): Promise<void>;
}
