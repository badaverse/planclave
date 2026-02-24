import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import * as schema from "@/lib/db/schema";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  // Get latest version number
  const latestVersion = db
    .select()
    .from(schema.planVersions)
    .where(eq(schema.planVersions.planId, id))
    .orderBy(desc(schema.planVersions.version))
    .get();

  const latestVersionNum = latestVersion?.version ?? 0;

  const reviewerList = db
    .select()
    .from(schema.reviewers)
    .where(
      and(
        eq(schema.reviewers.planId, id),
        eq(schema.reviewers.version, latestVersionNum)
      )
    )
    .all();

  return NextResponse.json(reviewerList);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { email, name, version } = body;

  if (!email || !name || version === undefined) {
    return NextResponse.json(
      { error: "email, name, and version are required" },
      { status: 400 }
    );
  }

  const db = getDb();

  const plan = db.select().from(schema.plans).where(eq(schema.plans.id, id)).get();
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  db.insert(schema.reviewers)
    .values({
      planId: id,
      version,
      email,
      name,
    })
    .run();

  return NextResponse.json({ ok: true }, { status: 201 });
}
