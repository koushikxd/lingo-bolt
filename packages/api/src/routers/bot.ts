import prisma from "@lingo-dev/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

export async function getGitHubLogins(userId: string): Promise<string[]> {
  const account = await prisma.account.findFirst({
    where: { userId, providerId: "github" },
  });
  if (!account?.accessToken) return [];

  const headers = {
    Authorization: `Bearer ${account.accessToken}`,
    "User-Agent": "lingo-bot",
  };

  const userRes = await fetch("https://api.github.com/user", {
    headers,
  });
  if (!userRes.ok) return [];
  const userData = (await userRes.json()) as { login?: string };

  const orgsRes = await fetch("https://api.github.com/user/orgs?per_page=100", {
    headers: {
      ...headers,
      Accept: "application/vnd.github+json",
    },
  });

  const orgLogins = orgsRes.ok
    ? ((await orgsRes.json()) as Array<{ login?: string }>)
        .map((org) => org.login)
        .filter((login): login is string => typeof login === "string" && login.length > 0)
    : [];

  const logins = [userData.login, ...orgLogins].filter(
    (login): login is string => typeof login === "string" && login.length > 0,
  );

  return Array.from(new Set(logins));
}

async function verifyInstallationAccess(userId: string, installationId: string) {
  const logins = await getGitHubLogins(userId);
  if (logins.length === 0) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Installation not found" });
  }

  const installation = await prisma.botInstallation.findFirst({
    where: { id: installationId, accountLogin: { in: logins } },
  });
  if (!installation) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Installation not found" });
  }

  return installation;
}

export const botRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const logins = await getGitHubLogins(ctx.session.user.id);
    if (logins.length === 0) return [];

    return prisma.botInstallation.findMany({
      where: { accountLogin: { in: logins } },
      orderBy: { createdAt: "desc" },
    });
  }),

  getInstallation: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return verifyInstallationAccess(ctx.session.user.id, input.id);
    }),

  updateSettings: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        defaultLanguage: z.string().min(1).max(10).optional(),
        autoTranslate: z.boolean().optional(),
        autoLabel: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await verifyInstallationAccess(ctx.session.user.id, input.id);

      return prisma.botInstallation.update({
        where: { id: input.id },
        data: {
          ...(input.defaultLanguage !== undefined && {
            defaultLanguage: input.defaultLanguage,
          }),
          ...(input.autoTranslate !== undefined && {
            autoTranslate: input.autoTranslate,
          }),
          ...(input.autoLabel !== undefined && {
            autoLabel: input.autoLabel,
          }),
        },
      });
    }),

  listRepoConfigs: protectedProcedure
    .input(z.object({ installationId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      await verifyInstallationAccess(ctx.session.user.id, input.installationId);

      return prisma.botRepoConfig.findMany({
        where: { installationId: input.installationId },
        orderBy: { repoFullName: "asc" },
      });
    }),

  upsertRepoConfig: protectedProcedure
    .input(
      z.object({
        installationId: z.string().min(1),
        repoFullName: z.string().min(1),
        defaultLanguage: z.string().min(1).max(10).nullish(),
        autoTranslate: z.boolean().nullish(),
        autoLabel: z.boolean().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await verifyInstallationAccess(ctx.session.user.id, input.installationId);

      return prisma.botRepoConfig.upsert({
        where: {
          installationId_repoFullName: {
            installationId: input.installationId,
            repoFullName: input.repoFullName,
          },
        },
        create: {
          installationId: input.installationId,
          repoFullName: input.repoFullName,
          defaultLanguage: input.defaultLanguage ?? undefined,
          autoTranslate: input.autoTranslate ?? undefined,
          autoLabel: input.autoLabel ?? undefined,
        },
        update: {
          ...(input.defaultLanguage !== undefined && {
            defaultLanguage: input.defaultLanguage,
          }),
          ...(input.autoTranslate !== undefined && {
            autoTranslate: input.autoTranslate,
          }),
          ...(input.autoLabel !== undefined && {
            autoLabel: input.autoLabel,
          }),
        },
      });
    }),

  deleteRepoConfig: protectedProcedure
    .input(
      z.object({
        installationId: z.string().min(1),
        repoFullName: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await verifyInstallationAccess(ctx.session.user.id, input.installationId);

      await prisma.botRepoConfig.deleteMany({
        where: {
          installationId: input.installationId,
          repoFullName: input.repoFullName,
        },
      });
    }),
});
