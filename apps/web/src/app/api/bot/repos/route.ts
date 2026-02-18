import { auth } from "@lingo-dev/auth";
import prisma from "@lingo-dev/db";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { getInstallationOctokit } from "@/lib/github-app";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const installationId = searchParams.get("installationId");
    if (!installationId) {
      return NextResponse.json({ error: "Missing installationId" }, { status: 400 });
    }

    const installation = await prisma.botInstallation.findUnique({
      where: { installationId: Number(installationId) },
    });
    if (!installation) {
      return NextResponse.json({ error: "Installation not found" }, { status: 404 });
    }

    const octokit = await getInstallationOctokit(installation.installationId);
    const response = (await octokit.request("GET /installation/repositories", {
      per_page: 100,
    })) as { data: { repositories: Array<{ full_name: string; name: string }> } };

    const repos = response.data.repositories.map((r) => ({
      fullName: r.full_name,
      name: r.name,
    }));

    return NextResponse.json({ repos });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch repos";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
