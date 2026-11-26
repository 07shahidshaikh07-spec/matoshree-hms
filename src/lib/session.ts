// ============================================================================
// SERVER-SIDE SESSIONS
// A signed, httpOnly cookie carries only the user id + expiry. The role and the
// doctor profile are always re-read from the database, so a browser can never
// claim to be a different doctor by editing headers or localStorage.
// ============================================================================

import crypto from "crypto";
import type { NextRequest } from "next/server";
import { prisma } from "./db";
import type { StaffRoleType } from "./rbac";

export const SESSION_COOKIE = "mc_session";

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: StaffRoleType;
  /** DoctorProfile.id for doctors, otherwise null */
  doctorId: string | null;
}

function sessionHours(): number {
  const h = parseInt(process.env.SESSION_EXPIRY_HOURS || "12", 10);
  return Number.isFinite(h) && h > 0 ? h : 12;
}

function secret(): string {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  // Fallback keeps the app working if the variable was never configured.
  return crypto
    .createHash("sha256")
    .update("matoshree-session:" + (process.env.DATABASE_URL || "local-dev"))
    .digest("hex");
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function sessionMaxAgeSeconds(): number {
  return sessionHours() * 60 * 60;
}

export function createSessionToken(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, exp: Date.now() + sessionHours() * 60 * 60 * 1000 })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token: string | undefined | null): { uid: string } | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof data.uid !== "string" || typeof data.exp !== "number" || data.exp < Date.now()) return null;
    return { uid: data.uid };
  } catch {
    return null;
  }
}

export async function getAuthUser(req: NextRequest): Promise<AuthUser | null> {
  const session = readSessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.uid },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
      doctorProfile: { select: { id: true } }
    }
  });
  if (!user || !user.isActive) return null;
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role as StaffRoleType,
    doctorId: user.doctorProfile?.id ?? null
  };
}

export async function requireUser(req: NextRequest): Promise<AuthUser> {
  const user = await getAuthUser(req);
  if (!user) {
    const err = new Error("Your session has expired. Please sign in again.");
    (err as any).statusCode = 401;
    throw err;
  }
  return user;
}
