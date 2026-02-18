import { UI_MESSAGES_EN, type UiMessageKey } from "@/lib/ui-messages";

export type UiMessages = Record<UiMessageKey, string>;

export type UiMessageVars = Record<string, string | number>;

export function formatUiMessage(template: string, vars?: UiMessageVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = vars[key];
    return value === undefined ? `{${key}}` : String(value);
  });
}

export function resolveUiMessage(messages: Partial<UiMessages>, key: UiMessageKey): string {
  return messages[key] ?? UI_MESSAGES_EN[key];
}
