import { Octokit } from "@octokit/rest";

export type ParsedGitHubRepository = {
  owner: string;
  repo: string;
  normalizedUrl: string;
};

export type GitHubRepositoryMetadata = {
  name: string;
  owner: string;
  url: string;
  description: string | null;
  stars: number;
  language: string | null;
  defaultBranch: string;
};

export function createOctokit(token: string) {
  return new Octokit({ auth: token });
}

export function parseGitHubRepositoryUrl(input: string): ParsedGitHubRepository | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }

  if (url.hostname !== "github.com") {
    return null;
  }

  const segments = url.pathname
    .replace(/\.git$/, "")
    .split("/")
    .filter((segment) => segment.length > 0);

  if (segments.length < 2) {
    return null;
  }

  const [owner, repo] = segments;
  if (!owner || !repo) {
    return null;
  }

  return {
    owner,
    repo,
    normalizedUrl: `https://github.com/${owner}/${repo}`,
  };
}

export async function fetchGitHubRepositoryMetadata(
  input: ParsedGitHubRepository,
  token: string,
): Promise<GitHubRepositoryMetadata> {
  const octokit = createOctokit(token);
  const response = await octokit.repos.get({
    owner: input.owner,
    repo: input.repo,
  });

  return {
    name: response.data.name,
    owner: response.data.owner.login,
    url: response.data.html_url,
    description: response.data.description ?? null,
    stars: response.data.stargazers_count ?? 0,
    language: response.data.language ?? null,
    defaultBranch: response.data.default_branch,
  };
}

export async function listUserRepos(token: string) {
  const octokit = createOctokit(token);
  const repos = await octokit.paginate(octokit.repos.listForAuthenticatedUser, {
    sort: "updated",
    per_page: 100,
    visibility: "all",
  });
  return repos.map((r) => ({
    id: r.id,
    name: r.name,
    fullName: r.full_name,
    owner: r.owner.login,
    url: r.html_url,
    description: r.description ?? null,
    stars: r.stargazers_count ?? 0,
    language: r.language ?? null,
    isPrivate: r.private,
    defaultBranch: r.default_branch,
  }));
}
