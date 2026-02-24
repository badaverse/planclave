import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import * as schema from "@/lib/db/schema";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  const plan = db.select().from(schema.plans).where(eq(schema.plans.id, id)).get();
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const latestVersion = db
    .select()
    .from(schema.planVersions)
    .where(eq(schema.planVersions.planId, id))
    .orderBy(desc(schema.planVersions.version))
    .get();

  return NextResponse.json({
    ...plan,
    latestVersion: latestVersion?.version ?? 0,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { title } = body;

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const db = getDb();

  const plan = db.select().from(schema.plans).where(eq(schema.plans.id, id)).get();
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  db.update(schema.plans)
    .set({ title, updatedAt: new Date(new Date().getTime()) })
    .where(eq(schema.plans.id, id))
    .run();

  const updated = db.select().from(schema.plans).where(eq(schema.plans.id, id)).get();
  return NextResponse.json(updated);
}
