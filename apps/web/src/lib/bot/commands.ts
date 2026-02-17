export type BotCommand =
  | { action: "translate"; language: string }
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

  const translateMatch = after.match(/^translate\s+to\s+(\w[\w\s-]*\w|\w+)/);
  if (translateMatch) {
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
    return { action: "translate", language: "english" };
  }

  return null;
}
