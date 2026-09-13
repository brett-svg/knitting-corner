// Read side of the app. Every query is scoped to the signed-in user; with no
// DATABASE_URL the app runs on mock data so the UI can be kicked around.

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db, hasDb, schema } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { fileUrl } from "@/lib/storage";
import {
  yarns as mockYarns,
  projects as mockProjects,
  patterns as mockPatterns,
  needles as mockNeedles,
  hooks as mockHooks,
  notions as mockNotions,
  locations as mockLocations,
  type Yarn,
  type Project,
  type Pattern,
  type Needle,
  type Hook,
  type Notion,
  type StorageLocation,
  type WeightCategory,
} from "@/lib/mock";

const { yarns, projects, patterns, needles, hooks, notions, storageLocations, projectYarns } =
  schema;

type YarnRow = typeof yarns.$inferSelect;
type PatternRow = typeof patterns.$inferSelect;
type ProjectRow = typeof projects.$inferSelect;

const FALLBACK_GRADIENT = "linear-gradient(135deg,#C084FC,#60A5FA)";

async function uid(): Promise<string | null> {
  const u = await getUser();
  return u?.id ?? null;
}

const day = (d: Date | string) => new Date(d).toISOString().slice(0, 10);

function rowToYarn(r: YarnRow, locationName: string | null = null): Yarn {
  return {
    id: r.id,
    brand: r.brand ?? "",
    productLine: r.productLine ?? "",
    colorway: r.colorway ?? "",
    dyeLot: r.dyeLot ?? "",
    fiber: r.fiber ?? "",
    weight: (r.weightCategory ?? "DK") as Yarn["weight"],
    yardage: r.yardage ?? 0,
    meters: r.meters ?? 0,
    skeinGrams: r.skeinWeightGrams ?? 0,
    skeins: r.skeins ?? 1,
    storage: locationName ?? "",
    swatch: r.swatch ?? FALLBACK_GRADIENT,
    imageUrl: fileUrl(r.imageKey),
    locationId: r.storageLocationId,
    locationName,
    reserved: r.reserved ?? false,
    notes: r.notes,
    addedAt: day(r.createdAt),
  };
}

async function locationNameMap(userId: string, ids: Array<string | null>) {
  const unique = Array.from(new Set(ids.filter((id): id is string => Boolean(id))));
  const map = new Map<string, string>();
  if (!unique.length) return map;
  const rows = await db()
    .select({ id: storageLocations.id, name: storageLocations.name })
    .from(storageLocations)
    .where(and(eq(storageLocations.userId, userId), inArray(storageLocations.id, unique)));
  for (const r of rows) map.set(r.id, r.name);
  return map;
}

export async function getYarns(): Promise<Yarn[]> {
  if (!hasDb()) return mockYarns;
  const userId = await uid();
  if (!userId) return [];
  const rows = await db()
    .select()
    .from(yarns)
    .where(eq(yarns.userId, userId))
    .orderBy(desc(yarns.createdAt));
  const locations = await locationNameMap(
    userId,
    rows.map((r) => r.storageLocationId)
  );
  return rows.map((r) =>
    rowToYarn(r, r.storageLocationId ? locations.get(r.storageLocationId) ?? null : null)
  );
}

export async function getYarn(id: string): Promise<Yarn | null> {
  if (!hasDb()) return mockYarns.find((y) => y.id === id) ?? null;
  const userId = await uid();
  if (!userId) return null;
  const row = await db().query.yarns.findFirst({
    where: and(eq(yarns.id, id), eq(yarns.userId, userId)),
  });
  if (!row) return null;
  let locName: string | null = null;
  if (row.storageLocationId) {
    const map = await locationNameMap(userId, [row.storageLocationId]);
    locName = map.get(row.storageLocationId) ?? null;
  }
  return rowToYarn(row, locName);
}

// ── Projects ──────────────────────────────────────────────────────────────

