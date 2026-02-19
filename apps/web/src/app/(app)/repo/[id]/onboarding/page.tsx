"use client";

import { use, useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import {
  Check,
  ClipboardCopy,
  RefreshCw,
  BookOpen,
  Loader2,
  Sparkles,
  ChevronDown,
} from "lucide-react";

import { trpc } from "@/utils/trpc";
import { LANGUAGES, PROSE_CLASSES } from "@/lib/constants";
import { useUiI18n } from "@/components/ui-i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });

type GenerateState = "idle" | "generating" | "translating" | "done";

function GenerationStatusBar({
  state,
  locale,
}: {
  state: GenerateState;
  locale: string;
}) {
  const { t } = useUiI18n();
  if (state === "idle" || state === "done") return null;

  const langLabel = LANGUAGES.find((l) => l.code === locale)?.label ?? locale;

  return (
    <div className="flex items-center gap-3 border-b border-neutral-700/50 bg-neutral-900/30 px-8 py-2.5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 duration-200">
      <Loader2 className="size-3.5 animate-spin text-primary" />
      <div className="flex items-center gap-2 text-xs">
        <span className="font-medium text-foreground">
          {state === "generating"
            ? t("common.generating")
            : t("common.translating")}
        </span>
        {state === "translating" && (
          <Badge variant="outline" className="text-[10px] font-normal">
            {langLabel}
          </Badge>
        )}
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        <div className="flex gap-0.5">
          <span
            className={`size-1.5 ${state === "generating" ? "bg-primary" : "bg-primary/30"} transition-colors duration-300`}
          />
          <span
            className={`size-1.5 ${state === "translating" ? "bg-primary" : "bg-primary/30"} transition-colors duration-300`}
          />
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const { t } = useUiI18n();

  const [state, setState] = useState<GenerateState>("idle");
  const [locale, setLocale] = useState("en");
  const [streamContent, setStreamContent] = useState("");
  const [copied, setCopied] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const docRef = useRef<HTMLDivElement>(null);

  const noDocsYet = useRef(false);

  const { data: repo, isLoading } = useQuery({
    ...trpc.repository.getById.queryOptions({ id }),
    refetchInterval: (query) => {
      const data = query.state.data;
      const noDocs = data && data.onboardingDocs.length === 0;
      noDocsYet.current = !!noDocs;
      return noDocs && state === "idle" ? 3000 : false;
    },
  });

  const latestDoc = repo?.onboardingDocs[0];
  const selectedDoc = selectedDocId
    ? repo?.onboardingDocs.find((d) => d.id === selectedDocId)
    : null;

  const displayContent =
    state !== "idle"
      ? streamContent
      : (selectedDoc?.content ?? latestDoc?.content ?? "");
  const hasNoDocs = repo && repo.onboardingDocs.length === 0;

  const handleRegenerate = useCallback(async () => {
    setState("generating");
    setStreamContent("");
    setSelectedDocId(null);

    try {
      const res = await fetch("/api/onboarding/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repositoryId: id }),
      });

      if (!res.ok || !res.body) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? t("onboarding.toastGenerationFailed"));
        setState("idle");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setStreamContent(accumulated);
      }

      if (locale !== "en") {
        setState("translating");
        const translateRes = await fetch("/api/onboarding/translate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: accumulated, targetLocale: locale }),
        });
        const translateData = (await translateRes.json()) as {
          translatedText?: string;
          error?: string;
        };

        if (translateRes.ok && translateData.translatedText) {
          accumulated = translateData.translatedText;
          setStreamContent(accumulated);
        } else {
          toast.error(t("onboarding.toastTranslationFallback"));
        }
      }

      const saveRes = await fetch("/api/onboarding/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          repositoryId: id,
          content: accumulated,
          locale,
        }),
      });

      if (saveRes.ok) {
        queryClient.invalidateQueries({
          queryKey: trpc.repository.getById.queryOptions({ id }).queryKey,
        });
      }

      setState("done");
    } catch {
      toast.error(t("onboarding.toastGenerationError"));
      setState("idle");
    }
  }, [id, locale, queryClient, t]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(displayContent);
    setCopied(true);
    toast.success(t("onboarding.toastCopied"));
    setTimeout(() => setCopied(false), 2000);
  }, [displayContent, t]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-8 py-8 px-4 motion-safe:animate-in motion-safe:fade-in duration-200">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (!repo) {
    return (
      <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-2 motion-safe:animate-in motion-safe:fade-in duration-300">
        <BookOpen className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {t("common.repositoryNotFound")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-background motion-safe:animate-in motion-safe:fade-in duration-200">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b bg-background/95 px-0 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center bg-primary/10 p-1.5">
            <BookOpen className="size-4 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-semibold">{t("onboarding.title")}</h1>
            <p className="text-[10px] text-muted-foreground">
              {repo.owner}/{repo.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {repo.onboardingDocs.length > 0 && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={buttonVariants({
                    variant: "outline",
                    size: "sm",
                    className: "h-8 gap-2",
                  })}
                >
                  <span className="text-xs">
                    {LANGUAGES.find(
                      (l) =>
                        l.code === (selectedDoc?.locale ?? latestDoc?.locale),
                    )?.label ?? "English"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {t("onboarding.versionShort", {
                      version: selectedDocId
                        ? repo.onboardingDocs.findIndex(
                            (d) => d.id === selectedDocId,
                          ) + 1
                        : repo.onboardingDocs.length,
                    })}
                  </span>
                  <ChevronDown className="size-3 opacity-50" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {repo.onboardingDocs.map((doc, i) => (
                    <DropdownMenuItem
                      key={doc.id}
                      onClick={() => {
                        setSelectedDocId(doc.id);
                        setState("idle");
                        setStreamContent("");
                      }}
                      className="flex flex-col items-start gap-1"
                    >
                      <div className="flex items-center gap-2 w-full justify-between">
                        <span className="font-medium">
                          {LANGUAGES.find((l) => l.code === doc.locale)
                            ?.label ?? doc.locale}
                        </span>
                        {doc.id === (selectedDocId ?? latestDoc?.id) && (
                          <Check className="size-3" />
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(doc.createdAt).toLocaleDateString()} •{" "}
                        {t("onboarding.versionLabel", {
                          version: repo.onboardingDocs.length - i,
                        })}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="h-4 w-px bg-border mx-1" />

              <DropdownMenu>
                <DropdownMenuTrigger
                  className={buttonVariants({
                    variant: "ghost",
                    size: "sm",
                    className: "h-8 gap-2",
                  })}
                >
                  <RefreshCw className="size-3.5" />
                  <span className="hidden sm:inline">
                    {t("onboarding.regenerate")}
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-3">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <h4 className="text-xs font-medium leading-none">
                        {t("onboarding.newVersion")}
                      </h4>
                      <p className="text-[10px] text-muted-foreground">
                        {t("onboarding.generateFreshGuide")}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Select
                        value={locale}
                        onValueChange={(val) => val && setLocale(val)}
                        disabled={
                          state === "generating" || state === "translating"
                        }
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGES.map((lang) => (
                            <SelectItem
                              key={lang.code}
                              value={lang.code}
                              className="text-xs"
                            >
                              {lang.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        className="w-full h-7 text-xs"
                        onClick={handleRegenerate}
                        disabled={
                          state === "generating" || state === "translating"
                        }
                      >
                        {state === "generating" ? (
                          <>
                            <Loader2 className="mr-2 size-3 animate-spin" />{" "}
                            {t("common.generating")}
                          </>
                        ) : state === "translating" ? (
                          <>
                            <Loader2 className="mr-2 size-3 animate-spin" />{" "}
                            {t("common.translating")}
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 size-3" />{" "}
                            {t("common.generate")}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    className={buttonVariants({
                      variant: "ghost",
                      size: "icon",
                      className: "h-8 w-8",
                    })}
                    onClick={handleCopy}
                    disabled={!displayContent}
                  >
                    {copied ? (
                      <Check className="size-3.5" />
                    ) : (
                      <ClipboardCopy className="size-3.5" />
                    )}
                  </TooltipTrigger>
                  <TooltipContent>{t("onboarding.copyContent")}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}
        </div>
      </header>

      <GenerationStatusBar state={state} locale={locale} />

      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-3xl px-8 py-12">
          {hasNoDocs && state === "idle" ? (
            <div className="flex flex-col items-center justify-center gap-6 border border-dashed border-border p-16 text-center bg-card/50 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 duration-300">
              <div className="bg-muted p-4 border border-border">
                <Sparkles className="size-6 text-primary" />
              </div>
              <div className="space-y-2 max-w-sm">
                <h3 className="text-base font-semibold">
                  {t("onboarding.noDocsYet")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("onboarding.noDocsSubtitle")}
                </p>
              </div>
              <div className="flex items-center gap-2 w-full max-w-xs">
                <Select
                  value={locale}
                  onValueChange={(val) => val && setLocale(val)}
                >
                  <SelectTrigger className="h-9 text-xs flex-1 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem
                        key={lang.code}
                        value={lang.code}
                        className="text-xs"
                      >
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={handleRegenerate}
                  className="h-9 px-4 text-xs"
                >
                  {t("common.generate")}
                </Button>
              </div>
            </div>
          ) : (
            <article
              ref={docRef}
              className={`${PROSE_CLASSES} motion-safe:animate-in motion-safe:fade-in duration-300`}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {displayContent}
              </ReactMarkdown>
            </article>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
