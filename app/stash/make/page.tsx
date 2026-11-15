import { getPatterns, getYarns } from "@/lib/data";
import { ravelrySuggestionsEnabled } from "@/lib/pattern-suggestions";
import { StashMakeClient } from "@/components/StashMakeClient";

export const dynamic = "force-dynamic";

export default async function StashMakePage() {
  const [yarns, patterns] = await Promise.all([getYarns(), getPatterns()]);
  return (
    <StashMakeClient
      yarns={yarns}
      patterns={patterns}
      ravelryEnabled={ravelrySuggestionsEnabled()}
    />
  );
}
