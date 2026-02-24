import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { eq } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import { getIdentity } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tid: string }> }
) {
  const { tid } = await params;
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

  const thread = db
    .select()
    .from(schema.blockThreads)
    .where(eq(schema.blockThreads.id, tid))
    .get();

  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  const commentId = crypto.randomUUID();
  const now = new Date(new Date().getTime());

  db.insert(schema.blockComments)
    .values({
      id: commentId,
      threadId: tid,
      authorEmail: identity.email,
      authorName: identity.name,
      content,
      createdAt: now,
    })
    .run();

  const comment = db
    .select()
    .from(schema.blockComments)
    .where(eq(schema.blockComments.id, commentId))
    .get();

  return NextResponse.json(comment, { status: 201 });
}
