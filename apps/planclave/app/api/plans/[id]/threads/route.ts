import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import { getIdentity } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  const versionParam = request.nextUrl.searchParams.get("version");

  const condition = versionParam
    ? and(
        eq(schema.blockThreads.planId, id),
        eq(schema.blockThreads.version, parseInt(versionParam, 10))
      )
    : eq(schema.blockThreads.planId, id);

  const threads = db
    .select()
    .from(schema.blockThreads)
    .where(condition)
    .all();

  // Attach comments to each thread
  const threadsWithComments = threads.map((thread) => {
    const comments = db
      .select()
      .from(schema.blockComments)
      .where(eq(schema.blockComments.threadId, thread.id))
      .all();
    return { ...thread, comments };
  });

  return NextResponse.json(threadsWithComments);
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
  const { version, blockId, startLine, endLine, content } = body;

  if (!version || !blockId || startLine === undefined || endLine === undefined || !content) {
    return NextResponse.json(
      { error: "version, blockId, startLine, endLine, and content are required" },
      { status: 400 }
    );
  }

  const db = getDb();

  const plan = db.select().from(schema.plans).where(eq(schema.plans.id, id)).get();
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const threadId = crypto.randomUUID();
  const commentId = crypto.randomUUID();
  const now = new Date(new Date().getTime());

  db.insert(schema.blockThreads)
    .values({
      id: threadId,
      planId: id,
      version,
      blockId,
      startLine,
      endLine,
      authorEmail: identity.email,
      authorName: identity.name,
      status: "open",
      createdAt: now,
    })
    .run();

  db.insert(schema.blockComments)
    .values({
      id: commentId,
      threadId,
      authorEmail: identity.email,
      authorName: identity.name,
      content,
      createdAt: now,
    })
    .run();

  const thread = db
    .select()
    .from(schema.blockThreads)
    .where(eq(schema.blockThreads.id, threadId))
    .get();

  const comments = db
    .select()
    .from(schema.blockComments)
    .where(eq(schema.blockComments.threadId, threadId))
    .all();

  return NextResponse.json({ ...thread, comments }, { status: 201 });
}
