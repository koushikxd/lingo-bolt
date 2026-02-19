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
import { useUiI18n } from "@/components/ui-i18n-provider";
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

const GITHUB_APP_INSTALL_URL =
  "https://github.com/apps/lingo-bolt/installations/new";

export default function BotDashboardPage() {
  const queryClient = useQueryClient();
  const { data: installations, isLoading } = useQuery(
    trpc.bot.list.queryOptions(),
  );
  const { t } = useUiI18n();

  const updateMutation = useMutation(
    trpc.bot.updateSettings.mutationOptions({
      onSuccess: () => {
        toast.success(t("bot.settingsUpdated"));
        queryClient.invalidateQueries({
          queryKey: trpc.bot.list.queryOptions().queryKey,
        });
      },
      onError: (error) => {
        toast.error(error.message ?? t("bot.settingsUpdateFailed"));
      },
    }),
  );

  const installCount = installations?.length ?? 0;

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in mx-auto max-w-2xl space-y-6 pt-6 pb-10">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-pretty">
          lingo-bolt
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("bot.subtitle")}
        </p>
        <div className="mt-3 flex items-center gap-3">
          <Badge variant="outline" className="text-[10px]">
            {t("bot.githubApp")}
          </Badge>
          {!isLoading && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {t("bot.installationCount", {
                count: installCount,
                suffix: installCount === 1 ? "" : "s",
              })}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 stagger-fade-in">
        <div className="flex flex-col justify-between border border-neutral-700 bg-neutral-900 p-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium">
              <Bot className="size-4" aria-hidden="true" />
              {t("bot.installations")}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("bot.manageSettings")}
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs tabular-nums text-muted-foreground">
              {isLoading ? (
                <Skeleton className="h-3 w-20" />
              ) : installCount > 0 ? (
                t("bot.activeCount", { count: installCount })
              ) : (
                t("bot.notInstalled")
              )}
            </span>
            <a
              href={GITHUB_APP_INSTALL_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                size="sm"
                variant="outline"
                className="h-6 gap-1 px-2 text-[10px]"
              >
                <ExternalLink className="size-3" aria-hidden="true" />
                {t("bot.addToGithub")}
              </Button>
            </a>
          </div>
        </div>

        <div className="flex flex-col justify-between border border-neutral-700 bg-neutral-900 p-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium">
              <Languages className="size-4" aria-hidden="true" />
              {t("bot.commands")}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("bot.mentionDescription")}
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
          <h2 className="mb-3 text-sm font-semibold">
            {t("bot.installations")}
          </h2>
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="border border-neutral-700 bg-neutral-900 p-4 space-y-3"
              >
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
                <Skeleton className="h-7 w-28" />
              </div>
            ))}
          </div>
        </section>
      ) : installCount === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 border border-dashed border-border py-16 text-center motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 duration-300">
          <Bot className="size-6 text-muted-foreground" aria-hidden="true" />
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {t("bot.noInstallationsTitle")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("bot.noInstallationsSubtitle")}
            </p>
          </div>
          <a
            href={GITHUB_APP_INSTALL_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button size="sm" variant="outline" className="mt-1">
              <ExternalLink className="size-3.5" aria-hidden="true" />
              {t("bot.addToGithub")}
            </Button>
          </a>
        </div>
      ) : (
        <section>
          <h2 className="mb-3 text-sm font-semibold">
            {t("bot.installations")}
          </h2>
          <div className="space-y-1.5 stagger-fade-in">
            {installations!.map((inst) => (
              <InstallationCard
                key={inst.id}
                installation={inst}
                onUpdate={(data) =>
                  updateMutation.mutate({ id: inst.id, ...data })
                }
                isPending={updateMutation.isPending}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-1 text-sm font-semibold">{t("bot.reference")}</h2>
        <p className="mb-3 text-[11px] text-muted-foreground">
          {t("bot.referenceSubtitle")}
        </p>
        <div className="space-y-1.5 stagger-fade-in">
          <div className="border border-neutral-700 bg-neutral-900 px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles
                className="size-3.5 text-muted-foreground"
                aria-hidden="true"
              />
              <span className="text-xs font-medium">{t("bot.autoTitle")}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mb-3 pl-5">
              {t("bot.autoSubtitle")}
            </p>
            <div className="space-y-3 pl-5">
              <div className="flex items-start gap-3">
                <Tags
                  className="size-3 mt-0.5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div>
                  <span className="text-xs font-medium text-foreground">
                    {t("bot.languageDetection")}
                  </span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {t("bot.languageDetectionDescription")}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Languages
                  className="size-3 mt-0.5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div>
                  <span className="text-xs font-medium text-foreground">
                    {t("bot.autoTranslate")}
                  </span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {t("bot.autoTranslateDescription")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="border border-neutral-700 bg-neutral-900 px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap
                className="size-3.5 text-muted-foreground"
                aria-hidden="true"
              />
              <span className="text-xs font-medium">{t("bot.commands")}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mb-3 pl-5">
              {t("bot.commandsSubtitle")}
            </p>
            <div className="space-y-3 pl-5">
              <div>
                <ReferenceRow
                  command="@lingo-bolt translate to spanish"
                  description={t("bot.translateCommandDescription")}
                />
              </div>
              <div>
                <ReferenceRow
                  command="@lingo-bolt summarize"
                  description={t("bot.summarizeCommandDescription")}
                />
              </div>
              <div>
                <ReferenceRow
                  command="@lingo-bolt summarize in french"
                  description={t("bot.summarizeInLanguageDescription")}
                />
              </div>
            </div>
          </div>

          <div className="border border-neutral-700 bg-neutral-900 px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <Bot
                className="size-3.5 text-muted-foreground"
                aria-hidden="true"
              />
              <span className="text-xs font-medium">
                {t("bot.customization")}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground pl-5">
              {t("bot.customizationDescription")}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function ReferenceRow({
  command,
  description,
}: {
  command: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <code className="shrink-0 font-mono text-[10px] text-foreground">
        {command}
      </code>
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
  const { t } = useUiI18n();
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
      const res = await fetch(
        `/api/bot/repos?installationId=${installation.installationId}`,
      );
      if (!res.ok) throw new Error(t("bot.failedFetchRepos"));
      return res.json() as Promise<{ repos: GHRepo[] }>;
    },
    enabled: repoSectionOpen,
  });

  const repos = reposData?.repos ?? [];
  const configuredRepos = new Set(repoConfigs?.map((c) => c.repoFullName));
  const unconfiguredRepos = repos.filter(
    (r) => !configuredRepos.has(r.fullName),
  );

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
        toast.success(t("bot.repoSettingsUpdated"));
        invalidateConfigs();
      },
      onError: (error) => {
        toast.error(error.message ?? t("bot.repoSettingsUpdateFailed"));
      },
    }),
  );

  const deleteMutation = useMutation(
    trpc.bot.deleteRepoConfig.mutationOptions({
      onSuccess: () => {
        toast.success(t("bot.repoOverrideRemoved"));
        invalidateConfigs();
      },
      onError: (error) => {
        toast.error(error.message ?? t("bot.repoOverrideRemoveFailed"));
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
            <Building2
              className="size-3.5 text-muted-foreground"
              aria-hidden="true"
            />
          ) : (
            <User
              className="size-3.5 text-muted-foreground"
              aria-hidden="true"
            />
          )}
          <span className="text-sm font-medium">
            {installation.accountLogin}
          </span>
          <Badge variant="outline" className="text-[10px]">
            {installation.accountType}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">
          {open ? t("bot.close") : t("bot.settings")}
        </span>
      </button>

      {open && (
        <div className="divide-y divide-neutral-700 border-t border-neutral-700 px-4">
          <div className="flex items-center justify-between py-3">
            <Label
              htmlFor={`lang-${installation.id}`}
              className="text-xs font-normal text-muted-foreground"
            >
              {t("bot.defaultLanguage")}
            </Label>
            <Select
              value={language}
              onValueChange={(val) => {
                if (!val) return;
                setLanguage(val);
                onUpdate({ defaultLanguage: val });
              }}
            >
              <SelectTrigger
                id={`lang-${installation.id}`}
                className="h-7 w-36 text-xs"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem
                    key={lang.value}
                    value={lang.value}
                    className="text-xs"
                  >
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <Label
                htmlFor={`auto-translate-${installation.id}`}
                className="text-xs font-normal"
              >
                {t("bot.autoTranslate")}
              </Label>
              <p className="text-[10px] text-muted-foreground">
                {t("bot.installationAutoTranslateDescription")}
              </p>
            </div>
            <Switch
              id={`auto-translate-${installation.id}`}
              checked={installation.autoTranslate}
              onCheckedChange={(checked) =>
                onUpdate({ autoTranslate: !!checked })
              }
              disabled={isPending}
            />
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <Label
                htmlFor={`auto-label-${installation.id}`}
                className="text-xs font-normal"
              >
                {t("bot.languageDetection")}
              </Label>
              <p className="text-[10px] text-muted-foreground">
                {t("bot.installationAutoLabelDescription")}
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
                <ChevronDown
                  className="size-3 text-muted-foreground"
                  aria-hidden="true"
                />
              ) : (
                <ChevronRight
                  className="size-3 text-muted-foreground"
                  aria-hidden="true"
                />
              )}
              <GitBranch
                className="size-3 text-muted-foreground"
                aria-hidden="true"
              />
              <span className="text-xs font-medium">
                {t("bot.perRepoOverrides")}
              </span>
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
                    isPending={
                      upsertMutation.isPending || deleteMutation.isPending
                    }
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
                      {t("bot.noReposForInstallation")}
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
  const { t } = useUiI18n();
  const effectiveLang =
    config.defaultLanguage ?? installationDefaults.defaultLanguage;
  const effectiveTranslate =
    config.autoTranslate ?? installationDefaults.autoTranslate;
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
          <GitBranch
            className="size-3 text-muted-foreground"
            aria-hidden="true"
          />
          <span className="text-xs font-medium">
            {config.repoFullName.split("/")[1]}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {LANGUAGES.find((l) => l.value === effectiveLang)?.label ??
              effectiveLang}
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
            {expanded ? (
              <ChevronDown className="size-3" />
            ) : (
              <ChevronRight className="size-3" />
            )}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="divide-y divide-neutral-700/50 border-t border-neutral-700/50 px-3">
          <div className="flex items-center justify-between py-2">
            <span className="text-[10px] text-muted-foreground">
              {t("common.selectLanguage")}
            </span>
            <Select
              value={effectiveLang}
              onValueChange={(val) => {
                if (!val) return;
                onUpdate({
                  defaultLanguage:
                    val === installationDefaults.defaultLanguage ? null : val,
                });
              }}
            >
              <SelectTrigger className="h-6 w-32 text-[10px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem
                    key={lang.value}
                    value={lang.value}
                    className="text-xs"
                  >
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between py-2">
            <span className="text-[10px] text-muted-foreground">
              {t("bot.autoTranslate")}
            </span>
            <Switch
              checked={effectiveTranslate}
              onCheckedChange={(checked) =>
                onUpdate({
                  autoTranslate:
                    checked === installationDefaults.autoTranslate
                      ? null
                      : !!checked,
                })
              }
              disabled={isPending}
              className="scale-75 origin-right"
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <span className="text-[10px] text-muted-foreground">
              {t("bot.languageDetection")}
            </span>
            <Switch
              checked={effectiveLabel}
              onCheckedChange={(checked) =>
                onUpdate({
                  autoLabel:
                    checked === installationDefaults.autoLabel
                      ? null
                      : !!checked,
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
  const { t } = useUiI18n();
  const [selectedRepo, setSelectedRepo] = useState<string>("");

  useEffect(() => {
    setSelectedRepo("");
  }, [repos.length]);

  return (
    <div className="flex items-center gap-2">
      <Select
        value={selectedRepo}
        onValueChange={(val) => setSelectedRepo(val ?? "")}
      >
        <SelectTrigger className="h-7 flex-1 text-[10px]">
          <SelectValue placeholder={t("bot.selectRepositoryPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          {repos.map((repo) => (
            <SelectItem
              key={repo.fullName}
              value={repo.fullName}
              className="text-xs"
            >
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
        {t("bot.add")}
      </Button>
    </div>
  );
}
