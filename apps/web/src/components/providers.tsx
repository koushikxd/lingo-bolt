"use client";

import { QueryClientProvider } from "@tanstack/react-query";

import { queryClient } from "@/utils/trpc";
import { UiI18nProvider } from "@/components/ui-i18n-provider";

import { ThemeProvider } from "./theme-provider";
import { Toaster } from "./ui/sonner";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      forcedTheme="dark"
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <UiI18nProvider>{children}</UiI18nProvider>
      </QueryClientProvider>
      <Toaster richColors />
    </ThemeProvider>
  );
}
