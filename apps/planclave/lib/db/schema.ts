import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// --- plans ---
export const plans = sqliteTable("plans", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  projectName: text("project_name").notNull().default(""),
  planFilename: text("plan_filename").notNull().default(""),
  createdByEmail: text("created_by_email").notNull(),
  createdByName: text("created_by_name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

// --- plan_versions ---
export const planVersions = sqliteTable("plan_versions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  planId: text("plan_id")
    .notNull()
    .references(() => plans.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  content: text("content").notNull(),
  submittedByEmail: text("submitted_by_email").notNull(),
  submittedByName: text("submitted_by_name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

// --- reviewers ---
export const reviewers = sqliteTable("reviewers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  planId: text("plan_id")
    .notNull()
    .references(() => plans.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  completedAt: integer("completed_at", { mode: "timestamp_ms" }),
});

// --- block_threads ---
export const blockThreads = sqliteTable("block_threads", {
  id: text("id").primaryKey(),
  planId: text("plan_id")
    .notNull()
    .references(() => plans.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  blockId: text("block_id").notNull(),
  startLine: integer("start_line").notNull(),
  endLine: integer("end_line").notNull(),
  authorEmail: text("author_email").notNull(),
  authorName: text("author_name").notNull(),
  status: text("status", { enum: ["open", "resolved"] })
    .notNull()
    .default("open"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

// --- block_comments ---
export const blockComments = sqliteTable("block_comments", {
  id: text("id").primaryKey(),
  threadId: text("thread_id")
    .notNull()
    .references(() => blockThreads.id, { onDelete: "cascade" }),
  authorEmail: text("author_email").notNull(),
  authorName: text("author_name").notNull(),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});
