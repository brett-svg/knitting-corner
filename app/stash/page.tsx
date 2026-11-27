import { getLocations, getYarns } from "@/lib/data";
import { StashClient } from "@/components/StashClient";

export const dynamic = "force-dynamic";

export default async function StashPage() {
  const [yarns, locations] = await Promise.all([getYarns(), getLocations()]);
  return <StashClient yarns={yarns} locations={locations} />;
}
