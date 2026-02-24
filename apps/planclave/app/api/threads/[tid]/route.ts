import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { eq } from "drizzle-orm";
import * as schema from "@/lib/db/schema";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tid: string }> }
) {
  const { tid } = await params;
  const body = await request.json();
  const { status } = body;

  if (!status || !["open", "resolved"].includes(status)) {
    return NextResponse.json(
      { error: "status must be 'open' or 'resolved'" },
      { status: 400 }
    );
  }

  const db = getDb();

  const thread = db
    .select()
    .from(schema.blockThreads)
    .where(eq(schema.blockThreads.id, tid))
    .get();

  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  db.update(schema.blockThreads)
    .set({ status })
    .where(eq(schema.blockThreads.id, tid))
    .run();

  const updated = db
    .select()
    .from(schema.blockThreads)
    .where(eq(schema.blockThreads.id, tid))
    .get();

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ tid: string }> }
) {
  const { tid } = await params;
  const db = getDb();

  const thread = db
    .select()
    .from(schema.blockThreads)
    .where(eq(schema.blockThreads.id, tid))
    .get();

  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  // Comments will be cascade-deleted due to foreign key
  db.delete(schema.blockThreads)
    .where(eq(schema.blockThreads.id, tid))
    .run();

  return NextResponse.json({ ok: true });
}
