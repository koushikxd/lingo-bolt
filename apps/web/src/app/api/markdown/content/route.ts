import { getRepositoryFileContent } from "@lingo-dev/api/lib/rag/index";
import { auth } from "@lingo-dev/auth";
import prisma from "@lingo-dev/db";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  repositoryId: z.string().min(1),
  filePath: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = bodySchema.parse(await req.json());

    const repository = await prisma.repository.findFirst({
      where: { id: body.repositoryId, userId: session.user.id },
    });

    if (!repository) {
      return NextResponse.json({ error: "Repository not found" }, { status: 404 });
    }

    const content = await getRepositoryFileContent(repository.id, body.filePath);

    return NextResponse.json({ content, filePath: body.filePath });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request. Provide repositoryId and filePath." },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : "Failed to fetch file content";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
