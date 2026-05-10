import { getLocations, getPatterns } from "@/lib/data";
import { ScanClient } from "@/components/ScanClient";

export const dynamic = "force-dynamic";

export default async function ScanPage() {
  const [locations, patterns] = await Promise.all([
    getLocations(),
    getPatterns(),
  ]);
  return <ScanClient locations={locations} patterns={patterns} />;
}
