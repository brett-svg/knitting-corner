// Inventory sessions: capture items on the phone, extract in the background,
// review and commit on the laptop. Nothing reaches `yarns` until commit.

import { and, asc, desc, eq, inArray, max, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { fileUrl, getObject, hasStorage, objectKey, putObject } from "@/lib/storage";
import { decodeDataUrl, extractLabel, type ImageInput } from "@/lib/scan-label";
import { sameYarn } from "@/lib/dedupe";
import { gradientFromHex, pickSwatch } from "@/lib/swatch";
import type { RavelryMatch, YarnLabel } from "@/lib/yarn-label";

const { scanSessions, scanItems, yarns, storageLocations } = schema;

export type ItemStatus =
  | "captured"
  | "extracting"
  | "extracted"
  | "failed"
  | "accepted"
  | "discarded"
  | "committed";

export type SessionItemDto = {
  id: string;
  seq: number;
  status: ItemStatus;
  imageUrls: string[];
  label: YarnLabel | null;
  raw: YarnLabel | null;
  ravelry: RavelryMatch | null;
  skeins: number;
  match: {
    id: string;
    brand: string | null;
    productLine: string | null;
    colorway: string | null;
    dyeLot: string | null;
    skeins: number;
  } | null;
  mergeIntoMatch: boolean;
  locationId: string | null;
  notes: string | null;
  error: string | null;
  committedYarnId: string | null;
  updatedAt: string;
};

export type SessionDto = {
  id: string;
  name: string;
  status: "open" | "committed";
  defaultLocationId: string | null;
  defaultLocationName: string | null;
  createdAt: string;
  updatedAt: string;
  counts: Record<ItemStatus, number> & { total: number; skeins: number };
};

// ── Images ────────────────────────────────────────────────────────────────

// Store captured photos. With a bucket: object keys. Without: the data URLs
// themselves (fine for local dev; keeps the flow testable).
export async function storeImages(userId: string, dataUrls: string[]): Promise<string[]> {
  const keys: string[] = [];
  for (const url of dataUrls) {
    const decoded = decodeDataUrl(url);
    if (!decoded) continue;
    if (!hasStorage()) {
      keys.push(url);
      continue;
    }
    const ext = decoded.mediaType.split("/")[1].replace("jpeg", "jpg");
    const key = objectKey("yarn-photos", userId, ext);
    await putObject(key, Buffer.from(decoded.data, "base64"), decoded.mediaType);
    keys.push(key);
  }
  return keys;
}

async function loadImages(keys: string[]): Promise<ImageInput[]> {
  const out: ImageInput[] = [];
  for (const key of keys) {
    if (key.startsWith("data:")) {
      const d = decodeDataUrl(key);
      if (d) out.push(d);
      continue;
    }
    const obj = await getObject(key);
    if (!obj) continue;
    const mediaType = obj.contentType.startsWith("image/") ? obj.contentType : "image/jpeg";
    out.push({ mediaType: mediaType as ImageInput["mediaType"], data: obj.body.toString("base64") });
  }
  return out;
}

function imageUrl(key: string): string {
  return key.startsWith("data:") ? key : (fileUrl(key) as string);
}

// ── Extraction (runs after the capture response is sent) ─────────────────

export async function runExtraction(itemId: string, userId: string): Promise<void> {
  const item = await db().query.scanItems.findFirst({
    where: and(eq(scanItems.id, itemId), eq(scanItems.userId, userId)),
  });
  if (!item) return;
  await db()
    .update(scanItems)
    .set({ status: "extracting", error: null, updatedAt: new Date() })
    .where(eq(scanItems.id, itemId));

  try {
    const images = await loadImages(item.imageKeys);
    const result = await extractLabel(images);
    const match = await findDuplicate(userId, result.label);
    await db()
      .update(scanItems)
      .set({
        status: "extracted",
        label: result.label,
        raw: result.raw,
        ravelry: {
          yarn: result.ravelry.yarn
            ? {
                id: result.ravelry.yarn.id,
                name: result.ravelry.yarn.name,
                company: result.ravelry.yarn.company,
                url: result.ravelry.yarn.url,
              }
            : null,
          matchedBy: result.ravelry.matchedBy,
          candidates: result.ravelry.candidates,
          overrides: result.ravelry.overrides,
        },
        matchedYarnId: match?.id ?? null,
        updatedAt: new Date(),
      })
      .where(eq(scanItems.id, itemId));
  } catch (err) {
    await db()
      .update(scanItems)
      .set({
        status: "failed",
        error: err instanceof Error ? err.message : "extraction failed",
        updatedAt: new Date(),
      })
      .where(eq(scanItems.id, itemId));
  }
}

async function findDuplicate(userId: string, label: YarnLabel) {
  if (!label.brand || !label.colorway) return null;
  const existing = await db()
    .select({
      id: yarns.id,
      brand: yarns.brand,
      colorway: yarns.colorway,
      dyeLot: yarns.dyeLot,
    })
    .from(yarns)
    .where(eq(yarns.userId, userId));
  return (
    existing.find((e) =>
      sameYarn(
        { brand: e.brand, colorway: e.colorway, dye_lot: e.dyeLot },
        { brand: label.brand, colorway: label.colorway, dye_lot: label.dye_lot }
      )
    ) ?? null
  );
}

// ── Reads ─────────────────────────────────────────────────────────────────

type SessionRow = typeof scanSessions.$inferSelect;
type ItemRow = typeof scanItems.$inferSelect;

const EMPTY_COUNTS = (): SessionDto["counts"] => ({
  captured: 0,
  extracting: 0,
  extracted: 0,
  failed: 0,
  accepted: 0,
  discarded: 0,
  committed: 0,
  total: 0,
  skeins: 0,
});

function sessionDto(
  s: SessionRow,
  items: Pick<ItemRow, "status" | "skeins">[],
  locationName: string | null
): SessionDto {
  const counts = EMPTY_COUNTS();
  for (const it of items) {
    counts[it.status as ItemStatus]++;
    counts.total++;
    if (it.status !== "discarded") counts.skeins += it.skeins;
  }
  return {
    id: s.id,
    name: s.name,
    status: s.status as SessionDto["status"],
    defaultLocationId: s.defaultLocationId,
    defaultLocationName: locationName,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    counts,
  };
}

export async function listSessions(userId: string): Promise<SessionDto[]> {
  const rows = await db()
    .select()
    .from(scanSessions)
    .where(eq(scanSessions.userId, userId))
    .orderBy(desc(scanSessions.updatedAt));
  if (!rows.length) return [];
  const items = await db()
    .select({ sessionId: scanItems.sessionId, status: scanItems.status, skeins: scanItems.skeins })
    .from(scanItems)
    .where(inArray(scanItems.sessionId, rows.map((r) => r.id)));
  const locs = await locationNames(userId, rows.map((r) => r.defaultLocationId));
  return rows.map((s) =>
    sessionDto(
      s,
      items.filter((i) => i.sessionId === s.id),
      s.defaultLocationId ? locs.get(s.defaultLocationId) ?? null : null
    )
  );
}

async function locationNames(userId: string, ids: Array<string | null>) {
  const unique = Array.from(new Set(ids.filter((x): x is string => !!x)));
  const map = new Map<string, string>();
  if (!unique.length) return map;
  const rows = await db()
    .select({ id: storageLocations.id, name: storageLocations.name })
    .from(storageLocations)
    .where(and(eq(storageLocations.userId, userId), inArray(storageLocations.id, unique)));
  for (const r of rows) map.set(r.id, r.name);
  return map;
}

export async function getSession(
  userId: string,
  id: string
): Promise<{ session: SessionDto; items: SessionItemDto[] } | null> {
  const s = await db().query.scanSessions.findFirst({
    where: and(eq(scanSessions.id, id), eq(scanSessions.userId, userId)),
  });
  if (!s) return null;
  const rows = await db()
    .select()
    .from(scanItems)
    .where(eq(scanItems.sessionId, id))
    .orderBy(asc(scanItems.seq));

  const matchIds = rows.map((r) => r.matchedYarnId).filter((x): x is string => !!x);
  const matches = matchIds.length
    ? await db()
        .select({
          id: yarns.id,
          brand: yarns.brand,
          productLine: yarns.productLine,
          colorway: yarns.colorway,
          dyeLot: yarns.dyeLot,
          skeins: yarns.skeins,
        })
        .from(yarns)
        .where(and(eq(yarns.userId, userId), inArray(yarns.id, matchIds)))
    : [];
  const matchById = new Map(matches.map((m) => [m.id, m]));
  const locs = await locationNames(userId, [s.defaultLocationId]);

  const items: SessionItemDto[] = rows.map((r) => ({
    id: r.id,
    seq: r.seq,
    status: r.status as ItemStatus,
    imageUrls: r.imageKeys.map(imageUrl),
    label: r.label,
    raw: r.raw,
    ravelry: r.ravelry as RavelryMatch | null,
    skeins: r.skeins,
    match: r.matchedYarnId ? matchById.get(r.matchedYarnId) ?? null : null,
    mergeIntoMatch: r.mergeIntoMatch,
    locationId: r.locationId,
    notes: r.notes,
    error: r.error,
    committedYarnId: r.committedYarnId,
    updatedAt: r.updatedAt.toISOString(),
  }));

  return {
    session: sessionDto(s, rows, s.defaultLocationId ? locs.get(s.defaultLocationId) ?? null : null),
    items,
  };
}

export async function ownedSession(userId: string, id: string) {
  return db().query.scanSessions.findFirst({
    where: and(eq(scanSessions.id, id), eq(scanSessions.userId, userId)),
  });
}

export async function nextSeq(sessionId: string): Promise<number> {
  const [row] = await db()
    .select({ m: max(scanItems.seq) })
    .from(scanItems)
    .where(eq(scanItems.sessionId, sessionId));
  return (row?.m ?? 0) + 1;
}

export async function touchSession(id: string) {
  await db().update(scanSessions).set({ updatedAt: new Date() }).where(eq(scanSessions.id, id));
}

// ── Commit ────────────────────────────────────────────────────────────────

export async function commitSession(
  userId: string,
  id: string
): Promise<{ inserted: number; merged: number; skipped: number }> {
  const s = await ownedSession(userId, id);
  if (!s) throw new Error("Session not found");

  const items = await db()
    .select()
    .from(scanItems)
    .where(and(eq(scanItems.sessionId, id), eq(scanItems.status, "accepted")))
    .orderBy(asc(scanItems.seq));

  let inserted = 0;
  let merged = 0;
  let skipped = 0;

  await db().transaction(async (tx) => {
    for (const it of items) {
      const label = it.label;
      if (!label) {
        skipped++;
        continue;
      }
      let yarnId: string;
      if (it.matchedYarnId && it.mergeIntoMatch) {
        const [row] = await tx
          .update(yarns)
          .set({ skeins: sql`${yarns.skeins} + ${it.skeins}` })
          .where(and(eq(yarns.id, it.matchedYarnId), eq(yarns.userId, userId)))
          .returning({ id: yarns.id });
        if (!row) {
          skipped++;
          continue;
        }
        yarnId = row.id;
        merged++;
      } else {
        const firstKey = it.imageKeys.find((k) => !k.startsWith("data:")) ?? null;
        const [row] = await tx
          .insert(yarns)
          .values({
            userId,
            brand: label.brand,
            productLine: label.product_line,
            fiber: label.fiber,
            weightCategory: label.weight_category,
            yardage: label.yardage,
            meters: label.meters,
            skeinWeightGrams: label.skein_weight_grams,
            colorway: label.colorway,
            dyeLot: label.dye_lot,
            needleSize: label.needle_size,
            skeins: it.skeins,
            swatch: gradientFromHex(label.swatch_hex ?? "") || pickSwatch(label.colorway),
            imageKey: firstKey,
            storageLocationId: it.locationId ?? s.defaultLocationId ?? null,
            notes: it.notes,
            ravelryYarnId: it.ravelry?.yarn?.id ?? null,
          })
          .returning({ id: yarns.id });
        yarnId = row.id;
        inserted++;
      }
      await tx
        .update(scanItems)
        .set({ status: "committed", committedYarnId: yarnId, updatedAt: new Date() })
        .where(eq(scanItems.id, it.id));
    }

    // Close the session if nothing reviewable is left.
    const [remaining] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(scanItems)
      .where(
        and(
          eq(scanItems.sessionId, id),
          inArray(scanItems.status, ["captured", "extracting", "extracted", "failed", "accepted"])
        )
      );
    await tx
      .update(scanSessions)
      .set({ status: remaining.n === 0 ? "committed" : "open", updatedAt: new Date() })
      .where(eq(scanSessions.id, id));
  });

  return { inserted, merged, skipped };
}
