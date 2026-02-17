import fs from "node:fs/promises";
import path from "node:path";

import { nanoid } from "nanoid";
import simpleGit from "simple-git";

type CloneRepositoryInput = {
  repoUrl: string;
  branch?: string;
  accessToken?: string;
};

export async function cloneRepository(input: CloneRepositoryInput) {
  const { repoUrl, branch, accessToken } = input;

  let cloneUrl = repoUrl;
  if (accessToken) {
    const url = new URL(cloneUrl);
    url.username = "x-access-token";
    url.password = accessToken;
    cloneUrl = url.toString();
  }

  const repoId = nanoid();
  const rootPath = path.resolve(process.cwd(), ".tmp", "repos");
  const repoPath = path.join(rootPath, repoId);

  await fs.mkdir(rootPath, { recursive: true });

  const git = simpleGit();
  const args = ["--depth", "1", "--single-branch", "--no-tags"];
  if (branch) {
    args.push("--branch", branch);
  }

  await git.clone(cloneUrl, repoPath, args);
  return repoPath;
}
