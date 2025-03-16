import mongoose, { Document } from "mongoose";
import { IDiscordAccount } from "./DiscordAccount";

type ActivityType = "GAME" | "MUSIC" | "STREAMING" | "WATCHING" | "CUSTOM" | "COMPETING";

interface BaseActivity {
  type: ActivityType;
  timestamp: Date;
}

interface GameActivity extends BaseActivity {
  type: "GAME";
  gameName: string;
}

interface MusicActivity extends BaseActivity {
  type: "MUSIC";
  artistName: string;
  songName?: string;
  albumName?: string;
  playerName?: string;
}

interface StreamingActivity extends BaseActivity {
  type: "STREAMING";
  streamTitle: string;
  platform?: string;
  url?: string;
}

interface WatchingActivity extends BaseActivity {
  type: "WATCHING";
  showName: string;
  platform?: string;
  episode?: string;
}

interface CompetingActivity extends BaseActivity {
  type: "COMPETING";
  tournamentName: string;
  game: string;
  rank?: string;
}

interface CustomActivity extends BaseActivity {
  type: "CUSTOM";
  name: string;
  details?: string;
}

type Activity =
  | GameActivity
  | MusicActivity
  | StreamingActivity
  | WatchingActivity
  | CompetingActivity
  | CustomActivity;

export interface IFriend extends Document {
  _id: mongoose.Types.ObjectId;
  discordAccountId: mongoose.Types.ObjectId | IDiscordAccount;
  userId: string;
  username: string;
  lastActivity: Activity;
  contentReceived: number;
  lastContentTime: Date | null;
  contentPreferences: {
    enabledTypes: string[];
    blacklist: string[];
    timeRestrictions: {
      startHour: number;
      endHour: number;
    };
  };
  createdAt: Date;
  updatedAt: Date;

  // Instance methods
  updateActivity(activity: Activity): Promise<IFriend>;
  incrementContentReceived(): Promise<IFriend>;
}

const friendSchema = new mongoose.Schema<IFriend>(
  {
    discordAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DiscordAccount",
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
    lastActivity: {
      type: {
        type: String,
        enum: ["GAME", "MUSIC", "STREAMING", "WATCHING", "CUSTOM", "COMPETING"],
        required: true,
      },
      // Game activity fields
      gameName: String,
      // Music activity fields
      artistName: String,
      songName: String,
      albumName: String,
      playerName: String,
      // Streaming activity fields
      streamTitle: String,
      platform: String,
      url: String,
      // Watching activity fields
      showName: String,
      episode: String,
      // Competing activity fields
      tournamentName: String,
      game: String,
      rank: String,
      // Custom activity fields
      name: String,
      details: String,
      // Common fields
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
    contentReceived: {
      type: Number,
      default: 0,
    },
    lastContentTime: {
      type: Date,
      default: null,
    },
    contentPreferences: {
      enabledTypes: {
        type: [String],
        default: ["meme", "gif"],
      },
      blacklist: {
        type: [String],
        default: [],
      },
      timeRestrictions: {
        startHour: {
          type: Number,
          default: 9,
          min: 0,
          max: 23,
        },
        endHour: {
          type: Number,
          default: 22,
          min: 0,
          max: 23,
        },
      },
    },
  },
  {
    timestamps: true,
  },
);

// Add indexes
friendSchema.index({ discordAccountId: 1, userId: 1 }, { unique: true });
friendSchema.index({ lastActivity: -1 });

// Add instance methods
friendSchema.methods.updateActivity = function (activity: Activity) {
  this.lastActivity = activity;
  return this.save();
};

friendSchema.methods.incrementContentReceived = function () {
  this.contentReceived += 1;
  this.lastContentTime = new Date();
  return this.save();
};

export const Friend = mongoose.model<IFriend>("Friend", friendSchema);
