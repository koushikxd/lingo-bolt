"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Globe } from "lucide-react";

import { trpc } from "@/utils/trpc";
import { LANGUAGES } from "@/lib/constants";
import { useUiI18n } from "@/components/ui-i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function LanguagePickerDialog({
  open,
  onClose,
  currentLanguage,
}: {
  open: boolean;
  onClose: () => void;
  currentLanguage: string;
}) {
  const [selected, setSelected] = useState(currentLanguage);
  const queryClient = useQueryClient();
  const { t } = useUiI18n();

  const mutation = useMutation(
    trpc.user.updatePreferences.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.user.getPreferences.queryOptions().queryKey,
        });
        queryClient.invalidateQueries({ queryKey: ["ui-messages"] });
        onClose();
      },
    }),
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="size-4" />
            {t("languagePicker.title")}
          </DialogTitle>
          <DialogDescription>
            {t("languagePicker.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-56 grid-cols-2 gap-1.5 overflow-y-auto py-1">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => setSelected(lang.code)}
              className={`px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                selected === lang.code
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button
            size="sm"
            onClick={() => mutation.mutate({ preferredLanguage: selected })}
            disabled={mutation.isPending}
          >
            {mutation.isPending
              ? t("languagePicker.saving")
              : t("languagePicker.continue")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
