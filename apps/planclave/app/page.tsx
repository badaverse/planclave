"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import IdentityDialog from "@/components/IdentityDialog";

interface Plan {
  id: string;
  title: string;
  projectName: string;
  planFilename: string;
  createdByName: string;
  createdAt: number;
  updatedAt: number;
  latestVersion?: number;
  openThreadCount?: number;
}

function relativeTime(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}

export default function Home() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [identity, setIdentity] = useState<{
    email: string;
    name: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showIdentity, setShowIdentity] = useState(false);

  useEffect(() => {
    async function init() {
      // Check identity
      const meRes = await fetch("/api/me");
      if (meRes.ok) {
        setIdentity(await meRes.json());
      } else {
        setShowIdentity(true);
      }

      // Fetch plans
      const plansRes = await fetch("/api/plans");
      if (plansRes.ok) {
        setPlans(await plansRes.json());
      }
      setLoading(false);
    }
    init();
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16 font-body">
      {/* ── Top bar: user identity pill ── */}
      {identity && (
        <div className="fixed top-5 right-6 z-50">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: "oklch(0.82 0.155 75)" }}
            />
            {identity.name}
          </span>
        </div>
      )}

      {/* ── Hero header ── */}
      <header className="mb-14">
        <h1
          className="font-display text-4xl font-bold tracking-tight"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.82 0.155 75), oklch(0.72 0.12 60), oklch(0.85 0.14 85))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Planclave
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Async plan review for engineering teams
        </p>

        {/* Decorative separator with diamond ornament */}
        <div className="relative mt-6 flex items-center">
          <Separator className="flex-1 opacity-40" />
          <span
            className="mx-3 inline-block h-1.5 w-1.5 rotate-45"
            style={{ background: "oklch(0.82 0.155 75 / 60%)" }}
          />
          <Separator className="flex-1 opacity-40" />
        </div>
      </header>

      {/* ── Content area ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32">
          <div
            className="h-5 w-5 animate-spin rounded-full border-2 border-transparent"
            style={{
              borderTopColor: "oklch(0.82 0.155 75)",
              borderRightColor: "oklch(0.82 0.155 75 / 30%)",
            }}
          />
          <p className="mt-4 text-sm text-muted-foreground">Loading plans...</p>
        </div>
      ) : plans.length === 0 ? (
        /* ── Empty state ── */
        <div className="relative rounded-xl border border-dashed border-border/60 px-8 py-16">
          {/* Corner ornaments */}
          <div
            className="absolute top-3 left-3 h-3 w-3 border-t border-l"
            style={{ borderColor: "oklch(0.82 0.155 75 / 30%)" }}
          />
          <div
            className="absolute top-3 right-3 h-3 w-3 border-t border-r"
            style={{ borderColor: "oklch(0.82 0.155 75 / 30%)" }}
          />
          <div
            className="absolute bottom-3 left-3 h-3 w-3 border-b border-l"
            style={{ borderColor: "oklch(0.82 0.155 75 / 30%)" }}
          />
          <div
            className="absolute bottom-3 right-3 h-3 w-3 border-b border-r"
            style={{ borderColor: "oklch(0.82 0.155 75 / 30%)" }}
          />

          <div className="text-center">
            <div
              className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-lg"
              style={{ background: "oklch(0.82 0.155 75 / 8%)" }}
            >
              <svg
                className="h-6 w-6"
                style={{ color: "oklch(0.82 0.155 75 / 60%)" }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                />
              </svg>
            </div>

            <p className="text-base font-medium text-foreground/80">
              No plans yet
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Submit your first plan from Claude Code
            </p>

            <div className="mx-auto mt-6 max-w-xs">
              <div
                className="rounded-lg border px-4 py-3 text-left font-mono text-sm"
                style={{
                  background: "oklch(0.13 0.01 260)",
                  borderColor: "oklch(0.82 0.155 75 / 15%)",
                }}
              >
                <span className="text-muted-foreground select-none">$ </span>
                <span style={{ color: "oklch(0.82 0.155 75)" }}>
                  /planclave-submit
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── Plan cards list ── */
        <div className="space-y-3">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {plans.length} {plans.length === 1 ? "plan" : "plans"}
            </p>
          </div>

          {plans.map((plan, index) => (
            <Link
              key={plan.id}
              href={`/plans/${plan.id}`}
              className="block"
            >
              <Card
                className="card-hover animate-slide-up group relative overflow-hidden border-border/50 py-0"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                {/* Left amber accent bar */}
                <div
                  className="absolute top-0 left-0 h-full w-0.5 transition-all duration-200 group-hover:w-1"
                  style={{ background: "oklch(0.82 0.155 75)" }}
                />

                <CardContent className="flex items-center gap-4 py-4 pl-5 pr-5">
                  {/* Left: plan details */}
                  <div className="min-w-0 flex-1">
                    {/* Project badge */}
                    {plan.projectName && (
                      <span
                        className="mb-1.5 inline-block rounded px-1.5 py-0.5 font-mono text-[11px] font-medium"
                        style={{
                          background: "oklch(0.82 0.155 75 / 10%)",
                          color: "oklch(0.82 0.155 75 / 80%)",
                        }}
                      >
                        {plan.projectName}
                      </span>
                    )}

                    {/* Plan title */}
                    <h2 className="truncate font-display text-[15px] font-semibold leading-snug text-foreground">
                      {plan.title}
                    </h2>

                    {/* Filename */}
                    {plan.planFilename && (
                      <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground/50">
                        {plan.planFilename}
                      </p>
                    )}

                    {/* Author + time */}
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span>{plan.createdByName}</span>
                      <span className="opacity-40">/</span>
                      <span className="opacity-70">
                        {relativeTime(plan.updatedAt)}
                      </span>
                    </div>
                  </div>

                  {/* Right: version badge + thread count */}
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {plan.latestVersion != null && (
                      <Badge
                        variant="secondary"
                        className="font-mono text-[11px] tabular-nums"
                      >
                        v{plan.latestVersion}
                      </Badge>
                    )}
                    {plan.openThreadCount != null && plan.openThreadCount > 0 && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={{
                          background: "oklch(0.82 0.155 75 / 12%)",
                          color: "oklch(0.82 0.155 75)",
                        }}
                      >
                        <svg
                          className="h-3 w-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
                          />
                        </svg>
                        {plan.openThreadCount}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <IdentityDialog
        open={showIdentity}
        onIdentitySet={(id: { email: string; name: string }) => {
          setIdentity(id);
          setShowIdentity(false);
        }}
      />
    </main>
  );
}
