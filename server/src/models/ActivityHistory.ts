import { Schema, model, Types, Document } from "mongoose";

export interface IActivityHistory extends Document {
  _id: Types.ObjectId;
  friendId: Types.ObjectId;
  discordAccountId: Types.ObjectId;
  type: "GAME" | "MUSIC" | "STREAMING" | "WATCHING" | "CUSTOM" | "COMPETING";
  details: {
    gameName?: string;
    musicDetails?: {
      artist: string;
      song: string;
      album?: string;
    };
    streamingDetails?: {
      platform: string;
      title: string;
      url?: string;
    };
    watchingDetails?: {
      title: string;
      platform?: string;
    };
    customDetails?: {
      name: string;
      state?: string;
    };
    competingDetails?: {
      name: string;
      venue?: string;
    };
    startedAt: Date;
    endedAt?: Date;
  };
  processed: boolean;
  processedAt?: Date;
  error?: string;
  markProcessed(error?: string): Promise<void>;
}

const ActivityHistorySchema = new Schema<IActivityHistory>(
  {
    friendId: {
      type: Schema.Types.ObjectId,
      ref: "Friend",
      required: true,
      index: true,
    },
    discordAccountId: {
      type: Schema.Types.ObjectId,
      ref: "DiscordAccount",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["GAME", "MUSIC", "STREAMING", "WATCHING", "CUSTOM", "COMPETING"],
      required: true,
    },
    details: {
      gameName: String,
      musicDetails: {
        artist: String,
        song: String,
        album: String,
      },
      streamingDetails: {
        platform: String,
        title: String,
        url: String,
      },
      watchingDetails: {
        title: String,
        platform: String,
      },
      customDetails: {
        name: String,
        state: String,
      },
      competingDetails: {
        name: String,
        venue: String,
      },
      startedAt: {
        type: Date,
        required: true,
      },
      endedAt: Date,
    },
    processed: {
      type: Boolean,
      default: false,
      index: true,
    },
    processedAt: Date,
    error: String,
  },
  {
    timestamps: true,
  },
);

// Indexes for common queries
ActivityHistorySchema.index({ "details.startedAt": -1 });
ActivityHistorySchema.index({ processed: 1, processedAt: 1 });

// Add method to mark activity as processed
ActivityHistorySchema.methods.markProcessed = async function (error?: string) {
  this.processed = true;
  this.processedAt = new Date();
  if (error) {
    this.error = error;
  }
  await this.save();
};

export const ActivityHistory = model<IActivityHistory>("ActivityHistory", ActivityHistorySchema);
