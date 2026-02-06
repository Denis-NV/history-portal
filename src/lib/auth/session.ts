import { headers } from "next/headers";
import { redirect } from "next/navigation";
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
 * Require authentication to access a page.
 * Redirects to sign-in if no session exists.
 *
 * @example
 * ```tsx
 * import { requireSession } from "@/lib/auth/session";
 *
 * export default async function ProtectedPage() {
 *   const { user } = await requireSession();
 *   return <div>Welcome, {user.name}</div>;
 * }
 * ```
 */
export async function requireSession() {
  const session = await getSession();

  if (!session) {
    redirect("/auth/sign-in");
  }

  return session;
}
