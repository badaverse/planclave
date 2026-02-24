"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { parseMarkdownToBlocks, Block } from "@/lib/markdown-parser";
import BlockRenderer from "@/components/BlockRenderer";
import BlockThread from "@/components/BlockThread";
import ReviewerPanel from "@/components/ReviewerPanel";
import VersionSelector from "@/components/VersionSelector";
import IdentityDialog from "@/components/IdentityDialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

interface Thread {
  id: string;
  blockId: string;
  startLine: number;
  endLine: number;
  authorName: string;
  authorEmail: string;
  status: "open" | "resolved";
  createdAt: number;
  comments: {
    id: string;
    authorName: string;
    authorEmail: string;
    content: string;
    createdAt: number;
  }[];
}

interface Reviewer {
  id: number;
  email: string;
  name: string;
  completedAt: number | null;
}

interface Version {
  version: number;
  createdAt: number;
}

export default function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: planId } = use(params);

  const [identity, setIdentity] = useState<{
    email: string;
    name: string;
  } | null>(null);
  const [showIdentity, setShowIdentity] = useState(false);
  const [plan, setPlan] = useState<{
    id: string;
    title: string;
    projectName: string;
    planFilename: string;
    latestVersion: number;
  } | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [currentVersion, setCurrentVersion] = useState<number>(1);
  const [content, setContent] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [showReviewers, setShowReviewers] = useState(false);
  const [newThreadBlock, setNewThreadBlock] = useState<{
    blockId: string;
    startLine: number;
    endLine: number;
  } | null>(null);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);

  // Fetch identity
  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((id) => {
        if (id) setIdentity(id);
        else setShowIdentity(true);
      });
  }, []);

  // Fetch plan + versions
  useEffect(() => {
    async function load() {
      const [planRes, versionsRes] = await Promise.all([
        fetch(`/api/plans/${planId}`),
        fetch(`/api/plans/${planId}/versions`),
      ]);
      if (planRes.ok) {
        const p = await planRes.json();
        setPlan(p);
        setCurrentVersion(p.latestVersion || 1);
      }
      if (versionsRes.ok) {
        setVersions(await versionsRes.json());
      }
      setLoading(false);
    }
    load();
  }, [planId]);

  // Fetch version content + threads + reviewers when version changes
  useEffect(() => {
    if (!currentVersion) return;
    async function loadVersion() {
      const [versionRes, threadsRes, reviewersRes] = await Promise.all([
        fetch(`/api/plans/${planId}/versions/${currentVersion}`),
        fetch(`/api/plans/${planId}/threads?version=${currentVersion}`),
        fetch(`/api/plans/${planId}/reviewers`),
      ]);
      if (versionRes.ok) {
        const v = await versionRes.json();
        setContent(v.content);
        setBlocks(parseMarkdownToBlocks(v.content));
      }
      if (threadsRes.ok) {
        setThreads(await threadsRes.json());
      }
      if (reviewersRes.ok) {
        setReviewers(await reviewersRes.json());
      }
    }
    loadVersion();
  }, [planId, currentVersion]);

  // Thread actions
  const handleCreateThread = useCallback(
    (blockId: string, startLine: number, endLine: number) => {
      setNewThreadBlock({ blockId, startLine, endLine });
      setNewComment("");
    },
    []
  );

  async function submitNewThread() {
    if (!newThreadBlock || !newComment.trim()) return;
    const res = await fetch(`/api/plans/${planId}/threads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        version: currentVersion,
        blockId: newThreadBlock.blockId,
        startLine: newThreadBlock.startLine,
        endLine: newThreadBlock.endLine,
        content: newComment.trim(),
      }),
    });
    if (res.ok) {
      setNewThreadBlock(null);
      setNewComment("");
      // Refresh threads
      const threadsRes = await fetch(
        `/api/plans/${planId}/threads?version=${currentVersion}`
      );
      if (threadsRes.ok) setThreads(await threadsRes.json());
    }
  }

  async function handleAddComment(threadId: string, commentContent: string) {
    await fetch(`/api/threads/${threadId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: commentContent }),
    });
    // Refresh threads
    const res = await fetch(
      `/api/plans/${planId}/threads?version=${currentVersion}`
    );
    if (res.ok) setThreads(await res.json());
  }

  async function handleResolve(threadId: string) {
    await fetch(`/api/threads/${threadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "resolved" }),
    });
    const res = await fetch(
      `/api/plans/${planId}/threads?version=${currentVersion}`
    );
    if (res.ok) setThreads(await res.json());
  }

  async function handleReopen(threadId: string) {
    await fetch(`/api/threads/${threadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "open" }),
    });
    const res = await fetch(
      `/api/plans/${planId}/threads?version=${currentVersion}`
    );
    if (res.ok) setThreads(await res.json());
  }

  async function handleDeleteThread(threadId: string) {
    await fetch(`/api/threads/${threadId}`, { method: "DELETE" });
    const res = await fetch(
      `/api/plans/${planId}/threads?version=${currentVersion}`
    );
    if (res.ok) setThreads(await res.json());
  }

  async function handleMarkDone() {
    await fetch(`/api/plans/${planId}/reviewers/done`, { method: "POST" });
    const res = await fetch(`/api/plans/${planId}/reviewers`);
    if (res.ok) setReviewers(await res.json());
  }

  async function handleUnmarkDone() {
    await fetch(`/api/plans/${planId}/reviewers/done`, { method: "DELETE" });
    const res = await fetch(`/api/plans/${planId}/reviewers`);
    if (res.ok) setReviewers(await res.json());
  }

  // Build thread map by blockId
  const threadsByBlock: Record<string, Thread[]> = {};
  for (const t of threads) {
    if (!threadsByBlock[t.blockId]) threadsByBlock[t.blockId] = [];
    threadsByBlock[t.blockId].push(t);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-3">
          <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm text-muted-foreground font-mono tracking-wide">
            Loading...
          </span>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">플랜을 찾을 수 없습니다.</p>
          <Link href="/" className="mt-2 text-sm text-primary underline">
            목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const openThreads = threads.filter((t) => t.status === "open").length;
  const completedReviewers = reviewers.filter((r) => r.completedAt).length;

  return (
    <div className="min-h-screen">
      {/* ── Sticky glassmorphism header ── */}
      <header className="glass sticky top-0 z-10 border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          {/* Left side: back arrow + project badge + title + filename */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="flex items-center justify-center shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="목록으로 돌아가기"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className="shrink-0"
              >
                <path
                  d="M10 12L6 8L10 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {plan.projectName && (
                  <span className="inline-flex shrink-0 items-center rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] font-medium tracking-wide text-primary">
                    {plan.projectName}
                  </span>
                )}
                <h1 className="truncate font-display font-semibold text-foreground">
                  {plan.title}
                </h1>
              </div>
              {plan.planFilename && (
                <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground/50 tracking-wide">
                  {plan.planFilename}
                </p>
              )}
            </div>
          </div>

          {/* Right side: thread count + version selector + reviewer button */}
          <div className="flex items-center gap-3 shrink-0">
            {threads.length > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                    openThreads > 0 ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                />
                <span className="font-mono text-xs tabular-nums">
                  {threads.length}
                </span>
              </div>
            )}

            <VersionSelector
              versions={versions.map((v) => ({
                version: v.version,
                createdAt: v.createdAt,
              }))}
              currentVersion={currentVersion}
              onSelectVersion={setCurrentVersion}
            />

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReviewers(true)}
              className="font-mono text-xs tabular-nums"
            >
              리뷰어
              <span className="ml-1.5 text-primary">
                {completedReviewers}/{reviewers.length}
              </span>
            </Button>
          </div>
        </div>

        {/* Decorative separator with amber dot ornament */}
        <div className="relative">
          <Separator className="bg-border" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary/60" />
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <div className="mx-auto max-w-5xl px-6 py-6">
        <BlockRenderer
          blocks={blocks}
          threads={threads.map((t) => ({
            id: t.id,
            blockId: t.blockId,
            status: t.status,
          }))}
          onCreateThread={handleCreateThread}
        >
          {(blockId: string) => (
            <>
              {/* New thread form for this block */}
              {newThreadBlock?.blockId === blockId && (
                <div className="my-2 ml-16 rounded-lg border-l-2 border-primary bg-card/80 p-3 shadow-lg shadow-black/20">
                  <Textarea
                    placeholder="댓글을 입력하세요..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        submitNewThread();
                      }
                    }}
                    className="min-h-[80px] border-border/50 bg-background/50"
                    autoFocus
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground/40 font-mono">
                      Cmd+Enter to submit
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setNewThreadBlock(null)}
                      >
                        취소
                      </Button>
                      <Button
                        size="sm"
                        onClick={submitNewThread}
                        disabled={!newComment.trim()}
                      >
                        제출
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Existing threads for this block */}
              {threadsByBlock[blockId]?.map((thread) => (
                <div key={thread.id} className="ml-16">
                  <BlockThread
                    thread={thread}
                    onAddComment={handleAddComment}
                    onResolve={handleResolve}
                    onReopen={handleReopen}
                    onDelete={handleDeleteThread}
                  />
                </div>
              ))}
            </>
          )}
        </BlockRenderer>
      </div>

      {/* ── Reviewer Panel ── */}
      <ReviewerPanel
        open={showReviewers}
        onOpenChange={setShowReviewers}
        reviewers={reviewers.map((r) => ({
          email: r.email,
          name: r.name,
          status: (r.completedAt ? "completed" : "pending") as
            | "completed"
            | "pending",
          completedAt: r.completedAt ?? undefined,
        }))}
        currentUserEmail={identity?.email || ""}
        onMarkDone={handleMarkDone}
        onUnmarkDone={handleUnmarkDone}
      />

      {/* ── Identity Dialog ── */}
      <IdentityDialog
        open={showIdentity}
        onIdentitySet={(id: { email: string; name: string }) => {
          setIdentity(id);
          setShowIdentity(false);
        }}
      />
    </div>
  );
}