type ProjectWithRels = ProjectRow & {
  pattern: { name: string; designer: string | null } | null;
  projectYarns: { yarnId: string }[];
};

function rowToProject(p: ProjectWithRels): Project {
  return {
    id: p.id,
    name: p.name,
    pattern: p.pattern?.designer ?? p.pattern?.name ?? "—",
    status: p.status as Project["status"],
    progress: Number(p.progress ?? 0),
    yarnIds: p.projectYarns.map((j) => j.yarnId),
    hero: p.hero ?? fileUrl(p.imageKey) ?? FALLBACK_GRADIENT,
    updatedAt: day(p.updatedAt),
    recipient: p.recipient,
    giftDate: p.giftDate,
    finishedAt: p.finishedAt,
  };
}

async function loadProjects(userId: string, ids?: string[]): Promise<Project[]> {
  const where = ids
    ? and(eq(projects.userId, userId), inArray(projects.id, ids))
    : eq(projects.userId, userId);
  const rows = await db().select().from(projects).where(where).orderBy(desc(projects.updatedAt));
  if (!rows.length) return [];

  const patternIds = Array.from(
    new Set(rows.map((r) => r.patternId).filter((x): x is string => Boolean(x)))
  );
  const [patternRows, linkRows] = await Promise.all([
    patternIds.length
      ? db()
          .select({ id: patterns.id, name: patterns.name, designer: patterns.designer })
          .from(patterns)
          .where(inArray(patterns.id, patternIds))
      : Promise.resolve([]),
    db()
      .select()
      .from(projectYarns)
      .where(inArray(projectYarns.projectId, rows.map((r) => r.id))),
  ]);
  const patternById = new Map(patternRows.map((p) => [p.id, p]));
  const linksByProject = new Map<string, { yarnId: string }[]>();
  for (const l of linkRows) {
    const list = linksByProject.get(l.projectId) ?? [];
    list.push({ yarnId: l.yarnId });
    linksByProject.set(l.projectId, list);
  }
  return rows.map((r) =>
    rowToProject({
      ...r,
      pattern: r.patternId ? patternById.get(r.patternId) ?? null : null,
      projectYarns: linksByProject.get(r.id) ?? [],
    })
  );
}

export async function getProjects(): Promise<Project[]> {
  if (!hasDb()) return mockProjects;
  const userId = await uid();
  if (!userId) return [];
  return loadProjects(userId);
}

export async function getProject(id: string): Promise<Project | null> {
  if (!hasDb()) return mockProjects.find((p) => p.id === id) ?? null;
  const userId = await uid();
  if (!userId) return null;
  const [p] = await loadProjects(userId, [id]);
  return p ?? null;
}

export async function getProjectsUsingYarn(yarnId: string): Promise<Project[]> {
  if (!hasDb()) return mockProjects.filter((p) => p.yarnIds.includes(yarnId));
  const userId = await uid();
  if (!userId) return [];
  const links = await db()
    .select({ projectId: projectYarns.projectId })
    .from(projectYarns)
    .where(eq(projectYarns.yarnId, yarnId));
  if (!links.length) return [];
  return loadProjects(
    userId,
    links.map((l) => l.projectId)
  );
}

// ── Patterns ──────────────────────────────────────────────────────────────

const COVERS = [
  "linear-gradient(135deg,#FFE4E6 0%,#FDBA74 55%,#C084FC 100%)",
  "linear-gradient(135deg,#FDBA74 0%,#FB7185 60%,#9F1239 100%)",
  "linear-gradient(135deg,#E9D5FF 0%,#A78BFA 55%,#60A5FA 100%)",
  "linear-gradient(135deg,#A7F3D0 0%,#5EEAD4 50%,#60A5FA 100%)",
  "linear-gradient(135deg,#FFE4E6 0%,#FBCFE8 50%,#C084FC 100%)",
];
function coverFor(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0;
  return COVERS[Math.abs(h) % COVERS.length];
}

