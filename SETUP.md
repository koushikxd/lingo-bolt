# Setup

## Prerequisites

- Node.js 20+
- PNPM (`npm i -g pnpm`)
- Docker
- ngrok

## 1. Clone and install

```bash
git clone <repo-url>
cd lingo-dev
pnpm install
```

## 2. GitHub OAuth app

Go to GitHub → Settings → Developer Settings → OAuth Apps → New OAuth App.

- Homepage URL: `http://localhost:3000`
- Callback URL: `http://localhost:3000/api/auth/callback/github`

> If you plan to access the app through your ngrok URL, use `<ngrok-url>/api/auth/callback/github` as the callback instead and access the app at the ngrok URL throughout.

Copy the **Client ID** and generate a **Client Secret**.

## 3. GitHub App (bot)

Go to GitHub → Settings → Developer Settings → GitHub Apps → New GitHub App.

- Homepage URL: `http://localhost:3000`
- Webhook URL: your ngrok URL + `/api/webhook` (e.g. `https://abc123.ngrok-free.app/api/webhook`)
- Webhook secret: any random string — you'll use this as `GITHUB_WEBHOOK_SECRET`

Permissions needed (Repository):
- Issues: Read & Write
- Pull requests: Read & Write

Subscribe to events: `Issues`, `Issue comment`, `Pull request`

After creating the app:
- Copy the **App ID**
- Generate and download the **private key** (`.pem` file)
- Rename it to `lang-bolt.private-key.pem` and place it at the **root of the monorepo**
- Then update the path in `apps/web/src/lib/github-app.ts` to match the filename

## 4. Environment variables

Create `apps/web/.env`:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/lingo-dev
BETTER_AUTH_SECRET=<random 32+ char string>
BETTER_AUTH_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000

QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=<any string — qdrant has no auth locally>

OPENAI_API_KEY=<your openai key>
LINGODOTDEV_API_KEY=<your lingo.dev key>

GITHUB_CLIENT_ID=<from step 2>
GITHUB_CLIENT_SECRET=<from step 2>

GITHUB_APP_ID=<from step 3>
GITHUB_WEBHOOK_SECRET=<from step 3>

NODE_ENV=development
```

> `GITHUB_TOKEN` is optional — only needed for higher GitHub API rate limits.

## 5. Start databases

```bash
pnpm db:start
```

This starts PostgreSQL on port `5432` and Qdrant on port `6333` via Docker Compose.

## 6. Push schema

```bash
pnpm db:push
```

## 7. Start ngrok

In a separate terminal:

```bash
ngrok http 3000
```

Copy the forwarding URL (e.g. `https://abc123.ngrok-free.app`) and update the Webhook URL in your GitHub App settings to `<ngrok-url>/api/webhook`.

## 8. Run the app

```bash
pnpm dev
```

App runs at `http://localhost:3000`.

---

## 9. MCP server (optional — IDE integration)

The MCP server runs as a remote HTTP endpoint inside the web app at `/api/mcp`. No separate build step needed — it starts automatically with the app.

### Configure your IDE

Make sure the app is running (`pnpm dev`), then add to `.cursor/mcp.json` (or your IDE's MCP config):

```json
{
  "mcpServers": {
    "lang-bolt": {
      "type": "remote",
      "url": "http://localhost:3000/api/mcp"
    }
  }
}
```

### Available tools

| Tool              | What it does                                                                          |
| ----------------- | ------------------------------------------------------------------------------------- |
| `list_issues`     | List GitHub issues with translated titles                                             |
| `get_issue`       | Fetch a full issue with comments, translated                                          |
| `translate_doc`   | Translate any repo file (README, CONTRIBUTING, etc.)                                  |
| `translate_text`  | Translate arbitrary text between languages                                            |
| `search_codebase` | Semantic search across an indexed repo's code (repo must be indexed in the dashboard) |
| `get_onboarding`  | Fetch AI-generated onboarding docs for an indexed repo                                |

### Usage

Open your IDE and ask:

- "Show me open issues for facebook/react in Spanish"
- "Get issue #42 from vercel/next.js in Hindi"
- "Translate the README of expressjs/express to Japanese"
- "Search the codebase of my-org/my-repo for how auth works"
- "Get onboarding docs for my-org/my-repo in French"

> **Note:** `search_codebase` and `get_onboarding` require the repo to be indexed first via the web dashboard. The other 4 tools work with any public GitHub repo.

### Standalone MCP (stdio, alternative)

If you prefer the stdio-based MCP (auto-detects owner/repo from git remotes, works without the web app running):

```bash
pnpm --filter @lingo-dev/mcp build
```

Then in your IDE config:

```json
{
  "mcpServers": {
    "lang-bolt": {
      "command": "node",
      "args": ["<absolute-path-to-repo>/packages/mcp/dist/index.js"],
      "env": {
        "LINGODOTDEV_API_KEY": "<your lingo.dev key>",
        "GITHUB_TOKEN": "<your github token>"
      }
    }
  }
}
```

---

## Useful commands

| Command            | Description                |
| ------------------ | -------------------------- |
| `pnpm dev`         | Run all dev tasks          |
| `pnpm dev:web`     | Run only the web app       |
| `pnpm build`       | Build all packages         |
| `pnpm check-types` | TypeScript checks          |
| `pnpm check`       | Lint + format              |
| `pnpm db:start`    | Start PostgreSQL + Qdrant  |
| `pnpm db:stop`     | Stop DB containers         |
| `pnpm db:down`     | Stop and remove containers |
| `pnpm db:push`     | Sync schema to DB          |
| `pnpm db:migrate`  | Run Prisma migrations      |
| `pnpm db:generate` | Regenerate Prisma client   |
| `pnpm db:studio`   | Open Prisma Studio         |
