import { AuthView } from "better-auth-ui";
import { authViewPaths } from "better-auth-ui/server";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.values(authViewPaths).map((path) => ({ path }));
}

type AuthPageProps = {
  params: Promise<{ path: string }>;
};

export default async function AuthPage({ params }: AuthPageProps) {
  const { path } = await params;

  return (
    <div className="container flex min-h-screen flex-col items-center justify-center p-4 md:p-6">
      <AuthView path={path} />
    </div>
  );
}
