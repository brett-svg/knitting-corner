import { getYarns } from "@/lib/data";
import { StashClient } from "@/components/StashClient";

export const dynamic = "force-dynamic";

export default async function StashPage() {
  const yarns = await getYarns();
  return <StashClient yarns={yarns} />;
}
