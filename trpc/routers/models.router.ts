import { allModels } from '@/lib/ai/all-models';
import { createTRPCRouter, publicProcedure } from '@/trpc/init';

export const modelsRouter = createTRPCRouter({
  getAvailableModels: publicProcedure.query(async () => {
    return allModels;
  }),
});
