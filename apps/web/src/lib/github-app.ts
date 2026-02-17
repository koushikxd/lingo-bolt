import fs from "node:fs";
import path from "node:path";

import { App } from "@octokit/app";
import { env } from "@lingo-dev/env/server";

const privateKey = fs.readFileSync(
  path.resolve(process.cwd(), "../../lingo-bolt.2026-02-17.private-key.pem"),
  "utf-8",
);

export const githubApp = new App({
  appId: env.GITHUB_APP_ID,
  privateKey,
  webhooks: { secret: env.GITHUB_WEBHOOK_SECRET },
});

export function getInstallationOctokit(installationId: number) {
  return githubApp.getInstallationOctokit(installationId);
}
