import { drizzle, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

let _db: BetterSQLite3Database<typeof schema> | null = null;

function getDbPath(): string {
  const dbUrl = process.env.DATABASE_URL || "./data/planclave.db";
  return path.isAbsolute(dbUrl) ? dbUrl : path.resolve(process.cwd(), dbUrl);
}

function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (_db) return _db;

  const dbPath = getDbPath();
  ensureDir(dbPath);

  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  _db = drizzle(sqlite, { schema });

  // Run migrations on first connection
  runMigrations(sqlite);

  return _db;
}

function runMigrations(sqlite: Database.Database) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      project_name TEXT NOT NULL DEFAULT '',
      plan_filename TEXT NOT NULL DEFAULT '',
      created_by_email TEXT NOT NULL,
      created_by_name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS plan_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
      version INTEGER NOT NULL,
      content TEXT NOT NULL,
      submitted_by_email TEXT NOT NULL,
      submitted_by_name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(plan_id, version)
    )`,
    `CREATE TABLE IF NOT EXISTS reviewers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
      version INTEGER NOT NULL,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      completed_at INTEGER,
      UNIQUE(plan_id, version, email)
    )`,
    `CREATE TABLE IF NOT EXISTS block_threads (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
      version INTEGER NOT NULL,
      block_id TEXT NOT NULL,
      start_line INTEGER NOT NULL,
      end_line INTEGER NOT NULL,
      author_email TEXT NOT NULL,
      author_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS block_comments (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL REFERENCES block_threads(id) ON DELETE CASCADE,
      author_email TEXT NOT NULL,
      author_name TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`,
  ];

  for (const sql of statements) {
    sqlite.prepare(sql).run();
  }

  // Additive migrations for existing DBs
  const alterStatements = [
    `ALTER TABLE plans ADD COLUMN project_name TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE plans ADD COLUMN plan_filename TEXT NOT NULL DEFAULT ''`,
  ];

  for (const sql of alterStatements) {
    try {
      sqlite.prepare(sql).run();
    } catch {
      // Column already exists — ignore
    }
  }
}
