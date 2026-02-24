"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Identity {
  email: string;
  name: string;
}

interface IdentityDialogProps {
  open: boolean;
  onIdentitySet: (identity: Identity) => void;
}

export default function IdentityDialog({
  open,
  onIdentitySet,
}: IdentityDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill from git identity on mount
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setIsFetching(true);

    fetch("/api/git-identity")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch git identity");
        return res.json();
      })
      .then((data: { name?: string; email?: string }) => {
        if (cancelled) return;
        if (data.name) setName(data.name);
        if (data.email) setEmail(data.email);
      })
      .catch(() => {
        // Silently ignore — user can type manually
      })
      .finally(() => {
        if (!cancelled) setIsFetching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      const trimmedName = name.trim();
      const trimmedEmail = email.trim();

      if (!trimmedName) {
        setError("Name is required.");
        return;
      }
      if (!trimmedEmail) {
        setError("Email is required.");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        setError("Please enter a valid email address.");
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetch("/api/me", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmedEmail, name: trimmedName }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(
            body?.error ?? `Request failed with status ${res.status}`
          );
        }

        onIdentitySet({ email: trimmedEmail, name: trimmedName });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [name, email, onIdentitySet]
  );

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent showCloseButton={false} className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Welcome to Planclave</DialogTitle>
          <DialogDescription>
            Enter your name and email to get started. This will be used to
            identify you in reviews and threads.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <label
              htmlFor="identity-name"
              className="text-sm font-medium text-foreground"
            >
              Name
            </label>
            <Input
              id="identity-name"
              type="text"
              placeholder={isFetching ? "Loading..." : "Your name"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <label
              htmlFor="identity-email"
              className="text-sm font-medium text-foreground"
            >
              Email
            </label>
            <Input
              id="identity-email"
              type="email"
              placeholder={isFetching ? "Loading..." : "you@example.com"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? "Saving..." : "Continue"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
