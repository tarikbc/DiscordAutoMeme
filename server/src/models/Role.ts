import mongoose, { Document, Schema, Types } from "mongoose";
import { IPermission } from "./Permission";

export interface IRole extends Document {
  _id: Types.ObjectId;
  name: string;
  description: string;
  permissions: Types.ObjectId[] | IPermission[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const roleSchema = new Schema<IRole>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    permissions: [
      {
        type: Schema.Types.ObjectId,
        ref: "Permission",
      },
    ],
    isSystem: {
      type: Boolean,
      default: false,
      description: "System roles cannot be deleted",
    },
  },
  {
    timestamps: true,
  },
);

// Add indexes
roleSchema.index({ name: 1 }, { unique: true });

export const Role = mongoose.model<IRole>("Role", roleSchema);

// Default system roles
export const SYSTEM_ROLES = {
  ADMIN: {
    name: "Administrator",
    description: "Full access to all system features",
    isSystem: true,
    permissionCodes: [
      // Add all permission codes for admin
      "users:view",
      "users:create",
      "users:edit",
      "users:delete",
      "roles:manage",
      "accounts:view_all",
      "accounts:create",
      "accounts:edit_all",
      "accounts:delete_all",
      "system:view_metrics",
      "system:manage_settings",
      "content:view_all",
      "content:manage_all",
    ],
  },
  USER: {
    name: "User",
    description: "Standard user with limited access",
    isSystem: true,
    permissionCodes: [
      // Add permission codes for standard user
      "accounts:view_own",
      "accounts:create",
      "accounts:edit_own",
      "accounts:delete_own",
      "content:view_own",
      "content:manage_own",
    ],
  },
  VIEWER: {
    name: "Viewer",
    description: "Read-only access to their own accounts",
    isSystem: true,
    permissionCodes: ["accounts:view_own", "content:view_own"],
  },
};

// Helper function to seed roles
export async function seedRoles(): Promise<Map<string, Types.ObjectId>> {
  const roleIds = new Map<string, Types.ObjectId>();

  // Import Permission model for finding permissions by code
  const { Permission } = await import("./Permission");

  // Create default roles
  for (const [key, role] of Object.entries(SYSTEM_ROLES)) {
    // Find permissions by codes
    const permissions = await Permission.find({
      code: { $in: role.permissionCodes },
    }).select("_id");

    // Create or update the role
    const savedRole = await Role.findOneAndUpdate(
      { name: role.name },
      {
        ...role,
        permissions: permissions.map(p => p._id),
      },
      { upsert: true, new: true },
    );

    roleIds.set(key, savedRole._id);
  }

  return roleIds;
}