function rowToPattern(r: PatternRow): Pattern {
  return {
    id: r.id,
    name: r.name,
    designer: r.designer,
    externalUrl: r.externalUrl,
    pdfPath: r.pdfKey,
    coverUrl: fileUrl(r.coverKey),
    yarnWeight: (r.yarnWeight ?? null) as WeightCategory | null,
    requiredYardage: r.requiredYardage,
    needleSize: r.needleSize,
    notes: r.notes,
    cover: coverFor(r.name + r.id),
    gauge: r.gauge,
    sizes: r.sizes,
    construction: r.construction,
    techniques: r.techniques,
    garmentType: r.garmentType,
    recommendedYarn: r.recommendedYarn,
    createdAt: day(r.createdAt),
  };
}

export async function getPatterns(): Promise<Pattern[]> {
  if (!hasDb()) return mockPatterns;
  const userId = await uid();
  if (!userId) return [];
  const rows = await db()
    .select()
    .from(patterns)
    .where(eq(patterns.userId, userId))
    .orderBy(desc(patterns.createdAt));
  return rows.map(rowToPattern);
}

export async function getPattern(id: string): Promise<Pattern | null> {
  if (!hasDb()) return mockPatterns.find((p) => p.id === id) ?? null;
  const userId = await uid();
  if (!userId) return null;
  const row = await db().query.patterns.findFirst({
    where: and(eq(patterns.id, id), eq(patterns.userId, userId)),
  });
  return row ? rowToPattern(row) : null;
}

// ── Tools & locations ─────────────────────────────────────────────────────

export async function getNeedles(): Promise<Needle[]> {
  if (!hasDb()) return mockNeedles;
  const userId = await uid();
  if (!userId) return [];
  const rows = await db()
    .select()
    .from(needles)
    .where(eq(needles.userId, userId))
    .orderBy(asc(needles.sizeMm));
  return rows.map((r) => ({
    id: r.id,
    sizeUs: r.sizeUs,
    sizeMm: r.sizeMm == null ? null : Number(r.sizeMm),
    type: r.type as Needle["type"],
    lengthCm: r.lengthCm,
    material: r.material,
    quantity: r.quantity ?? 1,
  }));
}

export async function getHooks(): Promise<Hook[]> {
  if (!hasDb()) return mockHooks;
  const userId = await uid();
  if (!userId) return [];
  const rows = await db()
    .select()
    .from(hooks)
    .where(eq(hooks.userId, userId))
    .orderBy(asc(hooks.sizeMm));
  return rows.map((r) => ({
    id: r.id,
    sizeUs: r.sizeUs,
    sizeMm: r.sizeMm == null ? null : Number(r.sizeMm),
    material: r.material,
    quantity: r.quantity ?? 1,
  }));
}

export async function getNotions(): Promise<Notion[]> {
  if (!hasDb()) return mockNotions;
  const userId = await uid();
  if (!userId) return [];
  const rows = await db()
    .select()
    .from(notions)
    .where(eq(notions.userId, userId))
    .orderBy(asc(notions.name));
  return rows.map((r) => ({ id: r.id, name: r.name, quantity: r.quantity ?? 1 }));
}

export async function getLocations(): Promise<StorageLocation[]> {
  if (!hasDb()) return mockLocations;
  const userId = await uid();
  if (!userId) return [];
  return db()
    .select({ id: storageLocations.id, name: storageLocations.name })
    .from(storageLocations)
    .where(eq(storageLocations.userId, userId))
    .orderBy(asc(storageLocations.name));
}

export async function getStats() {
  const [ys, ps] = await Promise.all([getYarns(), getProjects()]);
  return {
    skeins: ys.reduce((n, y) => n + y.skeins, 0),
    yardage: ys.reduce((n, y) => n + y.yardage * y.skeins, 0),
    brands: new Set(ys.map((y) => y.brand)).size,
    projects: ps.filter((p) => p.status === "Active").length,
  };
}
