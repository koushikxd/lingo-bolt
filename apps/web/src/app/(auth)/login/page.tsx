"use client";

import { useState } from "react";
import { Github } from "lucide-react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { useUiI18n } from "@/components/ui-i18n-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const { t } = useUiI18n();

  const handleGitHubSignIn = async () => {
    setLoading(true);
    const { error } = await authClient.signIn.social({
      provider: "github",
      callbackURL: "/",
    });
    if (error) {
      toast.error(error.message ?? t("login.signInFailed"));
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("login.welcome")}</CardTitle>
        <CardDescription>{t("login.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button className="w-full" disabled={loading} onClick={handleGitHubSignIn}>
          {loading ? (
            <>
              <Spinner className="size-3.5" />
              {t("login.connectingGithub")}
            </>
          ) : (
            <>
              <Github className="size-4" />
              {t("login.signInGithub")}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
