export type BotCommand =
  | { action: "translate"; language: string | null }
  | { action: "summarize"; language: string | null };

const BOT_MENTION = "@lingo-bolt";

export function parseCommand(body: string): BotCommand | null {
  const lower = body.toLowerCase();
  const idx = lower.indexOf(BOT_MENTION);
  if (idx === -1) return null;

  const after = body
    .slice(idx + BOT_MENTION.length)
    .trim()
    .toLowerCase();

  const translateToMatch = after.match(/^translate\s+to\s+(\w[\w\s-]*\w|\w+)/);
  if (translateToMatch) {
    return { action: "translate", language: translateToMatch[1]!.trim() };
  }

  const translateMatch = after.match(/^translate\s+(\w[\w\s-]*\w|\w+)/);
  if (translateMatch && translateMatch[1]!.trim() !== "to") {
    return { action: "translate", language: translateMatch[1]!.trim() };
  }

  const summarizeWithLang = after.match(/^summarize\s+in\s+(\w[\w\s-]*\w|\w+)/);
  if (summarizeWithLang) {
    return { action: "summarize", language: summarizeWithLang[1]!.trim() };
  }

  if (after.startsWith("summarize")) {
    return { action: "summarize", language: null };
  }

  if (after.startsWith("translate")) {
    return { action: "translate", language: null };
  }

  return null;
}
