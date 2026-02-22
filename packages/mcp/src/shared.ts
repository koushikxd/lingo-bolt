import { execSync } from "node:child_process";
import { Octokit } from "@octokit/rest";
import { LingoDotDevEngine } from "lingo.dev/sdk";

export const SUPPORTED_LOCALES = [
  "en",
  "es",
  "fr",
  "de",
  "pt-BR",
  "zh-CN",
  "ja",
  "ko",
  "hi",
  "ar",
  "ru",
  "it",
  "nl",
  "tr",
  "pl",
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export function getLingoEngine(): LingoDotDevEngine {
  const apiKey = process.env["LINGODOTDEV_API_KEY"];
  if (!apiKey) throw new Error("LINGODOTDEV_API_KEY is required");
  return new LingoDotDevEngine({ apiKey });
}

export function getOctokit(): Octokit {
  return new Octokit({ auth: process.env["GITHUB_TOKEN"] });
}

function parseGitHubRemote(url: string): { owner: string; repo: string } | null {
  const sshMatch = url.match(/git@github\.com:(.+?)\/(.+?)(?:\.git)?$/);
  if (sshMatch?.[1] && sshMatch[2]) {
    return { owner: sshMatch[1], repo: sshMatch[2] };
  }

  const httpsMatch = url.match(
    /https?:\/\/github\.com\/(.+?)\/(.+?)(?:\.git)?$/,
  );
  if (httpsMatch?.[1] && httpsMatch[2]) {
    return { owner: httpsMatch[1], repo: httpsMatch[2] };
  }

  return null;
}

function getRemoteUrl(name: string): string | null {
  try {
    return execSync(`git remote get-url ${name}`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return null;
  }
}

export function detectRepoFromCwd(): { owner: string; repo: string } | null {
  const upstreamUrl = getRemoteUrl("upstream");
  if (upstreamUrl) {
    const parsed = parseGitHubRemote(upstreamUrl);
    if (parsed) return parsed;
  }

  const originUrl = getRemoteUrl("origin");
  if (originUrl) {
    const parsed = parseGitHubRemote(originUrl);
    if (parsed) return parsed;
  }

  return null;
}

export function resolveRepo(
  owner?: string,
  repo?: string,
): { owner: string; repo: string } {
  if (owner && repo) return { owner, repo };

  const detected = detectRepoFromCwd();
  if (!detected) {
    throw new Error(
      "Could not detect repository from current directory. Provide owner and repo explicitly, or run from inside a cloned GitHub repo.",
    );
  }

  return {
    owner: owner ?? detected.owner,
    repo: repo ?? detected.repo,
  };
}
