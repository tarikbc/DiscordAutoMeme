import mongoose from "mongoose";

export interface IUser {
  email: string;
  passwordHash: string;
  role: "admin" | "user";
  setupCompleted: boolean;
  createdAt: Date;
  lastLogin: Date;
  settings: {
    theme: string;
    notifications: {
      enabled: boolean;
      categories: string[];
    };
  };
}

const userSchema = new mongoose.Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["admin", "user"],
    default: "user",
  },
  setupCompleted: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastLogin: {
    type: Date,
    default: Date.now,
  },
  settings: {
    theme: {
      type: String,
      default: "light",
    },
    notifications: {
      enabled: {
        type: Boolean,
        default: true,
      },
      categories: {
        type: [String],
        default: ["system", "activity", "content"],
      },
    },
  },
});

// Add any instance methods here
userSchema.methods.updateLastLogin = function () {
  this.lastLogin = new Date();
  return this.save();
};

export const User = mongoose.model<IUser>("User", userSchema);
