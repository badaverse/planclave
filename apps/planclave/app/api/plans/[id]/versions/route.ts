import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import { getIdentity } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  const versions = db
    .select()
    .from(schema.planVersions)
    .where(eq(schema.planVersions.planId, id))
    .orderBy(desc(schema.planVersions.version))
    .all();

  return NextResponse.json(versions);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const identity = await getIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { content } = body;

  if (!content) {
    return NextResponse.json(
      { error: "content is required" },
      { status: 400 }
    );
  }

  const db = getDb();

  const plan = db.select().from(schema.plans).where(eq(schema.plans.id, id)).get();
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const latest = db
    .select()
    .from(schema.planVersions)
    .where(eq(schema.planVersions.planId, id))
    .orderBy(desc(schema.planVersions.version))
    .get();

  const nextVersion = (latest?.version ?? 0) + 1;
  const now = new Date(new Date().getTime());

  db.insert(schema.planVersions)
    .values({
      planId: id,
      version: nextVersion,
      content,
      submittedByEmail: identity.email,
      submittedByName: identity.name,
      createdAt: now,
    })
    .run();

  db.update(schema.plans)
    .set({ updatedAt: now })
    .where(eq(schema.plans.id, id))
    .run();

  const created = db
    .select()
    .from(schema.planVersions)
    .where(eq(schema.planVersions.planId, id))
    .orderBy(desc(schema.planVersions.version))
    .get();

  return NextResponse.json(created, { status: 201 });
}
