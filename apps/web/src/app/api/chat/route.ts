import { queryRepository } from "@lingo-dev/api/lib/rag/index";
import { auth } from "@lingo-dev/auth";
import prisma from "@lingo-dev/db";
import { openai } from "@ai-sdk/openai";
import {
  type UIMessage,
  convertToModelMessages,
  stepCountIs,
  streamText,
} from "ai";
import { Octokit } from "@octokit/rest";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

export const maxDuration = 60;

function buildSystemPrompt(
  language: string,
  repo: { owner: string; name: string },
) {
  return `You are a contribution helper for the GitHub repository ${repo.owner}/${repo.name}. You help developers contribute to open-source projects.

Your capabilities:
- List and search issues (open, closed, filtered by labels)
- Get detailed issue information with comments
- List and search pull requests
- Get detailed pull request information with changed files and review comments
- Search the repository codebase using RAG to find relevant code

Your behavior:
- ALWAYS respond in ${language}. Every message, explanation, and description must be in ${language}.
- When a user asks about issues, use the listIssues tool first, then offer to dive deeper into specific ones.
- When a user picks an issue to solve, use searchCodebase to find relevant files, then provide a step-by-step guide to solve it.
- When recommending easy issues, filter by labels like "good first issue", "beginner", "easy", "help wanted".
- For pull requests, explain what changes were made, translate code comments if asked, and answer questions about the PR.
- Be concise and actionable. Use markdown formatting.
- Include actual file paths and code references from the codebase when helping solve issues.
- Do not invent file paths or code that doesn't exist in the search results.`;
}

async function getGitHubToken(reqHeaders: Headers) {
  const { accessToken } = await auth.api.getAccessToken({
    body: { providerId: "github" },
    headers: reqHeaders,
  });
  return accessToken;
}

