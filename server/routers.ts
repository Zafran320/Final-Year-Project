import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";
import { authRouter } from "./routers/auth";
import { careerProfileRouter } from "./routers/careerProfile";
import { locationRouter } from "./routers/location";
import { practicePreparationRouter } from "./routers/practicePreparation";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  careerProfile: careerProfileRouter,
  location: locationRouter,
  practicePreparation: practicePreparationRouter,
});

export type AppRouter = typeof appRouter;
