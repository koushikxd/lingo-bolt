"use client";

import { use, useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Download, FileText, Languages } from "lucide-react";

import { trpc } from "@/utils/trpc";
import { PROSE_CLASSES, TRANSLATION_LANGUAGES } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });

type TranslatedFile = { path: string; content: string };

export default function MarkdownPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();

  const { data: repo, isLoading } = useQuery(trpc.repository.getById.queryOptions({ id }));

  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [locale, setLocale] = useState("es");
  const [activeTab, setActiveTab] = useState("original");

  const isIndexed = repo?.status === "indexed" && (repo?.chunksIndexed ?? 0) > 0;

  const { data: mdFiles = [], isLoading: loadingFiles } = useQuery({
    queryKey: [id, "md-files"],
    queryFn: async () => {
      const res = await fetch("/api/markdown/discover", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repositoryId: id }),
      });
      const data = (await res.json()) as { files?: string[] };
      return data.files ?? [];
    },
    enabled: isIndexed,
  });

  const {
    data: fileContent = "",
    isLoading: loadingContent,
  } = useQuery({
    queryKey: [id, "md-content", selectedFile],
    queryFn: async () => {
      const res = await fetch("/api/markdown/content", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repositoryId: id, filePath: selectedFile }),
      });
      const data = (await res.json()) as { content?: string; error?: string };
      if (!res.ok || !data.content) throw new Error(data.error ?? "Failed to load file");
      return data.content;
    },
    enabled: !!selectedFile,
  });

  const translateFileMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/markdown/translate-file", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repositoryId: id, filePath: selectedFile, targetLocale: locale }),
      });
      const data = (await res.json()) as { translated?: string; error?: string };
      if (!res.ok || !data.translated) throw new Error(data.error ?? "Translation failed");
      return data.translated;
    },
    onSuccess: () => {
      setActiveTab("translated");
      toast.success("File translated");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const batchMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/markdown/translate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repositoryId: id, targetLocale: locale }),
      });
      const data = (await res.json()) as { files?: TranslatedFile[]; error?: string };
      if (!res.ok || !data.files) throw new Error(data.error ?? "Batch translation failed");
      return data.files;
    },
    onSuccess: (files) => {
      toast.success(`Translated ${files.length} files`);
      queryClient.invalidateQueries({
        queryKey: trpc.repository.getById.queryOptions({ id }).queryKey,
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSelectFile = (filePath: string) => {
    setSelectedFile(filePath);
    translateFileMutation.reset();
    setActiveTab("original");
  };

  const handleDownloadFile = useCallback((content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleDownloadZip = useCallback(
    async (files: TranslatedFile[], translationLocale: string) => {
      if (files.length === 0) return;
      const { default: JsZip } = await import("jszip");
      const zip = new JsZip();
      for (const file of files) {
        zip.file(file.path, file.content);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${repo?.name ?? "repo"}-${translationLocale}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [repo?.name],
  );

  const translatedContent = translateFileMutation.data ?? "";

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="col-span-1 h-64" />
          <Skeleton className="col-span-3 h-64" />
        </div>
      </div>
    );
  }

  if (!repo) {
    return <p className="py-12 text-center text-sm text-muted-foreground">Repository not found</p>;
  }

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-pretty">Markdown Translation</h1>
        <p className="text-xs text-muted-foreground">
          {repo.owner}/{repo.name}
        </p>
      </div>

      {loadingFiles ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : mdFiles.length === 0 ? (
        <div className="flex items-center justify-center rounded-md border border-dashed py-16">
          <p className="text-sm text-muted-foreground">
            No markdown files found in this repository
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[240px_1fr]">
          <div className="space-y-1">
            <p className="mb-2 text-xs font-medium tabular-nums text-muted-foreground">
              {mdFiles.length} {mdFiles.length === 1 ? "file" : "files"}
            </p>
            {mdFiles.map((f) => (
              <button
                key={f}
                onClick={() => handleSelectFile(f)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors duration-150 ease-out cursor-pointer ${selectedFile === f ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}
              >
                <FileText className="size-3 shrink-0" aria-hidden="true" />
                <span className="min-w-0 truncate">{f}</span>
              </button>
            ))}
            <Separator className="my-3" />
            <div className="space-y-2">
              <NativeSelect
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                disabled={batchMutation.isPending}
                className="text-xs"
                aria-label="Target language"
              >
                {TRANSLATION_LANGUAGES.map((lang) => (
                  <NativeSelectOption key={lang.code} value={lang.code}>
                    {lang.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => batchMutation.mutate()}
                disabled={batchMutation.isPending}
              >
                {batchMutation.isPending ? (
                  <>
                    <Spinner className="size-3" /> Translating all\u2026
                  </>
                ) : (
                  <>
                    <Languages className="size-3" aria-hidden="true" /> Translate All
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="min-h-96 rounded-md border">
            {!selectedFile ? (
              <div className="flex h-full items-center justify-center p-8">
                <p className="text-xs text-muted-foreground">Select a file to view its content</p>
              </div>
            ) : loadingContent ? (
              <div className="space-y-3 p-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between border-b px-4 py-2">
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {selectedFile}
                  </Badge>
                  <div className="flex items-center gap-2">
                    {!translatedContent ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => translateFileMutation.mutate()}
                        disabled={translateFileMutation.isPending}
                      >
                        {translateFileMutation.isPending ? (
                          <>
                            <Spinner className="size-3" /> Translating\u2026
                          </>
                        ) : (
                          <>
                            <Languages className="size-3" aria-hidden="true" /> Translate
                          </>
                        )}
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Download file"
                      onClick={() => {
                        const content =
                          activeTab === "translated" && translatedContent
                            ? translatedContent
                            : fileContent;
                        const name = selectedFile.split("/").pop() ?? "file.md";
                        handleDownloadFile(
                          content,
                          activeTab === "translated" ? `${locale}-${name}` : name,
                        );
                      }}
                    >
                      <Download className="size-3" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
                {translatedContent ? (
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <div className="border-b px-4">
                      <TabsList className="bg-transparent">
                        <TabsTrigger value="original" className="text-xs">
                          Original
                        </TabsTrigger>
                        <TabsTrigger value="translated" className="text-xs">
                          Translated ({TRANSLATION_LANGUAGES.find((l) => l.code === locale)?.label})
                        </TabsTrigger>
                      </TabsList>
                    </div>
                    <TabsContent value="original" className="mt-0">
                      <div className={`p-4 ${PROSE_CLASSES}`}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{fileContent}</ReactMarkdown>
                      </div>
                    </TabsContent>
                    <TabsContent value="translated" className="mt-0">
                      <div className={`p-4 ${PROSE_CLASSES}`}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {translatedContent}
                        </ReactMarkdown>
                      </div>
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className={`p-4 ${PROSE_CLASSES}`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{fileContent}</ReactMarkdown>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {repo.markdownTranslations.length > 0 ? (
        <>
          <Separator />
          <section>
            <h2 className="mb-3 text-sm font-semibold">Previous Translations</h2>
            <div className="space-y-2">
              {(
                repo.markdownTranslations as unknown as Array<{
                  id: string;
                  locale: string;
                  files: unknown;
                  createdAt: string;
                }>
              ).map((t) => {
                const files = t.files as TranslatedFile[];
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-md border px-4 py-3 transition-colors duration-150 ease-out hover:bg-muted/30"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {t.locale}
                      </Badge>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {files.length} {files.length === 1 ? "file" : "files"} &middot;{" "}
                        {new Date(t.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadZip(files, t.locale)}
                    >
                      <Download className="size-3" aria-hidden="true" />
                      Download
                    </Button>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
