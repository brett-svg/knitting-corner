import { getLocationsWithYarns } from "@/lib/data";
import { LabelsClient } from "@/components/LabelsClient";

export const dynamic = "force-dynamic";

export default async function LabelsPage() {
  const locations = await getLocationsWithYarns();
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Labels</h1>
        <p className="mt-1 text-sm text-muted">
          Generate 4×6 labels for your yarn storage boxes.
        </p>
      </div>
      <LabelsClient locations={locations} />
    </div>
  );
}
