import { cookies } from "next/headers";
import { db } from "./db";
import { teams } from "./db/schema";
import { eq } from "drizzle-orm";

export async function getTeamSession(): Promise<{
  teamId: string;
  quizId: string;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("team_session")?.value;
  if (!token) return null;

  const team = db
    .select()
    .from(teams)
    .where(eq(teams.sessionToken, token))
    .get();
  if (!team) return null;

  return { teamId: team.id, quizId: team.quizId };
}

export async function setTeamSessionCookie(sessionToken: string) {
  const cookieStore = await cookies();
  cookieStore.set("team_session", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 86400,
  });
}
