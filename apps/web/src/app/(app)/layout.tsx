"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Bot, ChevronsUpDown, Globe, Languages, LogOut, Plus } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";
import { useUiI18n } from "@/components/ui-i18n-provider";
import { LanguagePickerDialog } from "@/components/language-picker-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

type BreadcrumbEntry = { label: string; href?: string };

function buildBreadcrumbs(
  pathname: string,
  activeRepo: { owner: string; name: string; id: string } | null | undefined,
  translate: (key: "common.repositories" | "appShell.indexNew" | "appShell.breadcrumb.onboarding" | "appShell.breadcrumb.markdown" | "appShell.breadcrumb.chat") => string,
): BreadcrumbEntry[] {
  const crumbs: BreadcrumbEntry[] = [{ label: translate("common.repositories"), href: "/" }];

  if (pathname === "/") return crumbs;

  if (pathname === "/bot") {
    return [{ label: "lingo-bolt" }];
  }

  if (pathname === "/repo/new") {
    crumbs.push({ label: translate("appShell.indexNew") });
    return crumbs;
  }

  if (activeRepo) {
    crumbs.push({
      label: `${activeRepo.owner}/${activeRepo.name}`,
      href: `/repo/${activeRepo.id}`,
    });

    if (pathname.endsWith("/onboarding")) {
      crumbs.push({ label: translate("appShell.breadcrumb.onboarding") });
    } else if (pathname.endsWith("/markdown")) {
      crumbs.push({ label: translate("appShell.breadcrumb.markdown") });
    } else if (pathname.endsWith("/chat")) {
      crumbs.push({ label: translate("appShell.breadcrumb.chat") });
    }
  }

  return crumbs;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const { data: repos, isLoading: loadingRepos } = useQuery(trpc.repository.list.queryOptions());
  const { data: prefs } = useQuery(trpc.user.getPreferences.queryOptions());
  const { t } = useUiI18n();
  const [langPickerOpen, setLangPickerOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return !localStorage.getItem("language-chosen");
  });

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  };

  const repoIdMatch = pathname.match(/^\/repo\/([^/]+)/);
  const activeRepoId = repoIdMatch?.[1] !== "new" ? repoIdMatch?.[1] : null;
  const activeRepo = activeRepoId ? repos?.find((r) => r.id === activeRepoId) : null;
  const breadcrumbs = buildBreadcrumbs(pathname, activeRepo, t);

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" render={<Link href="/" />}>
                <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center">
                  <Globe className="size-3.5" aria-hidden="true" />
                </div>
                <span className="text-sm font-semibold tracking-tight">lingo bolt</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>{t("appShell.repositories")}</SidebarGroupLabel>
            <SidebarGroupAction
              render={<Link href={"/repo/new" as never} />}
              title={t("appShell.indexNew")}
            >
              <Plus aria-hidden="true" />
            </SidebarGroupAction>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {loadingRepos ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <SidebarMenuItem key={i}>
                      <SidebarMenuSkeleton />
                    </SidebarMenuItem>
                  ))
                ) : repos && repos.length > 0 ? (
                  repos.map((repo) => (
                    <SidebarMenuItem key={repo.id}>
                      <SidebarMenuButton
                        className="hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground/70"
                        isActive={activeRepoId === repo.id}
                        render={<Link href={`/repo/${repo.id}` as never} />}
                      >
                        <span className="truncate">
                          {repo.owner}/{repo.name}
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))
                ) : (
                  <p className="px-2 py-1.5 text-xs text-muted-foreground">
                    {t("appShell.noReposYet")}
                  </p>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>{t("appShell.bot")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    className="hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground/70"
                    isActive={pathname === "/bot"}
                    render={<Link href={"/bot" as never} />}
                  >
                    <Bot className="size-3.5" aria-hidden="true" />
                    <span>lingo-bolt</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          {session?.user ? (
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <SidebarMenuButton
                        size="lg"
                        className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
                      />
                    }
                  >
                    <Avatar size="sm">
                      <AvatarImage src={session.user.image ?? undefined} alt={session.user.name} />
                      <AvatarFallback className="text-[10px]">
                        {session.user.name?.charAt(0).toUpperCase() ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate text-xs font-medium">{session.user.name}</span>
                      <span className="truncate text-[10px] text-muted-foreground">
                        {session.user.email}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4" aria-hidden="true" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" side="top" align="end" sideOffset={4}>
                    <div className="flex items-center gap-2 px-2 py-2 text-left text-sm">
                      <Avatar size="sm">
                        <AvatarImage
                          src={session.user.image ?? undefined}
                          alt={session.user.name}
                        />
                        <AvatarFallback className="text-[10px]">
                          {session.user.name?.charAt(0).toUpperCase() ?? "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate text-xs font-medium">{session.user.name}</span>
                        <span className="truncate text-[10px] text-muted-foreground">
                          {session.user.email}
                        </span>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setLangPickerOpen(true)}>
                      <Languages className="size-4" aria-hidden="true" />
                      {t("appShell.language")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="size-4" aria-hidden="true" />
                      {t("appShell.signOut")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          ) : null}
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" aria-label={t("appShell.toggleSidebar")} />
          <Separator orientation="vertical" className="mr-2 h-4!" />
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((crumb, i) => {
                const isLast = i === breadcrumbs.length - 1;
                return (
                  <BreadcrumbItem key={crumb.label}>
                    {i > 0 ? <BreadcrumbSeparator /> : null}
                    {isLast || !crumb.href ? (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink render={<Link href={crumb.href as never} />}>
                        {crumb.label}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex-1 overflow-auto px-3">{children}</div>
      </SidebarInset>

      {prefs && (
        <LanguagePickerDialog
          open={langPickerOpen}
          onClose={() => {
            localStorage.setItem("language-chosen", "1");
            setLangPickerOpen(false);
          }}
          currentLanguage={prefs.preferredLanguage}
        />
      )}
    </SidebarProvider>
  );
}