export async function POST(req: Request) {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const messages = body.messages as UIMessage[];
    const repositoryId = body.repositoryId as string;

    if (!repositoryId || !messages) {
      return NextResponse.json(
        { error: "Missing repositoryId or messages" },
        { status: 400 },
      );
    }

    const [repository, user] = await Promise.all([
      prisma.repository.findFirst({
        where: { id: repositoryId, userId: session.user.id },
      }),
      prisma.user.findUniqueOrThrow({
        where: { id: session.user.id },
        select: { preferredLanguage: true },
      }),
    ]);

    if (!repository) {
      return NextResponse.json(
        { error: "Repository not found" },
        { status: 404 },
      );
    }

    const githubToken = await getGitHubToken(reqHeaders);
    const octokit = githubToken ? new Octokit({ auth: githubToken }) : null;
    const languageLabel =
      LANGUAGE_MAP[user.preferredLanguage] ?? user.preferredLanguage;

    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: buildSystemPrompt(languageLabel, {
        owner: repository.owner,
        name: repository.name,
      }),
      messages: await convertToModelMessages(messages),
      stopWhen: stepCountIs(10),
      tools: {
        listIssues: {
          description:
            "List issues from the GitHub repository. Can filter by state and labels.",
          inputSchema: z.object({
            state: z
              .enum(["open", "closed", "all"])
              .default("open")
              .describe("Filter by issue state"),
            labels: z
              .string()
              .optional()
              .describe("Comma-separated label names to filter by"),
            page: z.number().int().min(1).default(1).describe("Page number"),
            perPage: z
              .number()
              .int()
              .min(1)
              .max(30)
              .default(10)
              .describe("Results per page"),
          }),
          execute: async ({ state, labels, page, perPage }) => {
            if (!octokit) return { error: "GitHub token not available" };
            const response = await octokit.issues.listForRepo({
              owner: repository.owner,
              repo: repository.name,
              state,
              labels,
              page,
              per_page: perPage,
              sort: "updated",
              direction: "desc",
            });
            return response.data
              .filter((issue) => !issue.pull_request)
              .map((issue) => ({
                number: issue.number,
                title: issue.title,
                state: issue.state,
                labels: issue.labels
                  .map((l) => (typeof l === "string" ? l : l.name))
                  .filter(Boolean),
                author: issue.user?.login ?? "unknown",
                createdAt: issue.created_at,
                comments: issue.comments,
                bodyPreview: issue.body?.slice(0, 300) ?? "",
              }));
          },
        },

        getIssue: {
          description:
            "Get detailed information about a specific issue including its full body and comments.",
          inputSchema: z.object({
            issueNumber: z.number().int().min(1).describe("The issue number"),
          }),
          execute: async ({ issueNumber }) => {
            if (!octokit) return { error: "GitHub token not available" };
            const [issue, comments] = await Promise.all([
              octokit.issues.get({
                owner: repository.owner,
                repo: repository.name,
                issue_number: issueNumber,
              }),
              octokit.issues.listComments({
                owner: repository.owner,
                repo: repository.name,
                issue_number: issueNumber,
                per_page: 20,
              }),
            ]);
            return {
              number: issue.data.number,
              title: issue.data.title,
              state: issue.data.state,
              body: issue.data.body ?? "",
              labels: issue.data.labels
                .map((l) => (typeof l === "string" ? l : l.name))
                .filter(Boolean),
              author: issue.data.user?.login ?? "unknown",
              createdAt: issue.data.created_at,
              comments: comments.data.map((c) => ({
                author: c.user?.login ?? "unknown",
                body: c.body ?? "",
                createdAt: c.created_at,
              })),
            };
          },
        },

        listPullRequests: {
          description:
            "List pull requests from the GitHub repository. Can filter by state.",
          inputSchema: z.object({
            state: z
              .enum(["open", "closed", "all"])
              .default("open")
              .describe("Filter by PR state"),
            page: z.number().int().min(1).default(1).describe("Page number"),
            perPage: z
              .number()
              .int()
              .min(1)
              .max(30)
              .default(10)
              .describe("Results per page"),
          }),
          execute: async ({ state, page, perPage }) => {
            if (!octokit) return { error: "GitHub token not available" };
            const response = await octokit.pulls.list({
              owner: repository.owner,
              repo: repository.name,
              state,
              page,
              per_page: perPage,
              sort: "updated",
              direction: "desc",
            });
            return response.data.map((pr) => ({
              number: pr.number,
              title: pr.title,
              state: pr.state,
              author: pr.user?.login ?? "unknown",
              createdAt: pr.created_at,
              merged: pr.merged_at !== null,
              draft: pr.draft ?? false,
            }));
          },
        },

        getPullRequest: {
          description:
            "Get detailed information about a specific pull request including changed files and review comments.",
          inputSchema: z.object({
            pullNumber: z
              .number()
              .int()
              .min(1)
              .describe("The pull request number"),
          }),
          execute: async ({ pullNumber }) => {
            if (!octokit) return { error: "GitHub token not available" };
            const [pr, files, reviewComments] = await Promise.all([
              octokit.pulls.get({
                owner: repository.owner,
                repo: repository.name,
                pull_number: pullNumber,
              }),
              octokit.pulls.listFiles({
                owner: repository.owner,
                repo: repository.name,
                pull_number: pullNumber,
                per_page: 30,
              }),
              octokit.pulls.listReviewComments({
                owner: repository.owner,
                repo: repository.name,
                pull_number: pullNumber,
                per_page: 30,
              }),
            ]);
            return {
              number: pr.data.number,
              title: pr.data.title,
              state: pr.data.state,
              body: pr.data.body ?? "",
              author: pr.data.user?.login ?? "unknown",
              merged: pr.data.merged,
              additions: pr.data.additions,
              deletions: pr.data.deletions,
              files: files.data.map((f) => ({
                filename: f.filename,
                status: f.status,
                additions: f.additions,
                deletions: f.deletions,
                patch: f.patch?.slice(0, 500) ?? "",
              })),
              reviewComments: reviewComments.data.map((c) => ({
                author: c.user?.login ?? "unknown",
                body: c.body,
                path: c.path,
                line: c.line,
                createdAt: c.created_at,
              })),
            };
          },
        },

        searchCodebase: {
          description:
            "Search the indexed repository codebase using semantic search (RAG). Use this to find relevant code files and snippets when helping solve issues or answering questions about the code.",
          inputSchema: z.object({
            query: z
              .string()
              .min(1)
              .describe("The search query describing what code to find"),
            limit: z
              .number()
              .int()
              .min(3)
              .max(10)
              .default(5)
              .describe("Number of results to return"),
          }),
          execute: async ({ query, limit }) => {
            const result = await queryRepository({
              query,
              repositoryId: repository.id,
              limit,
              maxTokens: 6000,
            });
            return result.sources.map((s) => ({
              filePath: s.metadata.filePath,
              type: s.metadata.type,
              score: s.score,
              content: s.content,
            }));
          },
        },
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Chat request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const LANGUAGE_MAP: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  "pt-BR": "Portuguese (Brazilian)",
  "zh-CN": "Chinese (Simplified)",
  ja: "Japanese",
  ko: "Korean",
  hi: "Hindi",
  ar: "Arabic",
  ru: "Russian",
  it: "Italian",
  nl: "Dutch",
  tr: "Turkish",
  pl: "Polish",
};
