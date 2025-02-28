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

// Music activity interface
export interface MusicActivity {
  userId: string;
  username: string;
  artistName: string;
  songName?: string;
  albumName?: string;
  playerName?: string;
}

// Friend with music activity
export interface FriendWithMusic {
  id: string;
  username: string;
  artistName: string;
  songName?: string;
  albumName?: string;
  playerName?: string;
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
