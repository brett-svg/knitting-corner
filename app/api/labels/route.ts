import { NextResponse } from "next/server";
import { eq, inArray, and, asc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireUser, serverError } from "@/lib/api";
import { generateLabelsPdf, type BoxLabel } from "@/lib/labels";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { user, fail } = await requireUser();
  if (fail) return fail;

  const { locationIds } = (await req.json()) as { locationIds?: string[] };
  if (!locationIds?.length) {
    return NextResponse.json({ error: "No locations selected" }, { status: 400 });
  }

  try {
    const locations = await db()
      .select({ id: schema.storageLocations.id, name: schema.storageLocations.name })
      .from(schema.storageLocations)
      .where(
        and(
          eq(schema.storageLocations.userId, user.id),
          inArray(schema.storageLocations.id, locationIds)
        )
      )
      .orderBy(asc(schema.storageLocations.name));

    if (!locations.length) {
      return NextResponse.json({ error: "No matching locations" }, { status: 404 });
    }

    const yarnRows = await db()
      .select({
        brand: schema.yarns.brand,
        productLine: schema.yarns.productLine,
        colorway: schema.yarns.colorway,
        weightCategory: schema.yarns.weightCategory,
        skeins: schema.yarns.skeins,
        storageLocationId: schema.yarns.storageLocationId,
      })
      .from(schema.yarns)
      .where(
        and(
          eq(schema.yarns.userId, user.id),
          inArray(schema.yarns.storageLocationId, locationIds)
        )
      );

    const byLocation = new Map<string, BoxLabel["yarns"]>();
    for (const y of yarnRows) {
      if (!y.storageLocationId) continue;
      const list = byLocation.get(y.storageLocationId) ?? [];
      list.push({
        brand: y.brand ?? "",
        productLine: y.productLine ?? "",
        colorway: y.colorway ?? "",
        weight: y.weightCategory ?? "",
        skeins: y.skeins ?? 1,
      });
      byLocation.set(y.storageLocationId, list);
    }

    const boxes: BoxLabel[] = locations.map((loc) => ({
      name: loc.name,
      yarns: byLocation.get(loc.id) ?? [],
    }));

    const pdfBytes = await generateLabelsPdf(boxes);

    return new Response(new Uint8Array(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="yarn-labels.pdf"`,
      },
    });
  } catch (err) {
    return serverError(err);
  }
}
