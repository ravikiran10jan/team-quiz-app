import { cookies } from "next/headers";
import crypto from "crypto";

const SECRET = process.env.ADMIN_PASSWORD || "default-secret";

function sign(value: string): string {
  const hmac = crypto.createHmac("sha256", SECRET);
  hmac.update(value);
  return hmac.digest("hex");
}

export function createAdminToken(): string {
  const payload = `admin:${Date.now()}`;
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function verifyAdminToken(token: string): boolean {
  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) return false;
  const payload = token.substring(0, lastDot);
  const signature = token.substring(lastDot + 1);
  return sign(payload) === signature;
}

export async function setAdminCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set("admin_token", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 86400,
  });
}

export async function getAdminToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get("admin_token")?.value;
}

export async function isAdmin(): Promise<boolean> {
  const token = await getAdminToken();
  if (!token) return false;
  return verifyAdminToken(token);
}
