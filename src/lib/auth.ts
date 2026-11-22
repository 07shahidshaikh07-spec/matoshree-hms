// ============================================================================
// AUTHENTICATION, PASSWORD HASHING & SESSION MANAGEMENT
// Uses PBKDF2-HMAC-SHA512 (100,000 iterations) & signed session tokens.
// ============================================================================

import crypto from "crypto";
import { StaffRoleType } from "./rbac";

export interface SessionUser {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  role: StaffRoleType;
  department?: string;
}

export function hashPassword(password: string, customSalt?: string): string {
  const salt = customSalt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return `pbkdf2_sha512$100000$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2_sha512") return false;
  const iterations = parseInt(parts[1], 10);
  const salt = parts[2];
  const originalHash = parts[3];
  const candidateHash = crypto.pbkdf2Sync(password, salt, iterations, 64, "sha512").toString("hex");
  return crypto.timingSafeEqual(Buffer.from(originalHash, "hex"), Buffer.from(candidateHash, "hex"));
}

export function generateSessionToken(): { rawToken: string; tokenHash: string; expiresAt: Date } {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const hours = parseInt(process.env.SESSION_EXPIRY_HOURS || "12", 10);
  const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  return { rawToken, tokenHash, expiresAt };
}
