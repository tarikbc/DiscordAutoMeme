import crypto from "crypto";
import dotenv from "dotenv";
import logger from "./logger";

dotenv.config();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const ENCODING = "hex";

if (!ENCRYPTION_KEY) {
  throw new Error("ENCRYPTION_KEY environment variable is not set");
}

export function encryptToken(token: string): string {
  // Generate a random salt
  const salt = crypto.randomBytes(SALT_LENGTH);

  // Create a key using the salt
  const key = crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 100000, 32, "sha512");

  // Generate a random IV
  const iv = crypto.randomBytes(IV_LENGTH);

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  // Encrypt the token
  let encrypted = cipher.update(token, "utf8", ENCODING);
  encrypted += cipher.final(ENCODING);

  // Get the auth tag
  const tag = cipher.getAuthTag();

  // Combine the salt, IV, tag, and encrypted data
  const result = Buffer.concat([salt, iv, tag, Buffer.from(encrypted, ENCODING)]).toString(
    ENCODING,
  );

  return result;
}

export function decryptToken(encryptedData: string): string {
  try {
    // Validate input is proper hex
    if (!encryptedData || typeof encryptedData !== "string") {
      throw new Error("Invalid encrypted data: data is null or not a string");
    }

    // Check if the input is a valid hex string
    if (!/^[0-9a-fA-F]+$/.test(encryptedData)) {
      throw new Error("Invalid encrypted data: not a valid hex string");
    }

    // Ensure the data is of minimum required length
    const minLength = (SALT_LENGTH + IV_LENGTH + TAG_LENGTH) * 2; // *2 because hex encoding
    if (encryptedData.length < minLength) {
      throw new Error(`Invalid encrypted data: data length too short`);
    }

    // Convert the combined data back to a buffer
    const buffer = Buffer.from(encryptedData, ENCODING);

    // Extract the salt, IV, tag, and encrypted data
    const salt = buffer.slice(0, SALT_LENGTH);
    const iv = buffer.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = buffer.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = buffer.slice(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    // Validate that encrypted data exists
    if (encrypted.length === 0) {
      throw new Error("Invalid encrypted data: no encrypted content present");
    }

    // Recreate the key using the salt
    const key = crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 100000, 32, "sha512");

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    // Decrypt the token - Fix the encoding issue by not specifying input encoding
    let decrypted = decipher.update(encrypted, undefined, "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    logger.error("Failed to decrypt token:", error);
    throw new Error(
      `Token decryption failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
