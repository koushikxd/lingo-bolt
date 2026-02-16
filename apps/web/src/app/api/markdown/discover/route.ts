import { getRepositoryMarkdownFiles } from "@lingo-dev/api/lib/rag/index";
import prisma from "@lingo-dev/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  repositoryId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = bodySchema.parse(await req.json());

    const repository = await prisma.repository.findUnique({
      where: { id: body.repositoryId },
    });

    if (!repository) {
      return NextResponse.json({ error: "Repository not found" }, { status: 404 });
    }
    if (repository.status !== "indexed" || repository.chunksIndexed === 0) {
      return NextResponse.json({ error: "Repository is not indexed yet." }, { status: 409 });
    }

    const files = await getRepositoryMarkdownFiles(repository.id);

    return NextResponse.json({ files });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request. Provide a repositoryId." },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : "Failed to discover markdown files";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
