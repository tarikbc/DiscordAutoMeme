// Game activity interface
export interface GameActivity {
  userId: string;
  username: string;
  gameName: string;
}

// Friend with game activity
export interface FriendWithGame {
  id: string;
  username: string;
  gameName: string;
  lastSentMemeTimestamp?: number;
}

// Meme interface
export interface Meme {
  url: string;
  title: string;
  source?: string;
}

// Google search result interface
export interface GoogleSearchResult {
  images_results: {
    position: number;
    thumbnail: string;
    original: string;
    title: string;
    source: string;
  }[];
}
