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

  // Get plan
  const plan = db.select().from(schema.plans).where(eq(schema.plans.id, id)).get();
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  // Get latest version
  const latestVersion = db
    .select()
    .from(schema.planVersions)
    .where(eq(schema.planVersions.planId, id))
    .orderBy(desc(schema.planVersions.version))
    .get();

  const latestVersionNum = latestVersion?.version ?? 0;
  const latestContent = latestVersion?.content ?? "";

  // Get reviewers for latest version
  const allReviewers = db
    .select()
    .from(schema.reviewers)
    .where(
      and(
        eq(schema.reviewers.planId, id),
        eq(schema.reviewers.version, latestVersionNum)
      )
    )
    .all();

  const completedReviewers = allReviewers.filter((r) => r.completedAt !== null);
  const incompleteReviewers = allReviewers.filter((r) => r.completedAt === null);
  const completedNames = completedReviewers.map((r) => r.name).join(", ");
  const incompleteNames = incompleteReviewers.map((r) => r.name).join(", ");

  // Get all threads for this plan
  const threads = db
    .select()
    .from(schema.blockThreads)
    .where(eq(schema.blockThreads.planId, id))
    .orderBy(schema.blockThreads.startLine)
    .all();

  const openThreads = threads.filter((t) => t.status === "open");
  const resolvedThreads = threads.filter((t) => t.status === "resolved");

  // Build block comments section
  const blockCommentSections: string[] = [];

  for (const thread of threads) {
    const comments = db
      .select()
      .from(schema.blockComments)
      .where(eq(schema.blockComments.threadId, thread.id))
      .orderBy(schema.blockComments.createdAt)
      .all();

    if (comments.length === 0) continue;

    // Extract block content from the plan content for context
    const lines = latestContent.split("\n");
    const blockLines = lines.slice(
      Math.max(0, thread.startLine - 1),
      Math.min(lines.length, thread.endLine)
    );
    const blockSnippet = blockLines.join("\n").substring(0, 60);

    let section = `### L${thread.startLine}-L${thread.endLine}: "${blockSnippet}"\n`;

    const firstComment = comments[0];
    section += `\n**${firstComment.authorName}** [${thread.status}]: ${firstComment.content}`;

    for (let i = 1; i < comments.length; i++) {
      section += `\n  > **${comments[i].authorName}**: ${comments[i].content}`;
    }

    blockCommentSections.push(section);
  }

  // Assemble full export
  const output = `# Planclave Review: ${plan.title}

Plan ID: ${id}
버전: ${latestVersionNum}
리뷰 완료: ${completedReviewers.length}/${allReviewers.length} (${completedNames}; 미완료: ${incompleteNames})
미해결 스레드: ${openThreads.length}개

## 블록 코멘트

${blockCommentSections.join("\n\n")}

## 요약
${openThreads.length}개 미해결, ${resolvedThreads.length}개 해결됨.
`;

  return new NextResponse(output, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
