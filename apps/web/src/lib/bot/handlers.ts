import { env } from "@lingo-dev/env/server";
import prisma from "@lingo-dev/db";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { LingoDotDevEngine } from "lingo.dev/sdk";

import type { BotCommand } from "./commands";

type OctokitLike = {
  request: (route: string, options?: Record<string, unknown>) => Promise<unknown>;
};

const engine = new LingoDotDevEngine({ apiKey: env.LINGODOTDEV_API_KEY });

const LANGUAGE_TO_LOCALE: Record<string, string> = {
  english: "en",
  spanish: "es",
  french: "fr",
  german: "de",
  portuguese: "pt-BR",
  chinese: "zh-CN",
  japanese: "ja",
  korean: "ko",
  hindi: "hi",
  arabic: "ar",
  russian: "ru",
  italian: "it",
  dutch: "nl",
  turkish: "tr",
  polish: "pl",
};

function resolveLocale(language: string): string {
  return LANGUAGE_TO_LOCALE[language.toLowerCase()] ?? language.toLowerCase();
}

async function detectLanguageCode(text: string): Promise<string> {
  const { text: langCode } = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: `Detect the language of this text. Reply with ONLY the lowercase ISO 639-1 language code (e.g. "en", "zh", "es", "ja"). Nothing else.\n\n${text.slice(0, 1000)}`,
  });

  return langCode.trim().toLowerCase().slice(0, 5);
}

async function postComment(
  octokit: OctokitLike,
  owner: string,
  repo: string,
  issueNumber: number,
  body: string,
) {
  await octokit.request("POST /repos/{owner}/{repo}/issues/{issue_number}/comments", {
    owner,
    repo,
    issue_number: issueNumber,
    body,
  });
}

export async function handleTranslate(
  octokit: OctokitLike,
  owner: string,
  repo: string,
  issueNumber: number,
  textToTranslate: string,
  targetLanguage: string,
) {
  const locale = resolveLocale(targetLanguage);
  const sourceLocale = await detectLanguageCode(textToTranslate);
  const translated = await engine.localizeText(textToTranslate, {
    sourceLocale,
    targetLocale: locale,
  });
  await postComment(
    octokit,
    owner,
    repo,
    issueNumber,
    `**Translation (${targetLanguage}):**\n\n${translated}`,
  );
}

export async function handleSummarize(
  octokit: OctokitLike,
  owner: string,
  repo: string,
  issueNumber: number,
  textToSummarize: string,
  targetLanguage: string,
) {
  const locale = resolveLocale(targetLanguage);
  const { text: summary } = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: `Summarize the following GitHub issue/PR content concisely. Keep it clear and actionable. Write in English:\n\n${textToSummarize}`,
  });
  let finalText = summary;
  if (locale !== "en") {
    finalText = await engine.localizeText(summary, {
      sourceLocale: "en",
      targetLocale: locale,
    });
  }
  await postComment(
    octokit,
    owner,
    repo,
    issueNumber,
    `**Summary (${targetLanguage}):**\n\n${finalText}`,
  );
}

export async function handleAutoLabel(
  octokit: OctokitLike,
  owner: string,
  repo: string,
  issueNumber: number,
  issueBody: string,
  issueTitle: string,
) {
  const text = `${issueTitle}\n\n${issueBody}`.trim();
  if (!text) return;

  const code = await detectLanguageCode(text);
  const LANG_NAMES: Record<string, string> = {
    en: "english",
    es: "spanish",
    fr: "french",
    de: "german",
    pt: "portuguese",
    zh: "chinese",
    ja: "japanese",
    ko: "korean",
    hi: "hindi",
    ar: "arabic",
    ru: "russian",
    it: "italian",
    nl: "dutch",
    tr: "turkish",
    pl: "polish",
  };
  const label = `lang:${LANG_NAMES[code] ?? code}`;

  try {
    await octokit.request("POST /repos/{owner}/{repo}/labels", {
      owner,
      repo,
      name: label,
      color: "c5def5",
    });
  } catch {}

  await octokit.request("POST /repos/{owner}/{repo}/issues/{issue_number}/labels", {
    owner,
    repo,
    issue_number: issueNumber,
    labels: [label],
  });
}

export async function handleAutoTranslate(
  octokit: OctokitLike,
  owner: string,
  repo: string,
  issueNumber: number,
  text: string,
  defaultLanguage: string,
) {
  const locale = resolveLocale(defaultLanguage);
  const detected = await detectLanguageCode(text);
  if (detected === locale || detected === locale.split("-")[0]) return;

  const translated = await engine.localizeText(text, {
    sourceLocale: detected,
    targetLocale: locale,
  });

  await postComment(
    octokit,
    owner,
    repo,
    issueNumber,
    `**Auto-translated to ${defaultLanguage}:**\n\n${translated}`,
  );
}

export async function getEffectiveSettings(installationId: number, repoFullName: string) {
  const installation = await prisma.botInstallation.findUnique({
    where: { installationId },
  });
  if (!installation) return null;

  const repoConfig = await prisma.botRepoConfig.findUnique({
    where: {
      installationId_repoFullName: {
        installationId: installation.id,
        repoFullName,
      },
    },
  });

  return {
    defaultLanguage: repoConfig?.defaultLanguage ?? installation.defaultLanguage,
    autoTranslate: repoConfig?.autoTranslate ?? installation.autoTranslate,
    autoLabel: repoConfig?.autoLabel ?? installation.autoLabel,
  };
}

export async function handleIssueComment(
  octokit: OctokitLike,
  owner: string,
  repo: string,
  issueNumber: number,
  commentBody: string,
  issueBody: string,
  issueTitle: string,
  command: BotCommand,
  installationId: number,
) {
  const settings = await getEffectiveSettings(installationId, `${owner}/${repo}`);

  if (command.action === "translate") {
    const contentToTranslate = issueBody || commentBody;
    await handleTranslate(octokit, owner, repo, issueNumber, contentToTranslate, command.language);
  }

  if (command.action === "summarize") {
    const lang = command.language ?? settings?.defaultLanguage ?? "english";
    const contentToSummarize = `# ${issueTitle}\n\n${issueBody}`;
    await handleSummarize(octokit, owner, repo, issueNumber, contentToSummarize, lang);
  }
}
