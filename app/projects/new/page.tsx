import { getPatterns, getYarns } from "@/lib/data";
import { NewProjectForm } from "@/components/NewProjectForm";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const [patterns, yarns] = await Promise.all([getPatterns(), getYarns()]);
  return <NewProjectForm patterns={patterns} yarns={yarns} />;
}
