import { getProjects, getYarns } from "@/lib/data";
import { ProjectsClient } from "@/components/ProjectsClient";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const [projects, yarns] = await Promise.all([getProjects(), getYarns()]);
  return <ProjectsClient projects={projects} yarns={yarns} />;
}
