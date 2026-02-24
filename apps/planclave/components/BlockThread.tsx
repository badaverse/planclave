"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Comment {
  id: string;
  authorName: string;
  content: string;
  createdAt: number;
}

interface Thread {
  id: string;
  blockId: string;
  startLine: number;
  endLine: number;
  authorName: string;
  status: "open" | "resolved";
  comments: Comment[];
}

interface BlockThreadProps {
  thread: Thread;
  onAddComment: (threadId: string, content: string) => void;
  onResolve: (threadId: string) => void;
  onReopen: (threadId: string) => void;
  onDelete: (threadId: string) => void;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function BlockThread({
  thread,
  onAddComment,
  onResolve,
  onReopen,
  onDelete,
}: BlockThreadProps) {
  const [expanded, setExpanded] = useState(true);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitReply = async () => {
    const trimmed = replyContent.trim();
    if (!trimmed) return;
    setIsSubmitting(true);
    try {
      onAddComment(thread.id, trimmed);
      setReplyContent("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmitReply();
    }
  };

  const isOpen = thread.status === "open";
  const lineLabel =
    thread.startLine === thread.endLine
      ? `L${thread.startLine}`
      : `L${thread.startLine}-${thread.endLine}`;

  return (
    <div
      className={cn(
        "ml-[60px] mb-2 overflow-hidden rounded-lg bg-card shadow-sm",
        "border-l-2",
        isOpen ? "border-l-primary/60" : "border-l-emerald-500/60"
      )}
    >
      {/* Thread header -- clickable to toggle collapse */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-accent"
      >
        {/* Expand/collapse chevron with smooth rotation */}
        <svg
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ease-in-out",
            expanded && "rotate-90"
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 5l7 7-7 7"
          />
        </svg>

        {/* Author avatar circle -- amber-tinted */}
        <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
          {getInitials(thread.authorName)}
        </span>

        <span className="text-sm font-medium text-foreground">
          {thread.authorName}
        </span>

        <span className="text-xs text-muted-foreground">{lineLabel}</span>

        {/* Status badge */}
        <Badge
          variant="outline"
          className={cn(
            "ml-auto text-[10px] font-medium",
            isOpen
              ? "border-primary/50 text-primary"
              : "border-emerald-500/50 text-emerald-500"
          )}
        >
          {isOpen ? "open" : "resolved"}
        </Badge>

        {/* Comment count with speech bubble icon */}
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <svg
            className="size-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          {thread.comments.length}
        </span>
      </button>

      {/* Expanded content with slide-like transition */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-200 ease-in-out",
          expanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="border-t border-border/40">
          {/* Comments list */}
          <div className="space-y-0">
            {thread.comments.map((comment) => (
              <div key={comment.id} className="px-3 py-3">
                <div className="ml-4 border-l-2 border-border pl-3">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-medium text-primary/80">
                      {getInitials(comment.authorName)}
                    </span>
                    <span className="text-xs font-bold text-primary/90">
                      {comment.authorName}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground/50">
                      {formatTime(comment.createdAt)}
                    </span>
                  </div>
                  <p className="pl-7 text-sm leading-relaxed text-foreground/90">
                    {comment.content}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Reply form area */}
          <div className="border-t border-border/40 bg-secondary/50 px-3 py-3">
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Reply... (Cmd+Enter to submit)"
              className="min-h-[60px] resize-none border-border/50 bg-background text-sm focus:ring-primary/50"
              rows={2}
            />
            <div className="mt-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {isOpen ? (
                  <Button
                    variant="outline"
                    size="xs"
                    className="border-border/60 hover:border-primary/50 hover:text-primary"
                    onClick={() => onResolve(thread.id)}
                  >
                    Resolve
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="xs"
                    className="border-border/60 hover:border-primary/50 hover:text-primary"
                    onClick={() => onReopen(thread.id)}
                  >
                    Reopen
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="xs"
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onDelete(thread.id)}
                >
                  Delete
                </Button>
              </div>
              <Button
                size="xs"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleSubmitReply}
                disabled={!replyContent.trim() || isSubmitting}
              >
                Reply
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
