#!/usr/bin/env node
import "dotenv/config";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { SUPPORTED_LOCALES } from "./shared.js";
import {
  getIssue,
  listIssues,
  translateDoc,
  translateText,
} from "./tools.js";

const server = new McpServer({
  name: "lingo-bolt",
  version: "1.0.0",
});

server.registerTool(
  "list_issues",
  {
    title: "List Issues",
    description:
      "List GitHub issues with titles translated to your language. Auto-detects the repo from the current git directory if owner/repo are omitted.",
    inputSchema: {
      owner: z
        .string()
        .optional()
        .describe("Repository owner (auto-detected from git remote if omitted)"),
      repo: z
        .string()
        .optional()
        .describe("Repository name (auto-detected from git remote if omitted)"),
      targetLocale: z
        .enum(SUPPORTED_LOCALES)
        .describe("Language to translate issue titles into (e.g. 'es', 'ja')"),
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
      const result = await listIssues(args);
      return { content: [{ type: "text" as const, text: result }] };
    } catch (e) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${e instanceof Error ? e.message : String(e)}`,
          },
        ],
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
      "Fetch a specific GitHub issue with full body and comments, translated to your language. Auto-detects repo from git remote if owner/repo are omitted.",
    inputSchema: {
      owner: z
        .string()
        .optional()
        .describe("Repository owner (auto-detected if omitted)"),
      repo: z
        .string()
        .optional()
        .describe("Repository name (auto-detected if omitted)"),
      issueNumber: z.number().int().min(1).describe("The issue number"),
      targetLocale: z
        .enum(SUPPORTED_LOCALES)
        .describe("Language to translate the issue into"),
    },
  },
  async (args) => {
    try {
      const result = await getIssue(args);
      return { content: [{ type: "text" as const, text: result }] };
    } catch (e) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${e instanceof Error ? e.message : String(e)}`,
          },
        ],
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
      "Fetch a file (README, CONTRIBUTING, etc.) from a GitHub repository and translate it. Auto-detects repo from git remote if owner/repo are omitted.",
    inputSchema: {
      owner: z
        .string()
        .optional()
        .describe("Repository owner (auto-detected if omitted)"),
      repo: z
        .string()
        .optional()
        .describe("Repository name (auto-detected if omitted)"),
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
      const result = await translateDoc(args);
      return { content: [{ type: "text" as const, text: result }] };
    } catch (e) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${e instanceof Error ? e.message : String(e)}`,
          },
        ],
        isError: true,
      };
    }
  },
);

server.registerTool(
  "translate_text",
  {
    title: "Translate Text",
    description:
      "Translate any text between supported languages using Lingo.dev.",
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
      const result = await translateText(args);
      return { content: [{ type: "text" as const, text: result }] };
    } catch (e) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: ${e instanceof Error ? e.message : String(e)}`,
          },
        ],
        isError: true,
      };
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
