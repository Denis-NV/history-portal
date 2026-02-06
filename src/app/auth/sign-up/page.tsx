import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/auth";
import { getSession } from "@/lib/auth/session";
import { REDIRECT } from "@/const";

export default async function SignUpPage() {
  const session = await getSession();

  if (session) {
    redirect(REDIRECT.AFTER_SIGN_IN);
  }

  return <SignUpForm />;
}
