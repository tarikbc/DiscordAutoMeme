import mongoose, { Document, Schema } from "mongoose";

export interface IAuditLog extends Document {
  action: string; // The action performed (e.g., "batch_start_accounts", "batch_delete_accounts")
  userId: mongoose.Types.ObjectId; // The user who performed the action
  resourceType: string; // The type of resource affected (e.g., "discord_account", "user", "role")
  resourceIds: mongoose.Types.ObjectId[]; // The IDs of the resources affected
  details: any; // Additional details about the operation
  status: "success" | "partial" | "failed"; // The status of the operation
  error?: string; // Error message if the operation failed
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    resourceType: {
      type: String,
      required: true,
      index: true,
    },
    resourceIds: [
      {
        type: Schema.Types.ObjectId,
        required: true,
      },
    ],
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ["success", "partial", "failed"],
      default: "success",
      index: true,
    },
    error: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

// Create indexes for common queries
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, resourceType: 1 });

export const AuditLog = mongoose.model<IAuditLog>("AuditLog", auditLogSchema);

// Helper function to create an audit log entry
export const createAuditLog = (
  action: string,
  userId: mongoose.Types.ObjectId,
  resourceType: string,
  resourceIds: mongoose.Types.ObjectId[],
  details: any = {},
  status: "success" | "partial" | "failed" = "success",
  error?: string,
): Promise<IAuditLog> => {
  return AuditLog.create({
    action,
    userId,
    resourceType,
    resourceIds,
    details,
    status,
    error,
  });
};
