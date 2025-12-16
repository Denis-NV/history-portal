"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Better Auth client for client components.
 *
 * @example
 * ```tsx
 * "use client";
 *
 * import { authClient } from "@/lib/auth/client";
 *
 * export function SignOutButton() {
 *   return (
 *     <button onClick={() => authClient.signOut()}>
 *       Sign Out
 *     </button>
 *   );
 * }
 * ```
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
});

// Export commonly used hooks and methods
export const { signIn, signUp, signOut, useSession } = authClient;
