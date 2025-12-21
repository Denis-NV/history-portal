import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { AUTH_ROUTES, PUBLIC_ROUTES } from "@/const";
import { SignOutButton } from "../sign-out-button";

export const Header = async () => {
  const session = await getSession();

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href={PUBLIC_ROUTES.HOME} className="text-xl font-semibold">
          History Portal
        </Link>

        <nav className="flex items-center gap-4">
          {session ? (
            <>
              <span className="text-sm text-gray-700">
                {session.user.name || session.user.email}
              </span>
              <SignOutButton />
            </>
          ) : (
            <Link
              href={AUTH_ROUTES.SIGN_IN}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Sign In
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};
