import { getRepositoryFileContent } from "@lingo-dev/api/lib/rag/index";
import { auth } from "@lingo-dev/auth";
import prisma from "@lingo-dev/db";
import { env } from "@lingo-dev/env/server";
import { LingoDotDevEngine } from "lingo.dev/sdk";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

const supportedLocales = [
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

const bodySchema = z.object({
  repositoryId: z.string().min(1),
  filePath: z.string().min(1),
  targetLocale: z.enum(supportedLocales),
});

const engine = new LingoDotDevEngine({ apiKey: env.LINGODOTDEV_API_KEY });

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = bodySchema.parse(await req.json());

    const repository = await prisma.repository.findFirst({
      where: { id: body.repositoryId, userId: session.user.id },
    });

    if (!repository) {
      return NextResponse.json({ error: "Repository not found" }, { status: 404 });
    }

    const content = await getRepositoryFileContent(repository.id, body.filePath);
    if (!content.trim()) {
      return NextResponse.json({ error: "File is empty" }, { status: 422 });
    }

    const translated = await engine.localizeText(content, {
      sourceLocale: "en",
      targetLocale: body.targetLocale,
      fast: true,
    });

    return NextResponse.json({
      filePath: body.filePath,
      locale: body.targetLocale,
      original: content,
      translated,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request. Provide repositoryId, filePath, and targetLocale." },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : "Translation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
