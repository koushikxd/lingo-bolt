import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { Octokit } from "@octokit/rest";
import prisma from "@lingo-dev/db";
import { queryRepository } from "@lingo-dev/api/lib/rag/index";
import { env } from "@lingo-dev/env/server";
import { LingoDotDevEngine } from "lingo.dev/sdk";
import { z } from "zod";

const SUPPORTED_LOCALES = [
  "en", "es", "fr", "de", "pt-BR", "zh-CN", "ja", "ko",
  "hi", "ar", "ru", "it", "nl", "tr", "pl",
] as const;

function getLingoEngine(): LingoDotDevEngine {
  return new LingoDotDevEngine({ apiKey: env.LINGODOTDEV_API_KEY });
}

function getOctokit(): Octokit {
  return new Octokit({ auth: env.GITHUB_TOKEN });
}

function createServer() {
  const server = new McpServer({ name: "lingo-bolt", version: "1.0.0" });

  server.registerTool(
    "list_issues",
    {
      title: "List Issues",
      description:
        "List GitHub issues with titles translated to your language.",
      inputSchema: {
        owner: z.string().describe("Repository owner"),
        repo: z.string().describe("Repository name"),
        targetLocale: z
          .enum(SUPPORTED_LOCALES)
          .describe("Language to translate issue titles into"),
        state: z
          .enum(["open", "closed", "all"])
          .default("open")
          .describe("Filter by issue state"),
        labels: z
          .string()
          .optional()
          .describe("Comma-separated label names to filter by"),
      },
    },
    async (args) => {
      try {
        const octokit = getOctokit();
        const response = await octokit.issues.listForRepo({
          owner: args.owner,
          repo: args.repo,
          state: args.state ?? "open",
          labels: args.labels,
          per_page: 20,
          sort: "updated",
          direction: "desc",
        });

        const issues = response.data.filter((i) => !i.pull_request);
        if (issues.length === 0) {
          return { content: [{ type: "text" as const, text: "No issues found matching the criteria." }] };
        }

        const titles = issues.map((i) => i.title);
        const translatedTitles =
          args.targetLocale === "en"
            ? titles
            : await Promise.all(
                titles.map((t) =>
                  getLingoEngine().localizeText(t, {
                    sourceLocale: "en",
                    targetLocale: args.targetLocale,
                  }),
                ),
              );

        const text = issues
          .map((issue, idx) => {
            const lbls = issue.labels
              .map((l) => (typeof l === "string" ? l : l.name))
              .filter(Boolean)
              .join(", ");
            return [
              `#${issue.number} - ${translatedTitles[idx]}`,
              `  State: ${issue.state} | Author: ${issue.user?.login ?? "unknown"} | Comments: ${issue.comments}`,
              lbls ? `  Labels: ${lbls}` : null,
            ]
              .filter(Boolean)
              .join("\n");
          })
          .join("\n\n");

        return { content: [{ type: "text" as const, text }] };
      } catch (e) {
        return {
          content: [{ type: "text" as const, text: `Error: ${e instanceof Error ? e.message : String(e)}` }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "get_issue",
    {
      title: "Get Issue",
      description:
        "Fetch a specific GitHub issue with full body and comments, translated to your language.",
      inputSchema: {
        owner: z.string().describe("Repository owner"),
        repo: z.string().describe("Repository name"),
        issueNumber: z.number().int().min(1).describe("The issue number"),
        targetLocale: z
          .enum(SUPPORTED_LOCALES)
          .describe("Language to translate the issue into"),
      },
    },
    async (args) => {
      try {
        const octokit = getOctokit();
        const [issue, comments] = await Promise.all([
          octokit.issues.get({ owner: args.owner, repo: args.repo, issue_number: args.issueNumber }),
          octokit.issues.listComments({
            owner: args.owner,
            repo: args.repo,
            issue_number: args.issueNumber,
            per_page: 30,
          }),
        ]);

        const fullText = [
          `# ${issue.data.title}`,
          "",
          issue.data.body ?? "(no body)",
          "",
          ...comments.data.map(
            (c) => `---\n**${c.user?.login ?? "unknown"}:**\n${c.body ?? ""}`,
          ),
        ].join("\n");

        const text =
          args.targetLocale === "en"
            ? fullText
            : await getLingoEngine().localizeText(fullText, {
                sourceLocale: "en",
                targetLocale: args.targetLocale,
              });

        return { content: [{ type: "text" as const, text }] };
      } catch (e) {
        return {
          content: [{ type: "text" as const, text: `Error: ${e instanceof Error ? e.message : String(e)}` }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "translate_doc",
    {
      title: "Translate Document",
      description:
        "Fetch a file (README, CONTRIBUTING, etc.) from a GitHub repository and translate it.",
      inputSchema: {
        owner: z.string().describe("Repository owner"),
        repo: z.string().describe("Repository name"),
        targetLocale: z
          .enum(SUPPORTED_LOCALES)
          .describe("Language to translate the document into"),
        filePath: z
          .string()
          .default("README.md")
          .describe("Path to the file in the repo (defaults to README.md)"),
      },
    },
    async (args) => {
      try {
        const octokit = getOctokit();
        const filePath = args.filePath ?? "README.md";

        const response = await octokit.repos.getContent({
          owner: args.owner,
          repo: args.repo,
          path: filePath,
          mediaType: { format: "raw" },
        });

        const content =
          typeof response.data === "string"
            ? response.data
            : Buffer.from(
                (response.data as { content?: string }).content ?? "",
                "base64",
              ).toString("utf-8");

        if (!content.trim()) {
          return { content: [{ type: "text" as const, text: `File ${filePath} is empty.` }] };
        }

        const text =
          args.targetLocale === "en"
            ? content
            : await getLingoEngine().localizeText(content, {
                sourceLocale: "en",
                targetLocale: args.targetLocale,
              });

        return { content: [{ type: "text" as const, text }] };
      } catch (e) {
        return {
          content: [{ type: "text" as const, text: `Error: ${e instanceof Error ? e.message : String(e)}` }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "translate_text",
    {
      title: "Translate Text",
      description: "Translate any text between supported languages using Lingo.dev.",
      inputSchema: {
        text: z.string().min(1).describe("The text to translate"),
        sourceLocale: z
          .enum(SUPPORTED_LOCALES)
          .describe("Source language of the text"),
        targetLocale: z
          .enum(SUPPORTED_LOCALES)
          .describe("Language to translate into"),
      },
    },
    async (args) => {
      try {
        const text =
          args.sourceLocale === args.targetLocale
            ? args.text
            : await getLingoEngine().localizeText(args.text, {
                sourceLocale: args.sourceLocale,
                targetLocale: args.targetLocale,
              });
        return { content: [{ type: "text" as const, text }] };
      } catch (e) {
        return {
          content: [{ type: "text" as const, text: `Error: ${e instanceof Error ? e.message : String(e)}` }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "search_codebase",
    {
      title: "Search Codebase",
      description:
        "Semantic search across an indexed repository's codebase. The repo must be indexed in Lingo Bolt first. Returns relevant code snippets.",
      inputSchema: {
        owner: z.string().describe("Repository owner"),
        repo: z.string().describe("Repository name"),
        query: z.string().min(1).describe("What to search for (natural language)"),
        targetLocale: z
          .enum(SUPPORTED_LOCALES)
          .default("en")
          .describe("Language to translate results into"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(15)
          .default(5)
          .describe("Max number of results"),
      },
    },
    async (args) => {
      try {
        const repository = await prisma.repository.findFirst({
          where: { owner: args.owner, name: args.repo, status: "indexed" },
          select: { id: true },
        });

        if (!repository) {
          return {
            content: [{
              type: "text" as const,
              text: `Repository ${args.owner}/${args.repo} is not indexed in Lingo Bolt. Index it first at the web dashboard.`,
            }],
          };
        }

        const result = await queryRepository({
          query: args.query,
          repositoryId: repository.id,
          limit: args.limit,
        });

        if (result.sources.length === 0) {
          return { content: [{ type: "text" as const, text: "No relevant code found for that query." }] };
        }

        const text = result.sources
          .map((s) => {
            const header = `## ${s.metadata.filePath} (chunk ${s.metadata.chunkIndex})`;
            return `${header}\n\`\`\`\n${s.content}\n\`\`\`\nRelevance: ${(s.score * 100).toFixed(0)}%`;
          })
          .join("\n\n");

        if (args.targetLocale === "en") {
          return { content: [{ type: "text" as const, text }] };
        }

        const translated = await getLingoEngine().localizeText(text, {
          sourceLocale: "en",
          targetLocale: args.targetLocale,
        });
        return { content: [{ type: "text" as const, text: translated }] };
      } catch (e) {
        return {
          content: [{ type: "text" as const, text: `Error: ${e instanceof Error ? e.message : String(e)}` }],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "get_onboarding",
    {
      title: "Get Onboarding Doc",
      description:
        "Fetch the AI-generated onboarding documentation for an indexed repository. Returns the most recent version.",
      inputSchema: {
        owner: z.string().describe("Repository owner"),
        repo: z.string().describe("Repository name"),
        locale: z
          .enum(SUPPORTED_LOCALES)
          .default("en")
          .describe("Language of the onboarding doc"),
      },
    },
    async (args) => {
      try {
        const repository = await prisma.repository.findFirst({
          where: { owner: args.owner, name: args.repo },
          select: { id: true },
        });

        if (!repository) {
          return {
            content: [{
              type: "text" as const,
              text: `Repository ${args.owner}/${args.repo} is not found in Lingo Bolt.`,
            }],
          };
        }

        const doc = await prisma.onboardingDoc.findFirst({
          where: { repositoryId: repository.id, locale: args.locale },
          orderBy: { createdAt: "desc" },
          select: { content: true, locale: true, createdAt: true },
        });

        if (!doc) {
          const enDoc = args.locale !== "en"
            ? await prisma.onboardingDoc.findFirst({
                where: { repositoryId: repository.id, locale: "en" },
                orderBy: { createdAt: "desc" },
                select: { content: true },
              })
            : null;

          if (enDoc) {
            const translated = await getLingoEngine().localizeText(enDoc.content, {
              sourceLocale: "en",
              targetLocale: args.locale,
            });
            return { content: [{ type: "text" as const, text: translated }] };
          }

          return {
            content: [{
              type: "text" as const,
              text: `No onboarding doc found for ${args.owner}/${args.repo}. Generate one from the web dashboard first.`,
            }],
          };
        }

        return { content: [{ type: "text" as const, text: doc.content }] };
      } catch (e) {
        return {
          content: [{ type: "text" as const, text: `Error: ${e instanceof Error ? e.message : String(e)}` }],
          isError: true,
        };
      }
    },
  );

  return server;
}

async function handleMcp(req: Request) {
  const server = createServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  await server.connect(transport);
  return transport.handleRequest(req);
}

export const POST = handleMcp;
export const GET = handleMcp;
export const DELETE = handleMcp;
