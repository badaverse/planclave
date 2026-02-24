import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import { getIdentity } from "@/lib/auth";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const identity = await getIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  // Get latest version
  const latestVersion = db
    .select()
    .from(schema.planVersions)
    .where(eq(schema.planVersions.planId, id))
    .orderBy(desc(schema.planVersions.version))
    .get();

  const latestVersionNum = latestVersion?.version ?? 0;

  // Find the reviewer record for the current user
  const reviewer = db
    .select()
    .from(schema.reviewers)
    .where(
      and(
        eq(schema.reviewers.planId, id),
        eq(schema.reviewers.version, latestVersionNum),
        eq(schema.reviewers.email, identity.email)
      )
    )
    .get();

  if (!reviewer) {
    return NextResponse.json(
      { error: "You are not a reviewer for this plan version" },
      { status: 404 }
    );
  }

  db.update(schema.reviewers)
    .set({ completedAt: new Date(new Date().getTime()) })
    .where(eq(schema.reviewers.id, reviewer.id))
    .run();

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const identity = await getIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  // Get latest version
  const latestVersion = db
    .select()
    .from(schema.planVersions)
    .where(eq(schema.planVersions.planId, id))
    .orderBy(desc(schema.planVersions.version))
    .get();

  const latestVersionNum = latestVersion?.version ?? 0;

  const reviewer = db
    .select()
    .from(schema.reviewers)
    .where(
      and(
        eq(schema.reviewers.planId, id),
        eq(schema.reviewers.version, latestVersionNum),
        eq(schema.reviewers.email, identity.email)
      )
    )
    .get();

  if (!reviewer) {
    return NextResponse.json(
      { error: "You are not a reviewer for this plan version" },
      { status: 404 }
    );
  }

  db.update(schema.reviewers)
    .set({ completedAt: null })
    .where(eq(schema.reviewers.id, reviewer.id))
    .run();

  return NextResponse.json({ ok: true });
}
