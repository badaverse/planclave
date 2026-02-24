"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface Version {
  version: number;
  label?: string;
  createdAt?: number;
}

interface VersionSelectorProps {
  versions: Version[];
  currentVersion: number;
  onSelectVersion: (version: number) => void;
}

function formatVersionDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function VersionSelector({
  versions,
  currentVersion,
  onSelectVersion,
}: VersionSelectorProps) {
  const sortedVersions = [...versions].sort(
    (a, b) => b.version - a.version
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 font-mono">
          <span>v{currentVersion}</span>
          <svg
            className="size-3 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[180px]">
        <DropdownMenuLabel>Versions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {sortedVersions.map((v) => {
          const isCurrent = v.version === currentVersion;
          return (
            <DropdownMenuItem
              key={v.version}
              onClick={() => onSelectVersion(v.version)}
              className={cn("gap-2", isCurrent && "bg-accent")}
            >
              <span
                className={cn(
                  "font-mono text-sm",
                  isCurrent && "font-semibold"
                )}
              >
                v{v.version}
              </span>
              {v.label && (
                <span className="truncate text-xs text-muted-foreground">
                  {v.label}
                </span>
              )}
              {v.createdAt && (
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {formatVersionDate(v.createdAt)}
                </span>
              )}
              {isCurrent && (
                <svg
                  className="ml-auto size-3.5 text-primary"
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
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
