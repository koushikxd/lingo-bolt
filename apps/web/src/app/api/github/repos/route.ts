import { auth } from "@lingo-dev/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { listUserRepos } from "@/lib/github";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { accessToken } = await auth.api.getAccessToken({
      body: { providerId: "github" },
      headers: await headers(),
    });

    if (!accessToken) {
      return NextResponse.json({ error: "No GitHub token found" }, { status: 401 });
    }

    const repos = await listUserRepos(accessToken);
    return NextResponse.json({ repos });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch repos";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
