import { notFound } from "next/navigation";
import { getUser } from "@/lib/auth";
import { hasDb } from "@/lib/db";
import { getLocations } from "@/lib/data";
import { getSession } from "@/lib/sessions";
import { ReviewClient } from "@/components/ReviewClient";

export const dynamic = "force-dynamic";

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!hasDb() || !user) notFound();
  const [data, locations] = await Promise.all([getSession(user.id, id), getLocations()]);
  if (!data) notFound();
  return <ReviewClient initial={data} locations={locations} />;
}
