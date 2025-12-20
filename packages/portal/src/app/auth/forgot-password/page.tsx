import { redirect } from "next/navigation";
import { ForgotPasswordForm } from "@/components/auth";
import { getSession } from "@/lib/auth/session";
import { REDIRECT } from "@/const";

export default async function ForgotPasswordPage() {
  const session = await getSession();

  if (session) {
    redirect(REDIRECT.AFTER_SIGN_IN);
  }

  return <ForgotPasswordForm />;
}
