import { getHooks, getLocations, getNeedles, getNotions } from "@/lib/data";
import { ToolsClient } from "@/components/ToolsClient";

export const dynamic = "force-dynamic";

export default async function ToolsPage() {
  const [needles, hooks, notions, locations] = await Promise.all([
    getNeedles(),
    getHooks(),
    getNotions(),
    getLocations(),
  ]);
  return (
    <ToolsClient
      needles={needles}
      hooks={hooks}
      notions={notions}
      locations={locations}
    />
  );
}
