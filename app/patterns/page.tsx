import { getPatterns } from "@/lib/data";
import { PatternsClient } from "@/components/PatternsClient";

export const dynamic = "force-dynamic";

export default async function PatternsPage() {
  const patterns = await getPatterns();
  return <PatternsClient patterns={patterns} />;
}
