import crypto from "crypto";
import dotenv from "dotenv";

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
  // Convert the combined data back to a buffer
  const buffer = Buffer.from(encryptedData, ENCODING);

  // Extract the salt, IV, tag, and encrypted data
  const salt = buffer.slice(0, SALT_LENGTH);
  const iv = buffer.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = buffer.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const encrypted = buffer.slice(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

  // Recreate the key using the salt
  const key = crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 100000, 32, "sha512");

  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  // Decrypt the token
  let decrypted = decipher.update(encrypted.toString(), ENCODING, "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
