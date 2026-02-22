"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Copy,
  ExternalLink,
  GitBranch,
  Plus,
  Star,
  Terminal,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";
import { useUiI18n } from "@/components/ui-i18n-provider";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: repos, isLoading } = useQuery(
    trpc.repository.list.queryOptions(),
  );
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    owner: string;
    name: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const { t } = useUiI18n();

  const deleteMutation = useMutation(
    trpc.repository.delete.mutationOptions({
      onSuccess: () => {
        toast.success(t("dashboard.toastDeleted"));
        queryClient.invalidateQueries({
          queryKey: trpc.repository.list.queryOptions().queryKey,
        });
        setDeleteTarget(null);
      },
      onError: (error) => {
        toast.error(error.message ?? t("dashboard.toastDeleteFailed"));
        setDeleteTarget(null);
      },
    }),
  );

  const confirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteMutation.mutate({ id: deleteTarget.id });
  }, [deleteTarget, deleteMutation]);

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between pt-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-pretty">
            {t("common.repositories")}
          </h1>
          <p className="text-xs text-muted-foreground">
            {t("dashboard.subtitle")}
          </p>
        </div>
        <Link
          href={"/repo/new" as never}
          className={buttonVariants({ size: "sm" })}
        >
          <Plus className="size-3.5" aria-hidden="true" />
          {t("dashboard.indexRepo")}
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border border-border bg-card p-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-64" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      ) : !repos || repos.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 border border-dashed border-border py-16 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 duration-300">
          <p className="text-sm text-muted-foreground">
            {t("dashboard.noReposIndexed")}
          </p>
          <Link
            href={"/repo/new" as never}
            className={buttonVariants({ size: "sm" })}
          >
            <Plus className="size-3.5" aria-hidden="true" />
            {t("dashboard.indexFirstRepo")}
          </Link>
        </div>
      ) : (
        <div className="space-y-2 stagger-fade-in">
          {repos.map((repo) => (
            <ContextMenu key={repo.id}>
              <ContextMenuTrigger>
                <Link
                  href={`/repo/${repo.id}` as never}
                  className="block border border-neutral-700 bg-neutral-900 p-4 transition-colors duration-150 ease-out hover:bg-muted/50 active:scale-[0.99] motion-safe:transition-[background-color,transform]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {repo.owner}/{repo.name}
                    </span>
                    <Badge
                      variant={
                        repo.status === "indexed" ? "default" : "outline"
                      }
                      className="text-[10px]"
                    >
                      {repo.status}
                    </Badge>
                  </div>
                  {repo.description ? (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                      {repo.description}
                    </p>
                  ) : null}
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    {repo.language ? (
                      <span className="flex items-center gap-1">
                        <span
                          className="size-2 bg-primary"
                          aria-hidden="true"
                        />
                        {repo.language}
                      </span>
                    ) : null}
                    <span className="flex items-center gap-1 tabular-nums">
                      <Star className="size-3" aria-hidden="true" />
                      {repo.stars}
                    </span>
                    <span className="flex items-center gap-1 tabular-nums">
                      <GitBranch className="size-3" aria-hidden="true" />
                      {repo.chunksIndexed} chunks
                    </span>
                  </div>
                </Link>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem
                  onClick={() => router.push(`/repo/${repo.id}` as never)}
                >
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                  {t("dashboard.open")}
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                  variant="destructive"
                  onClick={() =>
                    setDeleteTarget({
                      id: repo.id,
                      owner: repo.owner,
                      name: repo.name,
                    })
                  }
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  {t("common.delete")}
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
        </div>
      )}

      <div className="border border-neutral-700 bg-neutral-900 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Terminal className="size-4 text-primary" aria-hidden="true" />
          <h2 className="text-sm font-semibold tracking-tight">
            {t("dashboard.mcpTitle")}
          </h2>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {t("dashboard.mcpSubtitle")}
        </p>

        <div className="space-y-1.5">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Tools
          </span>
          <div className="grid gap-1.5 text-xs text-muted-foreground">
            {([
              ["list_issues", t("dashboard.mcpToolListIssues")],
              ["get_issue", t("dashboard.mcpToolGetIssue")],
              ["translate_doc", t("dashboard.mcpToolTranslateDoc")],
              ["translate_text", t("dashboard.mcpToolTranslateText")],
              ["search_codebase", t("dashboard.mcpToolSearchCodebase")],
              ["get_onboarding", t("dashboard.mcpToolGetOnboarding")],
            ] as const).map(([tool, desc]) => (
              <div key={tool} className="flex items-start gap-2">
                <code className="shrink-0 bg-neutral-800 px-1.5 py-0.5 text-[11px] text-primary">{tool}</code>
                <span>{desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            {t("dashboard.mcpConfigLabel")}
          </span>
          <div className="relative">
            <pre className="overflow-x-auto bg-neutral-950 border border-neutral-800 p-3 text-[11px] leading-relaxed text-neutral-300">
{`{
  "mcpServers": {
    "lingo-bolt": {
      "type": "remote",
      "url": "http://localhost:3000/api/mcp"
    }
  }
}`}
            </pre>
            <button
              type="button"
              className="absolute top-2 right-2 p-1 text-neutral-500 hover:text-neutral-300 transition-colors"
              onClick={() => {
                navigator.clipboard.writeText(
                  JSON.stringify(
                    {
                      mcpServers: {
                        "lingo-bolt": {
                          type: "remote",
                          url: "http://localhost:3000/api/mcp",
                        },
                      },
                    },
                    null,
                    2,
                  ),
                );
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? (
                <Check className="size-3.5" />
              ) : (
                <Copy className="size-3.5" />
              )}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground/70">
            {t("dashboard.mcpRequirement")}
          </p>
        </div>

        <div className="space-y-1.5">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            {t("dashboard.mcpExamples")}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {[
              t("dashboard.mcpPrompt1"),
              t("dashboard.mcpPrompt2"),
              t("dashboard.mcpPrompt3"),
            ].map((prompt) => (
              <span
                key={prompt}
                className="bg-neutral-800 border border-neutral-700 px-2 py-1 text-[11px] text-muted-foreground"
              >
                {prompt}
              </span>
            ))}
          </div>
        </div>

        <a
          href="https://github.com/koushikxd/lingo-bolt/blob/main/SETUP.md#9-mcp-server-optional--ide-integration"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          {t("dashboard.mcpFullSetup")}
        </a>
      </div>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("dashboard.deleteRepositoryTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("dashboard.deleteRepositoryDescription", {
                repo: deleteTarget
                  ? `${deleteTarget.owner}/${deleteTarget.name}`
                  : "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending
                ? t("dashboard.deleting")
                : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
