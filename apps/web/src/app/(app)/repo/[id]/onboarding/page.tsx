"use client";

import { use, useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Check, ClipboardCopy, RefreshCw } from "lucide-react";

import { trpc } from "@/utils/trpc";
import { LANGUAGES, PROSE_CLASSES } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });

type GenerateState = "idle" | "generating" | "translating" | "done";

export default function OnboardingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();

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
    state !== "idle" ? streamContent : (selectedDoc?.content ?? latestDoc?.content ?? "");
  const displayLocale = selectedDoc?.locale ?? latestDoc?.locale ?? "en";
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
        toast.error(data.error ?? "Failed to generate docs");
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
          toast.error("Translation failed, showing English version");
        }
      }

      const saveRes = await fetch("/api/onboarding/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repositoryId: id, content: accumulated, locale }),
      });

      if (saveRes.ok) {
        queryClient.invalidateQueries({
          queryKey: trpc.repository.getById.queryOptions({ id }).queryKey,
        });
      }

      setState("done");
    } catch {
      toast.error("Something went wrong during generation");
      setState("idle");
    }
  }, [id, locale, queryClient]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(displayContent);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }, [displayContent]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!repo) {
    return <p className="py-12 text-center text-sm text-muted-foreground">Repository not found</p>;
  }

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-pretty">Onboarding Docs</h1>
        <p className="text-xs text-muted-foreground">
          {repo.owner}/{repo.name}
        </p>
      </div>

      {hasNoDocs && state === "idle" ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed py-16">
          <Spinner className="size-5" />
          <p className="text-sm text-muted-foreground">Generating onboarding documentation\u2026</p>
          <p className="text-xs text-muted-foreground">This happens automatically after indexing</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {repo.onboardingDocs.length > 1 ? (
                <NativeSelect
                  value={selectedDocId ?? latestDoc?.id ?? ""}
                  onChange={(e) => {
                    setSelectedDocId(e.target.value || null);
                    setState("idle");
                    setStreamContent("");
                  }}
                  className="text-xs"
                  aria-label="Select document version"
                >
                  {repo.onboardingDocs.map((doc) => (
                    <NativeSelectOption key={doc.id} value={doc.id}>
                      {LANGUAGES.find((l) => l.code === doc.locale)?.label ?? doc.locale} —{" "}
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              ) : (
                <Badge variant="outline" className="text-[10px]">
                  {displayLocale}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {displayContent ? (
                <Button variant="outline" size="sm" onClick={handleCopy} aria-label="Copy to clipboard">
                  {copied ? <Check className="size-3" /> : <ClipboardCopy className="size-3" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              ) : null}
            </div>
          </div>

          {displayContent ? (
            <div ref={docRef} className={PROSE_CLASSES}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayContent}</ReactMarkdown>
            </div>
          ) : null}

          <Separator />

          <div className="flex items-center gap-2">
            <NativeSelect
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              disabled={state === "generating" || state === "translating"}
              className="text-xs"
              aria-label="Target language"
            >
              {LANGUAGES.map((lang) => (
                <NativeSelectOption key={lang.code} value={lang.code}>
                  {lang.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={state === "generating" || state === "translating"}
            >
              {state === "generating" ? (
                <>
                  <Spinner className="size-3" /> Generating\u2026
                </>
              ) : state === "translating" ? (
                <>
                  <Spinner className="size-3" /> Translating\u2026
                </>
              ) : (
                <>
                  <RefreshCw className="size-3" aria-hidden="true" /> Regenerate
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
