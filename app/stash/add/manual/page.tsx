import { getLocations } from "@/lib/data";
import { ManualClient } from "@/components/ManualClient";

export const dynamic = "force-dynamic";

export default async function ManualAddPage() {
  const locations = await getLocations();
  return <ManualClient locations={locations} />;
}
