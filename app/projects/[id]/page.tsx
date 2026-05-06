import { notFound } from "next/navigation";
import Link from "next/link";
import { getPatterns, getProject, getYarns } from "@/lib/data";
import { ProjectEditor } from "@/components/ProjectEditor";
import { ProjectAllocationEditor } from "@/components/ProjectAllocationEditor";
import { ColorPreview } from "@/components/ColorPreview";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [project, yarns, patterns] = await Promise.all([
    getProject(id),
    getYarns(),
    getPatterns(),
  ]);
  if (!project) notFound();

  const matchingPattern = patterns.find(
    (p) => p.designer === project.pattern || p.name === project.pattern
  );
  const patternWeight = matchingPattern?.yarnWeight ?? null;
  const requiredYardage = matchingPattern?.requiredYardage ?? null;

  const allocated = yarns.filter((y) => project.yarnIds.includes(y.id));

  return (
    <div className="space-y-10">
      <div
        className="aspect-[16/6] w-full overflow-hidden rounded-2xl"
        style={{ background: project.hero }}
      />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            {project.pattern}
          </p>
          <h1 className="mt-1 font-display text-5xl tracking-tight">
            {project.name}
          </h1>
          {(project.recipient || project.giftDate) && (
            <p className="mt-2 text-sm text-muted">
              {project.recipient && (
                <>
                  For <span className="text-ink">{project.recipient}</span>
                </>
              )}
              {project.recipient && project.giftDate && " · "}
              {project.giftDate && (
                <>
                  by{" "}
                  <span className="text-ink">
                    {new Date(project.giftDate).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </>
              )}
            </p>
          )}
        </div>
        <Link href="/projects" className="btn-ghost">
          ← All projects
        </Link>
      </header>

      <ProjectEditor project={project} />

      <ProjectAllocationEditor
        project={project}
        allYarns={yarns}
        patternWeight={patternWeight}
        requiredYardage={requiredYardage}
      />

      <ColorPreview allocated={allocated} stash={yarns} />
    </div>
  );
}
