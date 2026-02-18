import { NextResponse } from "next/server";
import prisma from "@lingo-dev/db";

import { githubApp } from "@/lib/github-app";
import { parseCommand } from "@/lib/bot/commands";
import {
  getEffectiveSettings,
  handleAutoLabel,
  handleAutoTranslate,
  handleIssueComment,
} from "@/lib/bot/handlers";

function getAccountInfo(account: Record<string, unknown>) {
  const login = (account.login ?? account.slug ?? account.name ?? "unknown") as string;
  const type = (account.type ?? "Organization") as string;
  return { login, type };
}

githubApp.webhooks.on("installation.created", async ({ payload }) => {
  const account = payload.installation.account as Record<string, unknown>;
  const { login, type } = getAccountInfo(account);
  await prisma.botInstallation.upsert({
    where: { installationId: payload.installation.id },
    create: {
      installationId: payload.installation.id,
      accountLogin: login,
      accountType: type,
    },
    update: {
      accountLogin: login,
      accountType: type,
    },
  });
});

githubApp.webhooks.on("installation.deleted", async ({ payload }) => {
  await prisma.botInstallation.deleteMany({
    where: { installationId: payload.installation.id },
  });
});

githubApp.webhooks.on("issues.opened", async ({ octokit, payload }) => {
  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;
  const issueNumber = payload.issue.number;
  const installationId = payload.installation?.id;
  if (!installationId) return;

  const settings = await getEffectiveSettings(installationId, `${owner}/${repo}`);
  if (!settings) return;

  if (settings.autoLabel) {
    await handleAutoLabel(
      octokit,
      owner,
      repo,
      issueNumber,
      payload.issue.body ?? "",
      payload.issue.title,
    );
  }

  if (settings.autoTranslate) {
    const text = `${payload.issue.title}\n\n${payload.issue.body ?? ""}`;
    await handleAutoTranslate(octokit, owner, repo, issueNumber, text, settings.defaultLanguage);
  }
});

githubApp.webhooks.on("pull_request.opened", async ({ octokit, payload }) => {
  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;
  const prNumber = payload.pull_request.number;
  const installationId = payload.installation?.id;
  if (!installationId) return;

  const settings = await getEffectiveSettings(installationId, `${owner}/${repo}`);
  if (!settings) return;

  if (settings.autoLabel) {
    await handleAutoLabel(
      octokit,
      owner,
      repo,
      prNumber,
      payload.pull_request.body ?? "",
      payload.pull_request.title,
    );
  }

  if (settings.autoTranslate) {
    const text = `${payload.pull_request.title}\n\n${payload.pull_request.body ?? ""}`;
    await handleAutoTranslate(octokit, owner, repo, prNumber, text, settings.defaultLanguage);
  }
});

githubApp.webhooks.on("issue_comment.created", async ({ octokit, payload }) => {
  if (payload.comment.performed_via_github_app?.id?.toString() === process.env.GITHUB_APP_ID) {
    return;
  }
  if (payload.comment.user?.type === "Bot") return;

  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;
  const issueNumber = payload.issue.number;
  const commentBody = payload.comment.body;
  const installationId = payload.installation?.id;
  if (!installationId) return;

  const command = parseCommand(commentBody);

  if (command) {
    await handleIssueComment(
      octokit,
      owner,
      repo,
      issueNumber,
      commentBody,
      payload.issue.body ?? "",
      payload.issue.title,
      command,
      installationId,
    );
    return;
  }

  const settings = await getEffectiveSettings(installationId, `${owner}/${repo}`);
  if (settings?.autoTranslate) {
    await handleAutoTranslate(
      octokit,
      owner,
      repo,
      issueNumber,
      commentBody,
      settings.defaultLanguage,
    );
  }
});

export async function POST(request: Request) {
  const signature = request.headers.get("x-hub-signature-256");
  const id = request.headers.get("x-github-delivery");
  const name = request.headers.get("x-github-event");
  const body = await request.text();

  if (!signature || !id || !name) {
    return NextResponse.json({ error: "Missing required GitHub webhook headers" }, { status: 400 });
  }

  try {
    await githubApp.webhooks.verifyAndReceive({
      id,
      name: name as Parameters<typeof githubApp.webhooks.verifyAndReceive>[0]["name"],
      signature,
      payload: body,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook verification failed";
    console.error("Webhook error:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
