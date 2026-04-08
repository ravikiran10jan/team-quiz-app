import { NextResponse } from "next/server";
import { createAdminToken, setAdminCookie } from "@/lib/auth";

export async function POST(request: Request) {
  const { password } = await request.json();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword || password !== adminPassword) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = createAdminToken();
  await setAdminCookie(token);

  return NextResponse.json({ success: true });
}
