import { getUser } from "@/lib/auth";
import { hasDb } from "@/lib/db";
import { getLocations } from "@/lib/data";
import { listSessions } from "@/lib/sessions";
import { SessionsClient } from "@/components/SessionsClient";

export const dynamic = "force-dynamic";

export default async function SessionsPage() {
  const user = await getUser();
  const [sessions, locations] = await Promise.all([
    hasDb() && user ? listSessions(user.id) : Promise.resolve([]),
    getLocations(),
  ]);
  if (!hasDb()) {
    return (
      <div className="card mx-auto max-w-xl p-8 text-center text-muted">
        Counting sessions need a database. Set <code className="font-mono text-xs">DATABASE_URL</code> to
        use them.
      </div>
    );
  }
  return <SessionsClient sessions={sessions} locations={locations} />;
}
