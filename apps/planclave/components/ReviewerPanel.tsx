"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Reviewer {
  email: string;
  name: string;
  status: "completed" | "pending";
  completedAt?: number;
}

interface ReviewerPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewers: Reviewer[];
  currentUserEmail: string;
  onMarkDone: () => void;
  onUnmarkDone: () => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatCompletedAt(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ReviewerPanel({
  open,
  onOpenChange,
  reviewers,
  currentUserEmail,
  onMarkDone,
  onUnmarkDone,
}: ReviewerPanelProps) {
  const completedCount = reviewers.filter(
    (r) => r.status === "completed"
  ).length;
  const totalCount = reviewers.length;
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const currentReviewer = reviewers.find((r) => r.email === currentUserEmail);
  const isCurrentUserDone = currentReviewer?.status === "completed";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[340px] sm:max-w-[340px]">
        <SheetHeader>
          <SheetTitle>Reviewers</SheetTitle>
          <SheetDescription>
            {completedCount}/{totalCount} completed
          </SheetDescription>
        </SheetHeader>

        {/* Progress bar */}
        <div className="px-4">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Reviewer list */}
        <div className="flex-1 overflow-y-auto px-4">
          <div className="space-y-1">
            {reviewers.map((reviewer) => {
              const isCompleted = reviewer.status === "completed";
              const isCurrent = reviewer.email === currentUserEmail;

              return (
                <div
                  key={reviewer.email}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-2 py-2 transition-colors",
                    isCurrent && "bg-muted/50"
                  )}
                >
                  <Avatar size="sm">
                    <AvatarFallback className="text-[10px]">
                      {getInitials(reviewer.name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-foreground">
                        {reviewer.name}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] text-muted-foreground">
                          (you)
                        </span>
                      )}
                    </div>
                    {isCompleted && reviewer.completedAt && (
                      <p className="text-[10px] text-muted-foreground">
                        {formatCompletedAt(reviewer.completedAt)}
                      </p>
                    )}
                  </div>

                  {/* Status indicator */}
                  <div className="shrink-0">
                    {isCompleted ? (
                      <span className="inline-flex size-5 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <svg
                          className="size-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </span>
                    ) : (
                      <span className="inline-flex size-5 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <span className="size-2 rounded-full bg-muted-foreground/40" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action button for current user */}
        {currentReviewer && (
          <div className="border-t px-4 py-3">
            {isCurrentUserDone ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={onUnmarkDone}
              >
                Review undone
              </Button>
            ) : (
              <Button className="w-full" onClick={onMarkDone}>
                Review done
              </Button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
