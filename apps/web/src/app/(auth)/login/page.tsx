"use client";

import { useState } from "react";
import { Github } from "lucide-react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleGitHubSignIn = async () => {
    setLoading(true);
    const { error } = await authClient.signIn.social({
      provider: "github",
      callbackURL: "/",
    });
    if (error) {
      toast.error(error.message ?? "Failed to sign in with GitHub");
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome</CardTitle>
        <CardDescription>Sign in with your GitHub account to get started</CardDescription>
      </CardHeader>
      <CardContent>
        <Button className="w-full" disabled={loading} onClick={handleGitHubSignIn}>
          {loading ? (
            <>
              <Spinner className="size-3.5" />
              Connecting to GitHub...
            </>
          ) : (
            <>
              <Github className="size-4" />
              Sign in with GitHub
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
