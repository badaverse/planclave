# CLAUDE.md

## Project Overview

Planclave is a team plan review platform built as a Claude Code plugin. It enables async, block-level review of AI-generated plans before implementation begins.

## Tech Stack

- **Framework**: Next.js 15 (App Router) with Turbopack
- **UI**: shadcn/ui (Radix + Tailwind CSS v4), oklch color model
- **DB**: Drizzle ORM + SQLite (better-sqlite3) — PostgreSQL adapter planned
- **Fonts**: Sora (display), Outfit (body), JetBrains Mono (code)
- **CLI**: TypeScript, bundled with esbuild (zero runtime deps)

## Directory Structure

```
planclave/
├── apps/planclave/            # Next.js web server
│   ├── app/                   # App Router
│   │   ├── api/               # 13 REST API route handlers
│   │   ├── page.tsx           # Plan list
│   │   └── plans/[id]/        # Plan detail (review UI)
│   ├── components/
│   │   ├── ui/                # shadcn/ui base components
│   │   ├── BlockRenderer.tsx  # Block-level markdown rendering + gutter
│   │   ├── BlockThread.tsx    # Inline threaded comments
│   │   ├── ReviewerPanel.tsx  # Reviewer sidebar
│   │   └── VersionSelector.tsx
│   ├── lib/
│   │   ├── db/                # Schema + DB initialization
│   │   ├── auth.ts            # Cookie + header auth
│   │   └── markdown-parser.ts # Markdown → typed blocks with line ranges
│   ├── Dockerfile
│   └── docker-compose.yml
│
└── packages/plugin/           # Claude Code plugin (npm: @badaverse/planclave)
    ├── .claude-plugin/        # Plugin manifest
    ├── commands/              # Slash command definitions (.md)
    ├── src/index.ts           # CLI source
    └── dist/cli.js            # Bundled CLI (esbuild, gitignored)
```

## Development Commands

```bash
# Install dependencies (from repo root)
npm install

# Run dev server (port 4002)
npm run dev

# Build for production
npm run build

# Build CLI plugin
npm run build --workspace=packages/plugin

# Type check
cd apps/planclave && npx tsc --noEmit
```

## Key Patterns

- **Auth**: Dual auth — browser uses `planclave_identity` cookie, CLI uses `X-Planclave-Email`/`X-Planclave-Name` headers. Both resolved in `lib/auth.ts`.
- **Block threading**: Markdown is parsed into typed blocks (heading, paragraph, code, table, list-item, blockquote, hr) with `startLine`/`endLine`. Threads are attached to blocks by `block_id` + line range.
- **Code blocks**: Support per-line review via internal line numbers. Tables support per-row review.
- **Design system**: Dark-first theme called "The Enclave". Primary accent is amber/gold `oklch(0.82 0.155 75)`. All colors use oklch. CSS variables defined in `globals.css`.
- **DB migrations**: Auto-run on first connection via `runMigrations()` in `lib/db/index.ts`. Uses `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE` with error suppression for additive changes.
- **API convention**: All route handlers in `app/api/`. Auth-required routes call `getIdentity()` and return 401 if null.
- **Plugin architecture**: The CLI plugin (`packages/plugin/`) is a separate npm package (`@badaverse/planclave`) that communicates with the server via REST API. It has no dependency on the server code — only needs `PLANCLAVE_URL`.

## Environment Variables

```
PORT=4002
DATABASE_URL=./data/planclave.db
PLANCLAVE_URL=http://localhost:4002    # Used by CLI
PLANCLAVE_IMAGE_DIR=./data/images
```

## Gotchas

- `data/` directory is gitignored — SQLite DB is created automatically on first run
- The CLI reads plans from `~/.claude/plans/` (Claude Code's plan files)
- `next-env.d.ts`, `*.tsbuildinfo`, and `dist/` are auto-generated and gitignored
- When editing BlockRenderer, code/table blocks have their own per-line "+" buttons — the outer BlockRow "+" is hidden for those types
- The plugin `dist/cli.js` is built via `npm run build --workspace=packages/plugin` — must rebuild after editing `packages/plugin/src/index.ts`
