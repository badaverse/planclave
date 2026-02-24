import { NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

async function gitConfig(key: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync("git", ["config", key]);
    return stdout.trim();
  } catch {
    return "";
  }
}

export async function GET() {
  const [name, email] = await Promise.all([
    gitConfig("user.name"),
    gitConfig("user.email"),
  ]);

  return NextResponse.json({ name, email });
}
