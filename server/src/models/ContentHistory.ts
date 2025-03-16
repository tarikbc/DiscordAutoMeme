import { Schema, model, Types, Document } from "mongoose";

export interface IContentHistory extends Document {
  _id: Types.ObjectId;
  discordAccountId: Types.ObjectId;
  friendId: Types.ObjectId;
  activityId: Types.ObjectId;
  contentType: string;
  content: {
    url: string;
    title: string;
    source: string;
    type: string;
  };
  trigger: {
    type: "GAME" | "MUSIC" | "STREAMING" | "WATCHING" | "CUSTOM" | "COMPETING";
    value: string;
  };
  status: "PENDING" | "SENT" | "FAILED";
  sentAt?: Date;
  error?: string;
  updateStatus(status: "SENT" | "FAILED", error?: string): Promise<void>;
  markSent(): Promise<void>;
  markFailed(error: string): Promise<void>;
}

const ContentHistorySchema = new Schema<IContentHistory>(
  {
    discordAccountId: {
      type: Schema.Types.ObjectId,
      ref: "DiscordAccount",
      required: true,
      index: true,
    },
    friendId: {
      type: Schema.Types.ObjectId,
      ref: "Friend",
      required: true,
      index: true,
    },
    activityId: {
      type: Schema.Types.ObjectId,
      ref: "ActivityHistory",
      required: true,
    },
    contentType: {
      type: String,
      required: true,
      index: true,
    },
    content: {
      url: {
        type: String,
        required: true,
      },
      title: {
        type: String,
        required: true,
      },
      source: {
        type: String,
        required: true,
      },
      type: {
        type: String,
        required: true,
      },
    },
    trigger: {
      type: {
        type: String,
        enum: ["GAME", "MUSIC", "STREAMING", "WATCHING", "CUSTOM", "COMPETING"],
        required: true,
      },
      value: {
        type: String,
        required: true,
      },
    },
    status: {
      type: String,
      enum: ["PENDING", "SENT", "FAILED"],
      default: "PENDING",
      index: true,
    },
    sentAt: Date,
    error: String,
  },
  {
    timestamps: true,
  },
);

// Indexes for common queries
ContentHistorySchema.index({ status: 1, createdAt: -1 });
ContentHistorySchema.index({ "trigger.type": 1, "trigger.value": 1 });

// Add method to update status
ContentHistorySchema.methods.updateStatus = async function (
  status: "SENT" | "FAILED",
  error?: string,
) {
  this.status = status;
  if (status === "SENT") {
    this.sentAt = new Date();
  }
  if (error) {
    this.error = error;
  }
  await this.save();
};

// Add method to mark as sent
ContentHistorySchema.methods.markSent = async function () {
  await this.updateStatus("SENT");
};

// Add method to mark as failed
ContentHistorySchema.methods.markFailed = async function (error: string) {
  await this.updateStatus("FAILED", error);
};

export const ContentHistory = model<IContentHistory>("ContentHistory", ContentHistorySchema);
