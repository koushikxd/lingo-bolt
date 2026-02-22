import { getLingoEngine, getOctokit, resolveRepo } from "./shared.js";

export async function listIssues(params: {
  owner?: string;
  repo?: string;
  targetLocale: string;
  state?: "open" | "closed" | "all";
  labels?: string;
}) {
  const { owner, repo } = resolveRepo(params.owner, params.repo);
  const octokit = getOctokit();

  const response = await octokit.issues.listForRepo({
    owner,
    repo,
    state: params.state ?? "open",
    labels: params.labels,
    per_page: 20,
    sort: "updated",
    direction: "desc",
  });

  const issues = response.data.filter((i) => !i.pull_request);

  if (issues.length === 0) {
    return "No issues found matching the criteria.";
  }

  const titles = issues.map((i) => i.title);
  const translatedTitles =
    params.targetLocale === "en"
      ? titles
      : await Promise.all(
          titles.map((t) =>
            getLingoEngine().localizeText(t, {
              sourceLocale: "en",
              targetLocale: params.targetLocale,
            }),
          ),
        );

  return issues
    .map((issue, idx) => {
      const labels = issue.labels
        .map((l) => (typeof l === "string" ? l : l.name))
        .filter(Boolean)
        .join(", ");

      return [
        `#${issue.number} - ${translatedTitles[idx]}`,
        `  State: ${issue.state} | Author: ${issue.user?.login ?? "unknown"} | Comments: ${issue.comments}`,
        labels ? `  Labels: ${labels}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

export async function getIssue(params: {
  owner?: string;
  repo?: string;
  issueNumber: number;
  targetLocale: string;
}) {
  const { owner, repo } = resolveRepo(params.owner, params.repo);
  const octokit = getOctokit();

  const [issue, comments] = await Promise.all([
    octokit.issues.get({ owner, repo, issue_number: params.issueNumber }),
    octokit.issues.listComments({
      owner,
      repo,
      issue_number: params.issueNumber,
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

  if (params.targetLocale === "en") return fullText;

  return getLingoEngine().localizeText(fullText, {
    sourceLocale: "en",
    targetLocale: params.targetLocale,
  });
}

export async function translateDoc(params: {
  owner?: string;
  repo?: string;
  targetLocale: string;
  filePath?: string;
}) {
  const { owner, repo } = resolveRepo(params.owner, params.repo);
  const octokit = getOctokit();
  const filePath = params.filePath ?? "README.md";

  const response = await octokit.repos.getContent({
    owner,
    repo,
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

  if (!content.trim()) return `File ${filePath} is empty.`;

  if (params.targetLocale === "en") return content;

  return getLingoEngine().localizeText(content, {
    sourceLocale: "en",
    targetLocale: params.targetLocale,
  });
}

export async function translateText(params: {
  text: string;
  sourceLocale: string;
  targetLocale: string;
}) {
  if (params.sourceLocale === params.targetLocale) return params.text;

  return getLingoEngine().localizeText(params.text, {
    sourceLocale: params.sourceLocale,
    targetLocale: params.targetLocale,
  });
}

