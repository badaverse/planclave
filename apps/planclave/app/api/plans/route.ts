import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { desc, eq } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import { getIdentity } from "@/lib/auth";

export async function GET() {
  const db = getDb();
  const allPlans = db
    .select()
    .from(schema.plans)
    .orderBy(desc(schema.plans.updatedAt))
    .all();

  return NextResponse.json(allPlans);
}

export async function POST(request: NextRequest) {
  const identity = await getIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, title, content, projectName, planFilename } = body;

  if (!id || !title || !content) {
    return NextResponse.json(
      { error: "id, title, and content are required" },
      { status: 400 }
    );
  }

  const db = getDb();
  const now = new Date(new Date().getTime());

  db.insert(schema.plans)
    .values({
      id,
      title,
      projectName: projectName || "",
      planFilename: planFilename || "",
      createdByEmail: identity.email,
      createdByName: identity.name,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  db.insert(schema.planVersions)
    .values({
      planId: id,
      version: 1,
      content,
      submittedByEmail: identity.email,
      submittedByName: identity.name,
      createdAt: now,
    })
    .run();

  const plan = db.select().from(schema.plans).where(
    eq(schema.plans.id, id)
  ).get();

  return NextResponse.json(plan, { status: 201 });
}
