"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Building2, ExternalLink, Globe, Languages, Tags, User } from "lucide-react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "pt-BR", label: "Portuguese" },
  { value: "zh-CN", label: "Chinese" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "hi", label: "Hindi" },
  { value: "ar", label: "Arabic" },
  { value: "ru", label: "Russian" },
  { value: "it", label: "Italian" },
  { value: "nl", label: "Dutch" },
  { value: "tr", label: "Turkish" },
  { value: "pl", label: "Polish" },
] as const;

const GITHUB_APP_INSTALL_URL = "https://github.com/apps/lingo-bolt/installations/new";

export default function BotDashboardPage() {
  const queryClient = useQueryClient();
  const { data: installations, isLoading } = useQuery(trpc.bot.list.queryOptions());

  const updateMutation = useMutation(
    trpc.bot.updateSettings.mutationOptions({
      onSuccess: () => {
        toast.success("Settings updated");
        queryClient.invalidateQueries({
          queryKey: trpc.bot.list.queryOptions().queryKey,
        });
      },
      onError: (error) => {
        toast.error(error.message ?? "Failed to update settings");
      },
    }),
  );

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between pt-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-pretty">Bot Management</h1>
          <p className="text-xs text-muted-foreground">
            Manage lingo-bolt installations and settings
          </p>
        </div>
        <a href={GITHUB_APP_INSTALL_URL} target="_blank" rel="noopener noreferrer">
          <Button size="sm">
            <ExternalLink className="size-3.5" aria-hidden="true" />
            Install Bot
          </Button>
        </a>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="border border-border bg-card p-5">
              <div className="space-y-3">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-64" />
                <Skeleton className="h-8 w-32" />
              </div>
            </div>
          ))}
        </div>
      ) : !installations || installations.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 border border-dashed border-border py-16">
          <Bot className="size-8 text-muted-foreground" aria-hidden="true" />
          <div className="text-center">
            <p className="text-sm text-muted-foreground">No bot installations found</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Install lingo-bolt on your GitHub repositories to get started
            </p>
          </div>
          <a href={GITHUB_APP_INSTALL_URL} target="_blank" rel="noopener noreferrer">
            <Button size="sm">
              <ExternalLink className="size-3.5" aria-hidden="true" />
              Install Bot
            </Button>
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {installations.map((inst) => (
            <InstallationCard
              key={inst.id}
              installation={inst}
              onUpdate={(data) => updateMutation.mutate({ id: inst.id, ...data })}
              isPending={updateMutation.isPending}
            />
          ))}
        </div>
      )}

      <div className="border border-border bg-card p-5">
        <h2 className="text-sm font-medium mb-3">Available Commands</h2>
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-start gap-2">
            <Languages className="size-3.5 mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <code className="text-foreground">@lingo-bolt translate to spanish</code>
              <span className="ml-1">— Translates the issue/PR content</span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Globe className="size-3.5 mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <code className="text-foreground">@lingo-bolt summarize</code>
              <span className="ml-1">— Summarizes in the default language</span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Globe className="size-3.5 mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <code className="text-foreground">@lingo-bolt summarize in french</code>
              <span className="ml-1">— Summarizes in a specific language</span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Tags className="size-3.5 mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <span className="text-foreground">Auto-labeling</span>
              <span className="ml-1">
                — Detects language and adds labels like <code>lang:chinese</code>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type Installation = {
  id: string;
  installationId: number;
  accountLogin: string;
  accountType: string;
  defaultLanguage: string;
  autoTranslate: boolean;
  autoLabel: boolean;
};

function InstallationCard({
  installation,
  onUpdate,
  isPending,
}: {
  installation: Installation;
  onUpdate: (data: {
    defaultLanguage?: string;
    autoTranslate?: boolean;
    autoLabel?: boolean;
  }) => void;
  isPending: boolean;
}) {
  const [language, setLanguage] = useState(installation.defaultLanguage);

  return (
    <div className="border border-neutral-700 bg-neutral-900 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {installation.accountType === "Organization" ? (
            <Building2 className="size-4 text-muted-foreground" aria-hidden="true" />
          ) : (
            <User className="size-4 text-muted-foreground" aria-hidden="true" />
          )}
          <span className="text-sm font-medium">{installation.accountLogin}</span>
          <Badge variant="outline" className="text-[10px]">
            {installation.accountType}
          </Badge>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor={`lang-${installation.id}`} className="text-xs">
            Default Language
          </Label>
          <Select
            value={language}
            onValueChange={(val) => {
              if (!val) return;
              setLanguage(val);
              onUpdate({ defaultLanguage: val });
            }}
          >
            <SelectTrigger id={`lang-${installation.id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor={`auto-translate-${installation.id}`} className="text-xs">
              Auto-translate
            </Label>
            <p className="text-[10px] text-muted-foreground">
              Translate new issues and comments to your default language
            </p>
          </div>
          <Switch
            id={`auto-translate-${installation.id}`}
            checked={installation.autoTranslate}
            onCheckedChange={(checked) => onUpdate({ autoTranslate: !!checked })}
            disabled={isPending}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor={`auto-label-${installation.id}`} className="text-xs">
              Auto-label
            </Label>
            <p className="text-[10px] text-muted-foreground">
              Detect language and add labels to new issues
            </p>
          </div>
          <Switch
            id={`auto-label-${installation.id}`}
            checked={installation.autoLabel}
            onCheckedChange={(checked) => onUpdate({ autoLabel: !!checked })}
            disabled={isPending}
          />
        </div>
      </div>
    </div>
  );
}
