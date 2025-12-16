import { headers } from "next/headers";
import { auth } from "./index";

/**
 * Get the current session in server components.
 *
 * @example
 * ```tsx
 * import { getSession } from "@/lib/auth/session";
 *
 * export default async function Page() {
 *   const session = await getSession();
 *
 *   if (!session) {
 *     redirect("/auth/sign-in");
 *   }
 *
 *   return <div>Welcome, {session.user.name}</div>;
 * }
 * ```
 */
export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session;
}

/**
 * Get the current session or throw if not authenticated.
 * Use this in routes that should always have a session (after middleware protection).
 *
 * @throws Error if no session exists
 */
export async function requireSession() {
  const session = await getSession();

  if (!session) {
    throw new Error("Unauthorized: No session found");
  }

  return session;
}
