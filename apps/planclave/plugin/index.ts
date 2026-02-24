#!/usr/bin/env node

import { execFile } from "child_process";
import { promisify } from "util";
import { readdir, readFile, stat } from "fs/promises";
import { join, basename } from "path";
import { homedir } from "os";
import { randomUUID } from "crypto";

const execFileAsync = promisify(execFile);

const PLANCLAVE_URL =
  process.env.PLANCLAVE_URL || "http://localhost:4002";

async function getGitConfig(key: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync("git", ["config", key]);
    return stdout.trim();
  } catch {
    return "";
  }
}

async function getGitIdentity(): Promise<{
  name: string;
  email: string;
}> {
  const [name, email] = await Promise.all([
    getGitConfig("user.name"),
    getGitConfig("user.email"),
  ]);
  return { name, email };
}

function getProjectName(): string {
  return basename(process.cwd());
}

interface PlanInfo {
  content: string;
  filename: string; // e.g. "tranquil-pondering-chipmunk.md"
}

async function findLatestPlan(): Promise<PlanInfo | null> {
  const plansDir = join(homedir(), ".claude", "plans");

  try {
    const files = await readdir(plansDir).catch(() => [] as string[]);
    const mdFiles = files.filter((f) => f.endsWith(".md"));

    if (mdFiles.length === 0) return null;

    let latestFile = "";
    let latestTime = 0;

    for (const file of mdFiles) {
      const s = await stat(join(plansDir, file));
      if (s.mtimeMs > latestTime) {
        latestTime = s.mtimeMs;
        latestFile = file;
      }
    }

    if (!latestFile) return null;

    const content = await readFile(join(plansDir, latestFile), "utf-8");
    return { content, filename: latestFile };
  } catch {
    return null;
  }
}

function extractTitle(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "Untitled Plan";
}

function authHeaders(identity: { name: string; email: string }) {
  return {
    "Content-Type": "application/json",
    "X-Planclave-Email": identity.email,
    "X-Planclave-Name": identity.name,
  };
}

async function submit(planId?: string): Promise<void> {
  const identity = await getGitIdentity();

  if (!identity.email || !identity.name) {
    console.error(
      "Error: git config user.name and user.email must be set."
    );
    process.exit(1);
  }

  // Find latest plan from ~/.claude/plans/
  const plan = await findLatestPlan();
  if (!plan) {
    console.error("Error: No plan found in ~/.claude/plans/");
    process.exit(1);
  }

  const title = extractTitle(plan.content);
  const projectName = getProjectName();
  const headers = authHeaders(identity);

  if (planId) {
    // Update existing plan with new version
    const res = await fetch(
      `${PLANCLAVE_URL}/api/plans/${planId}/versions`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ content: plan.content }),
      }
    );

    if (!res.ok) {
      console.error(`Error: Failed to create version (${res.status})`);
      process.exit(1);
    }

    const data = await res.json();
    console.log(
      `Planclave 플랜 ${planId} → 버전 ${data.version} 업데이트`
    );
    console.log(`${PLANCLAVE_URL}/plans/${planId}`);
  } else {
    // Create new plan
    const id = randomUUID();
    const res = await fetch(`${PLANCLAVE_URL}/api/plans`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        id,
        title,
        content: plan.content,
        projectName,
        planFilename: plan.filename,
      }),
    });

    if (!res.ok) {
      console.error(`Error: Failed to create plan (${res.status})`);
      process.exit(1);
    }

    console.log(`Planclave에 업로드 완료: ${id} (v1)`);
    console.log(`프로젝트: ${projectName}`);
    console.log(`플랜 파일: ${plan.filename}`);
    console.log(`${PLANCLAVE_URL}/plans/${id}`);
  }
}

async function importPlan(planId: string): Promise<void> {
  const res = await fetch(
    `${PLANCLAVE_URL}/api/plans/${planId}/export`
  );

  if (!res.ok) {
    console.error(`Error: Failed to export plan (${res.status})`);
    process.exit(1);
  }

  const text = await res.text();
  console.log(text);
}

// --- Main ---
const args = process.argv.slice(2);
const command = args[0];

if (command === "submit") {
  submit(args[1]).catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
} else if (command === "import") {
  if (!args[1]) {
    console.error("Usage: planclave import <plan-id>");
    process.exit(1);
  }
  importPlan(args[1]).catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
} else {
  console.error("Usage: planclave <submit|import> [plan-id]");
  process.exit(1);
}
