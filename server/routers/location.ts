import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createRateLimiter } from "../_core/requestGuards";
import { publicProcedure, router } from "../_core/trpc";
import { reverseGeocode } from "../services/location";

// Each lookup can hit a paid Google API, so cap how often one user/IP can ask.
const reverseGeocodeLimiter = createRateLimiter({ windowMs: 60_000, max: 20 });

export const locationRouter = router({
  reverseGeocode: publicProcedure
    .input(z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }))
    .mutation(async ({ ctx, input }) => {
      const key = ctx.user ? `user:${ctx.user.id}` : `ip:${ctx.req.ip ?? ctx.req.socket?.remoteAddress ?? "unknown"}`;
      if (!reverseGeocodeLimiter.check(key).allowed) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many location lookups. Please wait a minute." });
      }
      return reverseGeocode(input.lat, input.lng);
    }),
});
