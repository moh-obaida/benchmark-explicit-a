import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { getDb } from "./db";
import { hashPassword, verifyPassword } from "./password";

export { hashPassword, verifyPassword };

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "visitor" | "admin";
};

const SESSION_COOKIE = "yara_session";
const ANON_COOKIE = "yara_anon";
const SEEN_COOKIE = "yara_seen";

function secret() {
  return process.env.SESSION_SECRET || "yara3-dev-session-secret";
}

function tokenHash(token: string) {
  return createHash("sha256").update(`${secret()}:${token}`).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const id = crypto.randomUUID();
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString();
  getDb()
    .prepare(
      `INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)`,
    )
    .run(id, userId, tokenHash(token), expires, new Date().toISOString());
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expires),
  });
}

export async function clearSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    getDb().prepare(`DELETE FROM sessions WHERE token_hash = ?`).run(tokenHash(token));
  }
  jar.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = getDb()
    .prepare(
      `SELECT u.id, u.name, u.email, u.role
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .get(tokenHash(token), new Date().toISOString()) as SessionUser | undefined;
  if (!row || (row.role !== "admin" && row.role !== "visitor")) return null;
  return row;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    const { redirect } = await import("next/navigation");
    redirect("/admin/login");
    throw new Error("forbidden");
  }
  return user;
}

const attempts = new Map<string, { count: number; reset: number }>();

export function loginAllowed(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.reset < now) {
    attempts.set(key, { count: 1, reset: now + 10 * 60 * 1000 });
    return true;
  }
  entry.count += 1;
  return entry.count <= 8;
}

export async function readAnonId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(ANON_COOKIE)?.value ?? null;
}

export async function readSeenIds(): Promise<string[]> {
  const jar = await cookies();
  const raw = jar.get(SEEN_COOKIE)?.value ?? "";
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => /^[0-9a-f-]{36}$/i.test(item))
    .slice(0, 20);
}

export async function rememberView(storyId: string, anonId: string) {
  const jar = await cookies();
  if (!jar.get(ANON_COOKIE)) {
    jar.set(ANON_COOKIE, anonId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  const seen = new Set(await readSeenIds());
  const already = seen.has(storyId);
  seen.add(storyId);
  const next = [...seen].slice(-20).join(",");
  jar.set(SEEN_COOKIE, next, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
  return already;
}

export function logAdmin(actorId: string, action: string, entity: string, entityId = "") {
  getDb()
    .prepare(
      `INSERT INTO admin_log (id, actor_id, action, entity, entity_id, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(crypto.randomUUID(), actorId, action, entity, entityId, new Date().toISOString());
}
