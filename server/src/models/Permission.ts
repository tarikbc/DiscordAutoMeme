import mongoose, { Document, Schema } from "mongoose";

export interface IPermission extends Document {
  code: string;
  name: string;
  description: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

const permissionSchema = new Schema<IPermission>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: ["accounts", "users", "system", "content"],
    },
  },
  {
    timestamps: true,
  },
);

// Add indexes
permissionSchema.index({ code: 1 }, { unique: true });
permissionSchema.index({ category: 1 });

export const Permission = mongoose.model<IPermission>("Permission", permissionSchema);

// Initial system permissions
export const SYSTEM_PERMISSIONS = [
  // User management permissions
  {
    code: "users:view",
    name: "View Users",
    description: "View list of users and user details",
    category: "users",
  },
  {
    code: "users:create",
    name: "Create Users",
    description: "Create new users",
    category: "users",
  },
  {
    code: "users:edit",
    name: "Edit Users",
    description: "Edit existing users",
    category: "users",
  },
  {
    code: "users:delete",
    name: "Delete Users",
    description: "Delete users from the system",
    category: "users",
  },
  {
    code: "roles:manage",
    name: "Manage Roles",
    description: "Create, edit, and assign roles",
    category: "users",
  },

  // Account management permissions
  {
    code: "accounts:view_all",
    name: "View All Accounts",
    description: "View all Discord accounts in the system",
    category: "accounts",
  },
  {
    code: "accounts:view_own",
    name: "View Own Accounts",
    description: "View user's own Discord accounts",
    category: "accounts",
  },
  {
    code: "accounts:create",
    name: "Create Accounts",
    description: "Create new Discord accounts",
    category: "accounts",
  },
  {
    code: "accounts:edit_all",
    name: "Edit All Accounts",
    description: "Edit any Discord account",
    category: "accounts",
  },
  {
    code: "accounts:edit_own",
    name: "Edit Own Accounts",
    description: "Edit user's own Discord accounts",
    category: "accounts",
  },
  {
    code: "accounts:delete_all",
    name: "Delete All Accounts",
    description: "Delete any Discord account",
    category: "accounts",
  },
  {
    code: "accounts:delete_own",
    name: "Delete Own Accounts",
    description: "Delete user's own Discord accounts",
    category: "accounts",
  },

  // System management permissions
  {
    code: "system:view_metrics",
    name: "View System Metrics",
    description: "View system performance metrics",
    category: "system",
  },
  {
    code: "system:manage_settings",
    name: "Manage System Settings",
    description: "Modify global system settings",
    category: "system",
  },

  // Content management permissions
  {
    code: "content:view_all",
    name: "View All Content",
    description: "View all content in the system",
    category: "content",
  },
  {
    code: "content:view_own",
    name: "View Own Content",
    description: "View content associated with user's accounts",
    category: "content",
  },
  {
    code: "content:manage_all",
    name: "Manage All Content",
    description: "Create, edit, delete any content",
    category: "content",
  },
  {
    code: "content:manage_own",
    name: "Manage Own Content",
    description: "Create, edit, delete content for user's accounts",
    category: "content",
  },
];

// Helper function to seed permissions
export async function seedPermissions(): Promise<void> {
  // For each permission in SYSTEM_PERMISSIONS
  for (const permission of SYSTEM_PERMISSIONS) {
    // Create or update the permission
    await Permission.findOneAndUpdate({ code: permission.code }, permission, {
      upsert: true,
      new: true,
    });
  }
}
