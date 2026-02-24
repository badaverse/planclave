# Planclave

**Team plan review for the AI coding era.**

Planclave (inspired by *conclave* — a private assembly for decision-making) is an open-source platform where engineering teams review, discuss, and finalize AI-generated plans before a single line of code is written.

## Why Planclave?

AI coding agents like Claude Code produce detailed implementation plans. But today, the review process is fragmented:

- Plans live in ephemeral conversations, not in a reviewable format
- Git-based review (PRs, markdown files) breaks the feedback loop — you review in GitHub, then manually explain the feedback back to Claude
- There's no way for a team to asynchronously review a plan with the same rigor as a code review

**Planclave closes this gap.** Submit a plan directly from Claude Code, your team reviews it with block-level precision, and you import the structured feedback back into Claude — all in one seamless loop.

```
Claude generates plan → /planclave-submit → Team reviews on web
                                                    ↓
Claude revises plan  ← /planclave-import  ← Feedback ready
```

## Features

- **Block-level threading** — Review rendered markdown with line-range gutters. Start threads on any heading, paragraph, list item, or table row.
- **Per-line code review** — Code blocks get their own line numbers with per-line comment buttons, just like a PR diff.
- **Mermaid diagrams** — Rendered charts with a source/rendered toggle for reviewing diagram definitions.
- **Syntax highlighting** — Code blocks are highlighted via highlight.js with a custom amber-tinted dark theme.
- **Version tracking** — Submit updated plans as new versions. Compare and review across iterations.
- **Reviewer management** — Assign reviewers, track completion status, mark reviews as done.
- **Structured export** — `planclave import` outputs a plain-text summary with line ranges that Claude can directly parse and act on.
- **Claude Code plugin** — Two slash commands: `/planclave-submit` and `/planclave-import`. Zero friction.
- **Self-hostable** — SQLite by default (zero setup), Docker support included.

## Quick Start

### Prerequisites

- Node.js 20+ (or Bun 1.1+)
- Git

### Setup

```bash
git clone https://github.com/badaverse/planclave.git
cd planclave

# Install dependencies
npm install

# Set up environment (defaults work out of the box)
cp apps/planclave/.env.example apps/planclave/.env

# Start dev server
npm run dev
```

Open [http://localhost:4002](http://localhost:4002). That's it — SQLite is the default, no database setup required.

### Connect Claude Code

```bash
# In your project directory, add the plugin:
claude plugin add /path/to/planclave/apps/planclave

# Submit a plan:
/planclave-submit

# After team review, import feedback:
/planclave-import <plan-id>
```

## Docker

```bash
# SQLite (default, zero config)
docker compose up -d

# With PostgreSQL
DATABASE_PROVIDER=postgres \
DATABASE_URL=postgresql://planclave:planclave@postgres:5432/planclave \
docker compose --profile postgres up -d
```

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  Claude Code                                         │
│  ┌────────────────┐    ┌─────────────────┐           │
│  │ /planclave-    │    │ /planclave-     │           │
│  │   submit       │    │   import        │           │
│  └───────┬────────┘    └────────┬────────┘           │
│          │                      │                    │
│          │    CLI (plugin/index.ts)                   │
│          │    reads ~/.claude/plans/                  │
└──────────┼──────────────────────┼────────────────────┘
           │ POST /api/plans      │ GET /api/plans/:id/export
           ▼                      ▼
┌──────────────────────────────────────────────────────┐
│  Next.js App (localhost:4002)                        │
│                                                      │
│  ┌─────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ Plan    │  │ Block Gutter │  │ Reviewer       │  │
│  │ List    │  │ Review UI    │  │ Panel          │  │
│  └─────────┘  └──────────────┘  └────────────────┘  │
│                                                      │
│  13 API Routes  ─────────────────  Drizzle ORM       │
│                                    (SQLite / PG)     │
└──────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| UI | shadcn/ui (Radix + Tailwind CSS v4) |
| Design | oklch color model, dark-first "The Enclave" theme |
| Database | Drizzle ORM — SQLite (default) / PostgreSQL |
| CLI | TypeScript, executed via tsx |
| Deployment | Docker with multi-stage build |

## API Overview

| Endpoint | Description |
|----------|-------------|
| `POST/GET /api/plans` | Create / list plans |
| `GET/PATCH /api/plans/:id` | Get / update plan |
| `POST/GET /api/plans/:id/versions` | Add / list versions |
| `GET /api/plans/:id/export` | Export review feedback (plain text) |
| `POST/GET /api/plans/:id/threads` | Create / list block threads |
| `POST /api/threads/:tid/comments` | Add comment to thread |
| `POST/GET /api/plans/:id/reviewers` | Add / list reviewers |

## Contributing

Contributions welcome! Please open an issue first for major changes.

```bash
# Development workflow
npm install
npm run dev          # Start dev server on :4002
cd apps/planclave
npx tsc --noEmit     # Type check
npm run build        # Production build
```

## License

MIT
