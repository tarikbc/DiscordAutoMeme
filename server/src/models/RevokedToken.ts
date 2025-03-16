import mongoose, { Document } from "mongoose";

export interface IRevokedToken extends Document {
  tokenId: string; // Unique identifier for the token (usually jti claim)
  userId: mongoose.Types.ObjectId; // User ID associated with the token
  expiresAt: Date; // When the token would naturally expire
  revokedAt: Date; // When the token was revoked
  reason: string; // Reason for revocation (e.g., logout, password change, account lock)
}

const revokedTokenSchema = new mongoose.Schema<IRevokedToken>(
  {
    tokenId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    revokedAt: {
      type: Date,
      default: Date.now,
    },
    reason: {
      type: String,
      enum: ["logout", "password_change", "account_lock", "admin_action", "token_refresh", "other"],
      default: "other",
    },
  },
  {
    timestamps: true,
  },
);

// Create an index that expires documents after their expiry time
// This automatically cleans up the collection
revokedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RevokedToken = mongoose.model<IRevokedToken>("RevokedToken", revokedTokenSchema);

// Helper functions
export const revokeToken = (
  tokenId: string,
  userId: mongoose.Types.ObjectId,
  expiresAt: Date,
  reason: string = "logout",
): Promise<IRevokedToken> => {
  return RevokedToken.create({
    tokenId,
    userId,
    expiresAt,
    revokedAt: new Date(),
    reason,
  });
};

export const isTokenRevoked = async (tokenId: string): Promise<boolean> => {
  const token = await RevokedToken.findOne({ tokenId });
  return !!token;
};

export const getRevokedTokensByUser = (
  userId: mongoose.Types.ObjectId,
): Promise<IRevokedToken[]> => {
  return RevokedToken.find({ userId }).sort({ revokedAt: -1 });
};

export const cleanupExpiredTokens = async (): Promise<number> => {
  const now = new Date();
  const result = await RevokedToken.deleteMany({ expiresAt: { $lt: now } });
  return result.deletedCount;
};
