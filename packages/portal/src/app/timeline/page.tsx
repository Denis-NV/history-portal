import { getSession } from "@/lib/auth/session";
import { TimelineClient } from "@/components/timeline/timeline-client";

export default async function TimelinePage() {
  await getSession();
  return (
    <main className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Timeline</h1>

      <TimelineClient />
    </main>
  );
}
