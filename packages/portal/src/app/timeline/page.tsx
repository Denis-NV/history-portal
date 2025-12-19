import { requireSession } from "@/lib/auth/session";

export default async function TimelinePage() {
  const { user } = await requireSession();

  return (
    <main className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Timeline</h1>
      <p className="text-muted-foreground">
        Welcome, {user.name ?? user.email}!
      </p>
    </main>
  );
}
