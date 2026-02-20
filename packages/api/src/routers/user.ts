import prisma from "@lingo-dev/db";
import { z } from "zod";

import { protectedProcedure, router } from "../index";
import { getGitHubLogins } from "./bot";

export const userRouter = router({
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: ctx.session.user.id },
      select: { preferredLanguage: true },
    });
    return user;
  }),

  updatePreferences: protectedProcedure
    .input(
      z.object({
        preferredLanguage: z.string().min(1).max(10),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await prisma.user.update({
        where: { id: ctx.session.user.id },
        data: { preferredLanguage: input.preferredLanguage },
        select: { preferredLanguage: true },
      });

      const logins = await getGitHubLogins(ctx.session.user.id);
      if (logins.length > 0) {
        await prisma.botInstallation.updateMany({
          where: { accountLogin: { in: logins } },
          data: { defaultLanguage: input.preferredLanguage },
        });
      }

      return user;
    }),
});
