# lingo bolt 

Open source shouldn't have a language barrier. Lingo Bolt is for contributors who want to participate but struggle with the language, and for maintainers who need to manage issues and pull requests from people who don't speak their language.

Connect your GitHub repos, get AI onboarding docs in any language, translate markdown files, and let the bot handle in-repo translation and summarization — so the language gap stops being a blocker.

## Features

- **GitHub auth** — sign in with GitHub, import public or private repos
- **Repo indexing** — indexes your codebase into a vector store for semantic search
- **AI onboarding docs** — generate contributor-ready docs from your codebase in any selected language
- **Markdown translation** — translate any markdown file in a repo, download as individual files or a ZIP
- **AI chat** — ask questions about the repo, browse issues and PRs, find relevant code — all in your language
- **GitHub bot** — install lingo-bolt on your org, and it auto-translates issues, summarizes threads, and labels by language

## lingo-bolt bot

Install the GitHub App on your account or org. The bot responds to `@lingo-bolt` mentions in issues and PRs.

### Commands

```
@lingo-bolt translate to spanish
```

Translates the issue or PR body and posts a reply.

```
@lingo-bolt summarize
```

Summarizes in the maintainer's default language.

```
@lingo-bolt summarize in french
```

Summarizes in a specific language.

### Automatic features

- **Auto-label** — detects the language of new issues and adds a label like `lang:chinese`
- **Auto-translate** — translates new issues and comments into the maintainer's default language

Manage installations and preferences at `/bot`.

## Tech stack

- Next.js (App Router) + React 19
- Lingo.dev API for translation
- tRPC + TanStack Query
- Better Auth
- Prisma + PostgreSQL
- Qdrant (vector store)
- OpenAI (embeddings + generation)
- Tailwind CSS + shadcn/ui
- Turborepo + PNPM workspaces

## Monorepo structure

```
apps/web         Next.js app (UI + route handlers)
packages/api     tRPC routers + indexing/retrieval logic
packages/auth    Better Auth setup
packages/db      Prisma schema + Docker services
packages/env     Shared runtime env validation
packages/config  Shared TypeScript config
```

## Prerequisites

- Node.js
- PNPM
- Docker (for local PostgreSQL and Qdrant)
- GitHub OAuth app credentials
- OpenAI API key
- lingo.dev API key

## Environment variables

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `CORS_ORIGIN`
- `QDRANT_URL`
- `QDRANT_API_KEY`
- `OPENAI_API_KEY`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_TOKEN` (optional)
- `GITHUB_APP_ID`
- `GITHUB_WEBHOOK_SECRET`
- `LINGODOTDEV_API_KEY`
- `NODE_ENV`

## Local setup

```bash
pnpm install
pnpm db:start
pnpm db:push
pnpm dev
```

App runs at `http://localhost:3000`.

## Useful commands

- `pnpm dev` - run all dev tasks
- `pnpm dev:web` - run only the web app
- `pnpm build` - build all packages/apps
- `pnpm check-types` - run TypeScript checks
- `pnpm check` - run oxlint + oxfmt
- `pnpm db:start` - start PostgreSQL + Qdrant via Docker
- `pnpm db:stop` - stop DB containers
- `pnpm db:down` - stop and remove DB containers
- `pnpm db:generate` - regenerate Prisma client
- `pnpm db:migrate` - run Prisma migrations
- `pnpm db:studio` - open Prisma Studio
