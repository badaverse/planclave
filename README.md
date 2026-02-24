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
- **Self-hostable** — SQLite by default (zero setup), Docker and reverse proxy guides included.

## Plugin Installation

Two things to install: the **CLI** (binary on PATH) and the **plugin** (slash commands in Claude Code).

### Step 1: Install the CLI

```bash
npm install -g @badaverse/planclave
```

### Step 2: Add the marketplace and install the plugin

Inside Claude Code:

```
/plugin marketplace add badaverse/planclave
/plugin install planclave@planclave
```

### Step 3: Configure server URL

Add to `~/.zshrc` or `~/.bashrc`:

```bash
export PLANCLAVE_URL=https://planclave.yourcompany.com
```

### Usage

```
/planclave-submit              # Submit the latest plan for team review
/planclave-submit <plan-id>    # Update an existing plan (creates new version)
/planclave-import <plan-id>    # Import team feedback into Claude
```

## Self-Hosting Guide

Planclave is designed to run on your company's internal server. One server instance serves the entire team — each developer connects from their local Claude Code via the plugin.

```
┌─ Developer A ─────────┐     ┌─ Developer B ─────────┐
│  Claude Code           │     │  Claude Code           │
│  /planclave-submit ────┼─┐   │  /planclave-submit ────┼─┐
│  /planclave-import ────┼─┤   │  /planclave-import ────┼─┤
└────────────────────────┘ │   └────────────────────────┘ │
                           │                              │
           ┌───────────────┴──────────────────────────────┘
           ▼
┌─ Internal Server ──────────────────────────────┐
│  https://planclave.internal.yourco.com         │
│                                                │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │  Nginx   │───▶│ Planclave│───▶│ SQLite/  │  │
│  │ (reverse │    │ (Docker) │    │ Postgres │  │
│  │  proxy)  │    │ :4002    │    │          │  │
│  └──────────┘    └──────────┘    └──────────┘  │
└────────────────────────────────────────────────┘
           ▲
           │
┌──────────┴─────────────┐
│  Browser (any team     │
│  member reviews plans) │
└────────────────────────┘
```

### 1. Deploy the Server

**Requirements:** A Linux server with Docker installed, accessible to your team (internal network or VPN).

```bash
# Clone the repo on your server
git clone https://github.com/badaverse/planclave.git
cd planclave/apps/planclave

# Create .env
cat > .env << 'EOF'
PORT=4002
DATABASE_URL=/data/planclave.db
PLANCLAVE_IMAGE_DIR=/data/images
EOF

# Start with Docker
docker compose up -d
```

The app is now running on port 4002. Data is persisted in a Docker volume (`planclave-data`).

**With PostgreSQL** (recommended for larger teams):

```bash
cat > .env << 'EOF'
PORT=4002
DATABASE_PROVIDER=postgres
DATABASE_URL=postgresql://planclave:planclave@postgres:5432/planclave
PLANCLAVE_IMAGE_DIR=/data/images
EOF

docker compose --profile postgres up -d
```

### 2. Set Up Reverse Proxy (Recommended)

Expose Planclave behind nginx with HTTPS so your team can access it at a clean URL.

**nginx configuration:**

```nginx
server {
    listen 443 ssl;
    server_name planclave.internal.yourco.com;

    ssl_certificate     /etc/ssl/certs/yourco.pem;
    ssl_certificate_key /etc/ssl/private/yourco-key.pem;

    location / {
        proxy_pass http://127.0.0.1:4002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. Install the Plugin (Each Developer)

Each team member follows the [Plugin Installation](#plugin-installation) section above, setting `PLANCLAVE_URL` to the server address from step 2.

### 4. Team Workflow

```bash
# Developer submits a plan for review
/planclave-submit
# → "Uploaded to Planclave: abc123 (v1)"
# → "https://planclave.internal.yourco.com/plans/abc123"

# Share the URL with your team in Slack/Teams/etc.

# Team members open the URL in browser and review:
#   - Click "+" on any block gutter to start a thread
#   - Comment on specific code lines or table rows
#   - Mark review as complete when done

# Developer imports feedback back into Claude
/planclave-import abc123
# → Claude reads the structured feedback and revises the plan

# Submit the revised plan as v2
/planclave-submit abc123
```

### Updating

```bash
cd /path/to/planclave/apps/planclave
git pull
docker compose up -d --build
```

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  Claude Code (developer's local machine)             │
│  ┌────────────────┐    ┌─────────────────┐           │
│  │ /planclave-    │    │ /planclave-     │           │
│  │   submit       │    │   import        │           │
│  └───────┬────────┘    └────────┬────────┘           │
│          │                      │                    │
│          │    CLI (packages/plugin)                    │
│          │    reads ~/.claude/plans/                  │
└──────────┼──────────────────────┼────────────────────┘
           │ POST /api/plans      │ GET /api/plans/:id/export
           ▼                      ▼
┌──────────────────────────────────────────────────────┐
│  Planclave Server (self-hosted)                      │
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
| CLI | TypeScript, bundled with esbuild (zero runtime deps) |
| Deployment | Docker with multi-stage build |

## Local Development

```bash
git clone https://github.com/badaverse/planclave.git
cd planclave
npm install
cp apps/planclave/.env.example apps/planclave/.env
npm run dev
# → http://localhost:4002
```

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
npm install
npm run dev          # Start dev server on :4002
cd apps/planclave
npx tsc --noEmit     # Type check
npm run build        # Production build
```

## License

MIT
