import mongoose from "mongoose";
import bcrypt from "bcrypt";
import config from "../config";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { IRole } from "./Role";

export interface IUser extends mongoose.Document {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  roles: Types.ObjectId[] | IRole[]; // Role-based permissions
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
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  failedLoginAttempts?: number;
  accountLocked?: boolean;
  accountLockedUntil?: Date;
}

export interface UserDocument extends IUser {
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateAuthToken(): string;
  generateRefreshToken(): string;
  updateLastLogin(): Promise<UserDocument>;
  incrementLoginAttempts(): Promise<UserDocument>;
  resetLoginAttempts(): Promise<UserDocument>;
  lockAccount(minutes: number): Promise<UserDocument>;
  isAccountLocked(): boolean;
  hasPermission(permission: string): Promise<boolean>;
  hasPermissions(permissions: string[]): Promise<boolean>;
  getPermissions(): Promise<string[]>;
}

const userSchema = new mongoose.Schema<UserDocument>(
  {
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
    roles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Role",
      },
    ],
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
      default: null,
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
          default: ["GAME", "MUSIC", "STREAMING", "WATCHING", "CUSTOM", "COMPETING"],
        },
      },
    },
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    accountLocked: {
      type: Boolean,
      default: false,
    },
    accountLockedUntil: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Password comparison method
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.passwordHash);
  } catch (error) {
    throw new Error(`Password comparison error: ${error}`);
  }
};

// Generate JWT auth token
userSchema.methods.generateAuthToken = function (): string {
  const tokenId = `${this._id}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

  const payload = {
    id: this._id,
    email: this.email,
    jti: tokenId, // Add JWT ID claim for revocation purposes
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

// Generate refresh token
userSchema.methods.generateRefreshToken = function (): string {
  const tokenId = `refresh_${this._id}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

  const payload = {
    id: this._id,
    type: "refresh",
    jti: tokenId, // Add JWT ID claim for revocation purposes
  };

  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
};

// Update last login timestamp
userSchema.methods.updateLastLogin = function (): Promise<UserDocument> {
  this.lastLogin = new Date();
  return this.save();
};

// Increment failed login attempts
userSchema.methods.incrementLoginAttempts = function (): Promise<UserDocument> {
  this.failedLoginAttempts = (this.failedLoginAttempts || 0) + 1;

  // If we've reached the maximum failed attempts, lock the account
  if (this.failedLoginAttempts >= config.security.maxLoginAttempts) {
    return this.lockAccount(config.security.lockoutTime);
  }

  return this.save();
};

// Reset login attempts counter
userSchema.methods.resetLoginAttempts = function (): Promise<UserDocument> {
  this.failedLoginAttempts = 0;
  this.accountLocked = false;
  this.accountLockedUntil = undefined;
  return this.save();
};

// Lock the account for a specified time
userSchema.methods.lockAccount = function (minutes: number): Promise<UserDocument> {
  this.accountLocked = true;
  this.accountLockedUntil = new Date(Date.now() + minutes * 60 * 1000);
  return this.save();
};

// Check if the account is locked
userSchema.methods.isAccountLocked = function (): boolean {
  if (!this.accountLocked) return false;

  // If lock has expired, unlock automatically
  if (this.accountLockedUntil && this.accountLockedUntil < new Date()) {
    this.accountLocked = false;
    this.accountLockedUntil = undefined;
    this.save();
    return false;
  }

  return true;
};

// Pre-save hook to hash password
userSchema.pre("save", async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("passwordHash")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Permission methods
userSchema.methods.hasPermission = async function (permission: string): Promise<boolean> {
  // Check roles-based permissions
  if (!this.roles || this.roles.length === 0) {
    return false;
  }

  // Populate roles if not already populated
  if (!this.populated("roles")) {
    await this.populate({
      path: "roles",
      populate: {
        path: "permissions",
        model: "Permission",
        select: "code",
      },
    });
  }

  // Check if any of the user's roles include the permission
  for (const role of this.roles as IRole[]) {
    for (const perm of role.permissions as any[]) {
      if (perm.code === permission) {
        return true;
      }
    }
  }

  return false;
};

userSchema.methods.hasPermissions = async function (permissions: string[]): Promise<boolean> {
  // Check each permission
  for (const permission of permissions) {
    const hasPermission = await this.hasPermission(permission);
    if (!hasPermission) {
      return false;
    }
  }

  return true;
};

userSchema.methods.getPermissions = async function (): Promise<string[]> {
  // Check roles-based permissions
  if (!this.roles || this.roles.length === 0) {
    return [];
  }

  // Populate roles if not already populated
  if (!this.populated("roles")) {
    await this.populate({
      path: "roles",
      populate: {
        path: "permissions",
        model: "Permission",
        select: "code",
      },
    });
  }

  // Collect unique permissions from all roles
  const permissionSet = new Set<string>();
  for (const role of this.roles as IRole[]) {
    for (const perm of role.permissions as any[]) {
      permissionSet.add(perm.code);
    }
  }

  return Array.from(permissionSet);
};

export const User = mongoose.model<UserDocument>("User", userSchema);

// Helper function to create user with hashed password and assign default role
export const createUser = async (email: string, password: string): Promise<UserDocument> => {
  const passwordHash = await bcrypt.hash(password, 10);
  return User.create({
    email,
    passwordHash,
  });
};
