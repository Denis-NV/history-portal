import { requireSession } from "@/lib/auth/session";
import { TimelineClient } from "@/components/timeline/timeline-client";

export default async function TimelinePage() {
  const { user } = await requireSession();

  return (
    <main className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Timeline</h1>
      <p className="text-muted-foreground mb-6">
        Welcome, {user.name ?? user.email}!
      </p>

      <TimelineClient />
    </main>
  );
}
