import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/auth";
import { getSession } from "@/lib/auth/session";
import { REDIRECT } from "@/const";

export default async function ResetPasswordPage() {
  const session = await getSession();

  if (session) {
    redirect(REDIRECT.AFTER_SIGN_IN);
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
