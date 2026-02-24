import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import * as schema from "@/lib/db/schema";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; v: string }> }
) {
  const { id, v } = await params;
  const versionNum = parseInt(v, 10);

  if (isNaN(versionNum)) {
    return NextResponse.json(
      { error: "Invalid version number" },
      { status: 400 }
    );
  }

  const db = getDb();

  const version = db
    .select()
    .from(schema.planVersions)
    .where(
      and(
        eq(schema.planVersions.planId, id),
        eq(schema.planVersions.version, versionNum)
      )
    )
    .get();

  if (!version) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  return NextResponse.json(version);
}
