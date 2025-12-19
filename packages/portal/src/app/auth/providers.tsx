"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthUIProvider } from "better-auth-ui";

import { authClient } from "@/lib/auth/client";

export function AuthProviders({ children }: { children: ReactNode }) {
  const router = useRouter();

  return (
    <AuthUIProvider
      authClient={authClient}
      navigate={router.push}
      replace={router.replace}
      onSessionChange={() => {
        router.refresh();
      }}
      Link={Link}
      emailVerification
      social={{
        providers: ["google"],
      }}
      redirectTo="/timeline"
    >
      {children}
    </AuthUIProvider>
  );
}
