"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  Building2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  GitBranch,
  Languages,
  Plus,
  Sparkles,
  Tags,
  Trash2,
  User,
  Zap,
} from "lucide-react";
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

  const installCount = installations?.length ?? 0;

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in mx-auto max-w-2xl space-y-6 pt-6 pb-10">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-pretty">lingo-bolt</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          GitHub App for translation, summarization, and auto-labeling
        </p>
        <div className="mt-3 flex items-center gap-3">
          <Badge variant="outline" className="text-[10px]">
            GitHub App
          </Badge>
          {!isLoading && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {installCount} installation{installCount === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col justify-between border border-neutral-700 bg-neutral-900 p-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium">
              <Bot className="size-4" aria-hidden="true" />
              Installations
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Manage per-account settings and defaults
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs tabular-nums text-muted-foreground">
              {isLoading ? (
                <Skeleton className="h-3 w-20" />
              ) : installCount > 0 ? (
                `${installCount} active`
              ) : (
                "Not installed"
              )}
            </span>
            <a href={GITHUB_APP_INSTALL_URL} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="h-6 gap-1 px-2 text-[10px]">
                <ExternalLink className="size-3" aria-hidden="true" />
                Add to GitHub
              </Button>
            </a>
          </div>
        </div>

        <div className="flex flex-col justify-between border border-neutral-700 bg-neutral-900 p-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium">
              <Languages className="size-4" aria-hidden="true" />
              Commands
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Mention the bot in any issue or pull request
            </p>
          </div>
          <div className="mt-4 space-y-1">
            <code className="block text-[10px] font-mono text-muted-foreground">
              @lingo-bolt translate to spanish
            </code>
            <code className="block text-[10px] font-mono text-muted-foreground">
              @lingo-bolt summarize in french
            </code>
          </div>
        </div>
      </div>

      {isLoading ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold">Installations</h2>
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="border border-neutral-700 bg-neutral-900 p-4 space-y-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
                <Skeleton className="h-7 w-28" />
              </div>
            ))}
          </div>
        </section>
      ) : installCount === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 border border-dashed border-border py-16 text-center">
          <Bot className="size-6 text-muted-foreground" aria-hidden="true" />
          <div className="space-y-1">
            <p className="text-sm font-medium">No installations yet</p>
            <p className="text-xs text-muted-foreground">
              Install lingo-bolt on your GitHub account or organization to get started
            </p>
          </div>
          <a href={GITHUB_APP_INSTALL_URL} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline" className="mt-1">
              <ExternalLink className="size-3.5" aria-hidden="true" />
              Add to GitHub
            </Button>
          </a>
        </div>
      ) : (
        <section>
          <h2 className="mb-3 text-sm font-semibold">Installations</h2>
          <div className="space-y-1.5">
            {installations!.map((inst) => (
              <InstallationCard
                key={inst.id}
                installation={inst}
                onUpdate={(data) => updateMutation.mutate({ id: inst.id, ...data })}
                isPending={updateMutation.isPending}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-1 text-sm font-semibold">Reference</h2>
        <p className="mb-3 text-[11px] text-muted-foreground">
          lingo-bolt lives in your GitHub repos and handles translation automatically. Here&apos;s
          everything it can do.
        </p>
        <div className="space-y-1.5">
          <div className="border border-neutral-700 bg-neutral-900 px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="size-3.5 text-muted-foreground" aria-hidden="true" />
              <span className="text-xs font-medium">What it does automatically</span>
            </div>
            <p className="text-[11px] text-muted-foreground mb-3 pl-5">
              Whenever someone opens an issue or pull request, lingo-bolt kicks in on its own — no
              mention needed.
            </p>
            <div className="space-y-3 pl-5">
              <div className="flex items-start gap-3">
                <Tags className="size-3 mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div>
                  <span className="text-xs font-medium text-foreground">Language detection</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Detects what language the issue or PR is written in and adds a{" "}
                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                      lang:spanish
                    </code>{" "}
                    label so your team knows at a glance.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Languages
                  className="size-3 mt-0.5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div>
                  <span className="text-xs font-medium text-foreground">Auto-translate</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    If the content isn&apos;t already in your default language, the bot posts a
                    translated version as a comment. Works on issues, PRs, and new comments — so
                    your whole team stays in the loop.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="border border-neutral-700 bg-neutral-900 px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="size-3.5 text-muted-foreground" aria-hidden="true" />
              <span className="text-xs font-medium">Commands</span>
            </div>
            <p className="text-[11px] text-muted-foreground mb-3 pl-5">
              Mention{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">
                @lingo-bolt
              </code>{" "}
              in any comment on an issue or PR to trigger a command.
            </p>
            <div className="space-y-3 pl-5">
              <div>
                <ReferenceRow
                  command="@lingo-bolt translate to spanish"
                  description="Translates the issue or PR body into the language you specify."
                />
              </div>
              <div>
                <ReferenceRow
                  command="@lingo-bolt summarize"
                  description="Summarizes the full issue or PR thread in your default language — useful for long discussions."
                />
              </div>
              <div>
                <ReferenceRow
                  command="@lingo-bolt summarize in french"
                  description="Same as above, but in a specific language of your choice."
                />
              </div>
            </div>
          </div>

          <div className="border border-neutral-700 bg-neutral-900 px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <Bot className="size-3.5 text-muted-foreground" aria-hidden="true" />
              <span className="text-xs font-medium">Customization</span>
            </div>
            <p className="text-[11px] text-muted-foreground pl-5">
              Set a default language per installation and override it for individual repos.
              Auto-translate and auto-label can each be toggled on or off — globally or per repo.
              Repo-level settings always take priority over the account-level defaults.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function ReferenceRow({ command, description }: { command: string; description: string }) {
  return (
    <div className="flex items-center gap-3">
      <code className="shrink-0 font-mono text-[10px] text-foreground">{command}</code>
      <span className="text-[10px] text-muted-foreground">— {description}</span>
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

type RepoConfig = {
  id: string;
  installationId: string;
  repoFullName: string;
  defaultLanguage: string | null;
  autoTranslate: boolean | null;
  autoLabel: boolean | null;
};

type GHRepo = { fullName: string; name: string };

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
  const queryClient = useQueryClient();
  const [language, setLanguage] = useState(installation.defaultLanguage);
  const [open, setOpen] = useState(true);
  const [repoSectionOpen, setRepoSectionOpen] = useState(false);

  const { data: repoConfigs } = useQuery({
    ...trpc.bot.listRepoConfigs.queryOptions({
      installationId: installation.id,
    }),
    enabled: repoSectionOpen,
  });

  const { data: reposData } = useQuery<{ repos: GHRepo[] }>({
    queryKey: ["bot-repos", installation.installationId],
    queryFn: async () => {
      const res = await fetch(`/api/bot/repos?installationId=${installation.installationId}`);
      if (!res.ok) throw new Error("Failed to fetch repos");
      return res.json() as Promise<{ repos: GHRepo[] }>;
    },
    enabled: repoSectionOpen,
  });

  const repos = reposData?.repos ?? [];
  const configuredRepos = new Set(repoConfigs?.map((c) => c.repoFullName));
  const unconfiguredRepos = repos.filter((r) => !configuredRepos.has(r.fullName));

  const invalidateConfigs = () => {
    queryClient.invalidateQueries({
      queryKey: trpc.bot.listRepoConfigs.queryOptions({
        installationId: installation.id,
      }).queryKey,
    });
  };

  const upsertMutation = useMutation(
    trpc.bot.upsertRepoConfig.mutationOptions({
      onSuccess: () => {
        toast.success("Repo settings updated");
        invalidateConfigs();
      },
      onError: (error) => {
        toast.error(error.message ?? "Failed to update repo settings");
      },
    }),
  );

  const deleteMutation = useMutation(
    trpc.bot.deleteRepoConfig.mutationOptions({
      onSuccess: () => {
        toast.success("Repo override removed");
        invalidateConfigs();
      },
      onError: (error) => {
        toast.error(error.message ?? "Failed to remove override");
      },
    }),
  );

  return (
    <div className="border border-neutral-700 bg-neutral-900">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors duration-150 ease-out hover:bg-muted/90 cursor-pointer"
      >
        <div className="flex items-center gap-2">
          {installation.accountType === "Organization" ? (
            <Building2 className="size-3.5 text-muted-foreground" aria-hidden="true" />
          ) : (
            <User className="size-3.5 text-muted-foreground" aria-hidden="true" />
          )}
          <span className="text-sm font-medium">{installation.accountLogin}</span>
          <Badge variant="outline" className="text-[10px]">
            {installation.accountType}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">{open ? "Close" : "Settings"}</span>
      </button>

      {open && (
        <div className="divide-y divide-neutral-700 border-t border-neutral-700 px-4">
          <div className="flex items-center justify-between py-3">
            <Label
              htmlFor={`lang-${installation.id}`}
              className="text-xs font-normal text-muted-foreground"
            >
              Default language
            </Label>
            <Select
              value={language}
              onValueChange={(val) => {
                if (!val) return;
                setLanguage(val);
                onUpdate({ defaultLanguage: val });
              }}
            >
              <SelectTrigger id={`lang-${installation.id}`} className="h-7 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value} className="text-xs">
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <Label htmlFor={`auto-translate-${installation.id}`} className="text-xs font-normal">
                Auto-translate
              </Label>
              <p className="text-[10px] text-muted-foreground">
                New issues, PRs, and comments translated automatically
              </p>
            </div>
            <Switch
              id={`auto-translate-${installation.id}`}
              checked={installation.autoTranslate}
              onCheckedChange={(checked) => onUpdate({ autoTranslate: !!checked })}
              disabled={isPending}
            />
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <Label htmlFor={`auto-label-${installation.id}`} className="text-xs font-normal">
                Auto-label
              </Label>
              <p className="text-[10px] text-muted-foreground">
                Detect language and add labels to new issues and PRs
              </p>
            </div>
            <Switch
              id={`auto-label-${installation.id}`}
              checked={installation.autoLabel}
              onCheckedChange={(checked) => onUpdate({ autoLabel: !!checked })}
              disabled={isPending}
            />
          </div>

          <div className="py-3">
            <button
              type="button"
              onClick={() => setRepoSectionOpen((v) => !v)}
              className="flex w-full items-center gap-2 text-left"
            >
              {repoSectionOpen ? (
                <ChevronDown className="size-3 text-muted-foreground" aria-hidden="true" />
              ) : (
                <ChevronRight className="size-3 text-muted-foreground" aria-hidden="true" />
              )}
              <GitBranch className="size-3 text-muted-foreground" aria-hidden="true" />
              <span className="text-xs font-medium">Per-repo overrides</span>
              {repoConfigs && repoConfigs.length > 0 && (
                <Badge variant="outline" className="text-[10px]">
                  {repoConfigs.length}
                </Badge>
              )}
            </button>

            {repoSectionOpen && (
              <div className="mt-3 space-y-2">
                {repoConfigs?.map((config) => (
                  <RepoConfigRow
                    key={config.id}
                    config={config}
                    installationDefaults={installation}
                    onUpdate={(data) =>
                      upsertMutation.mutate({
                        installationId: installation.id,
                        repoFullName: config.repoFullName,
                        ...data,
                      })
                    }
                    onDelete={() =>
                      deleteMutation.mutate({
                        installationId: installation.id,
                        repoFullName: config.repoFullName,
                      })
                    }
                    isPending={upsertMutation.isPending || deleteMutation.isPending}
                  />
                ))}

                {unconfiguredRepos.length > 0 && (
                  <AddRepoOverride
                    repos={unconfiguredRepos}
                    onAdd={(repoFullName) =>
                      upsertMutation.mutate({
                        installationId: installation.id,
                        repoFullName,
                        defaultLanguage: installation.defaultLanguage,
                      })
                    }
                    isPending={upsertMutation.isPending}
                  />
                )}

                {!repoConfigs && (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                )}

                {repoConfigs?.length === 0 &&
                  unconfiguredRepos.length === 0 &&
                  repos.length === 0 &&
                  reposData && (
                    <p className="text-[10px] text-muted-foreground py-1">
                      No repositories found for this installation
                    </p>
                  )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RepoConfigRow({
  config,
  installationDefaults,
  onUpdate,
  onDelete,
  isPending,
}: {
  config: RepoConfig;
  installationDefaults: Installation;
  onUpdate: (data: {
    defaultLanguage?: string | null;
    autoTranslate?: boolean | null;
    autoLabel?: boolean | null;
  }) => void;
  onDelete: () => void;
  isPending: boolean;
}) {
  const effectiveLang = config.defaultLanguage ?? installationDefaults.defaultLanguage;
  const effectiveTranslate = config.autoTranslate ?? installationDefaults.autoTranslate;
  const effectiveLabel = config.autoLabel ?? installationDefaults.autoLabel;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-neutral-700/50 bg-neutral-800/50">
      <div className="flex w-full items-center justify-between px-3 py-2 hover:bg-muted/20 transition-colors">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <GitBranch className="size-3 text-muted-foreground" aria-hidden="true" />
          <span className="text-xs font-medium">{config.repoFullName.split("/")[1]}</span>
          <span className="text-[10px] text-muted-foreground">
            {LANGUAGES.find((l) => l.value === effectiveLang)?.label ?? effectiveLang}
          </span>
        </button>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onDelete}
            disabled={isPending}
            className="p-1 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="size-3" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="p-1 text-muted-foreground"
          >
            {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="divide-y divide-neutral-700/50 border-t border-neutral-700/50 px-3">
          <div className="flex items-center justify-between py-2">
            <span className="text-[10px] text-muted-foreground">Language</span>
            <Select
              value={effectiveLang}
              onValueChange={(val) => {
                if (!val) return;
                onUpdate({
                  defaultLanguage: val === installationDefaults.defaultLanguage ? null : val,
                });
              }}
            >
              <SelectTrigger className="h-6 w-32 text-[10px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value} className="text-xs">
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between py-2">
            <span className="text-[10px] text-muted-foreground">Auto-translate</span>
            <Switch
              checked={effectiveTranslate}
              onCheckedChange={(checked) =>
                onUpdate({
                  autoTranslate: checked === installationDefaults.autoTranslate ? null : !!checked,
                })
              }
              disabled={isPending}
              className="scale-75 origin-right"
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <span className="text-[10px] text-muted-foreground">Auto-label</span>
            <Switch
              checked={effectiveLabel}
              onCheckedChange={(checked) =>
                onUpdate({
                  autoLabel: checked === installationDefaults.autoLabel ? null : !!checked,
                })
              }
              disabled={isPending}
              className="scale-75 origin-right"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function AddRepoOverride({
  repos,
  onAdd,
  isPending,
}: {
  repos: GHRepo[];
  onAdd: (repoFullName: string) => void;
  isPending: boolean;
}) {
  const [selectedRepo, setSelectedRepo] = useState<string>("");

  useEffect(() => {
    setSelectedRepo("");
  }, [repos.length]);

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedRepo} onValueChange={(val) => setSelectedRepo(val ?? "")}>
        <SelectTrigger className="h-7 flex-1 text-[10px]">
          <SelectValue placeholder="Select a repository..." />
        </SelectTrigger>
        <SelectContent>
          {repos.map((repo) => (
            <SelectItem key={repo.fullName} value={repo.fullName} className="text-xs">
              {repo.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        variant="outline"
        className="h-7 gap-1 px-2 text-[10px]"
        disabled={!selectedRepo || isPending}
        onClick={() => {
          if (selectedRepo) {
            onAdd(selectedRepo);
            setSelectedRepo("");
          }
        }}
      >
        <Plus className="size-3" aria-hidden="true" />
        Add
      </Button>
    </div>
  );
}
