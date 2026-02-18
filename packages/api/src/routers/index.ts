import { protectedProcedure, publicProcedure, router } from "../index";
import { botRouter } from "./bot";
import { repositoryRouter } from "./repository";
import { userRouter } from "./user";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  privateData: protectedProcedure.query(({ ctx }) => {
    return {
      message: "This is private",
      user: ctx.session.user,
    };
  }),
  repository: repositoryRouter,
  bot: botRouter,
  user: userRouter,
});
export type AppRouter = typeof appRouter;
