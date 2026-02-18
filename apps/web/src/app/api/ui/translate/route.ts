import { auth } from "@lingo-dev/auth";
import { env } from "@lingo-dev/env/server";
import { LingoDotDevEngine } from "lingo.dev/sdk";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { UI_MESSAGES_EN, type UiMessageKey } from "@/lib/ui-messages";

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
  targetLocale: z.enum(supportedLocales),
});

const engine = new LingoDotDevEngine({ apiKey: env.LINGODOTDEV_API_KEY });
const cache = new Map<string, { expiresAt: number; messages: Record<string, string> }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function flattenMessages(
  input: unknown,
  parentKey = "",
  output: Record<string, string> = {},
): Record<string, string> {
  if (typeof input === "string") {
    if (parentKey) output[parentKey] = input;
    return output;
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return output;
  }

  for (const [key, value] of Object.entries(input)) {
    const nextKey = parentKey ? `${parentKey}.${key}` : key;
    flattenMessages(value, nextKey, output);
  }
  return output;
}

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = bodySchema.parse(await req.json());

    if (body.targetLocale === "en") {
      return NextResponse.json({ locale: "en", messages: UI_MESSAGES_EN });
    }

    const now = Date.now();
    const cached = cache.get(body.targetLocale);
    if (cached && cached.expiresAt > now) {
      return NextResponse.json({
        locale: body.targetLocale,
        messages: cached.messages,
        cached: true,
      });
    }

    const translated = await engine.localizeObject(UI_MESSAGES_EN, {
      sourceLocale: "en",
      targetLocale: body.targetLocale,
      fast: true,
    });

    const flattened = flattenMessages(translated);
    const messages = (Object.keys(UI_MESSAGES_EN) as UiMessageKey[]).reduce<Record<string, string>>(
      (acc, key) => {
        const value = flattened[key];
        if (typeof value === "string" && value.trim().length > 0) {
          acc[key] = value;
        }
        return acc;
      },
      {},
    ) as Record<UiMessageKey, string>;

    cache.set(body.targetLocale, { messages, expiresAt: now + CACHE_TTL_MS });

    return NextResponse.json({ locale: body.targetLocale, messages });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request. Provide targetLocale." }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "UI translation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
