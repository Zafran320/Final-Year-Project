import "dotenv/config";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerGoogleAuthRoutes } from "./googleAuth";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { registerRoadmapRestRoutes } from "../roadmapRest";
import { registerTtsRoutes } from "../ttsRouter";
import { createGeminiLiveToken } from "../geminiLiveToken";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { createRateLimiter, requireAuth } from "./requestGuards";

export function createApp(): Express {
  const app = express();

  // In serverless environments (Vercel), only normalize API routes if /api was stripped
  if (process.env.VERCEL) {
    app.use((req: Request, _res: Response, next: NextFunction) => {
      if (
        !req.url.startsWith("/api") &&
        !req.url.startsWith("/local-storage") &&
        !req.url.startsWith("/manus-storage")
      ) {
        req.url = `/api${req.url.startsWith("/") ? "" : "/"}${req.url}`;
      }
      next();
    });
  }

  // tRPC carries base64 uploads (resume ≤7 MB, company prep up to 4 × 4.5 MB), so it
  // gets a larger body limit; every other route stays small.
  app.use(["/api/trpc", "/trpc"], express.json({ limit: "25mb" }));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: true }));

  // Health check endpoint
  app.get(["/api/health", "/health"], (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: Date.now(),
      platform: process.env.VERCEL ? "vercel-serverless" : "node-server",
    });
  });

  // Diagnostic endpoint for Gemini Live WebSocket endpoint on serverless environments (e.g. Vercel)
  // Real-time speech-to-speech WebSockets require a persistent Node process (handled in index.ts via server.on("upgrade")).
  // In serverless environments, persistent WebSockets cannot run on ephemeral HTTP lambdas.
  app.all(["/api/gemini-live-ws", "/gemini-live-ws"], (_req: Request, res: Response) => {
    res.status(501).json({
      ok: false,
      code: "WEBSOCKET_UNSUPPORTED_ON_SERVERLESS",
      message:
        "Real-time speech-to-speech WebSockets cannot run directly on Vercel Serverless Functions. Please configure VITE_GEMINI_LIVE_WS_URL to point to a persistent Node host (e.g. Render, Railway, Fly.io) or deploy on a persistent Node server.",
      docs: "https://vercel.com/guides/do-vercel-serverless-functions-support-websocket-connections",
    });
  });

  // Ephemeral token endpoint for client-direct Gemini Live WebSockets (enables real-time speech on Vercel)
  const liveTokenLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });
  app.all(["/api/gemini-live-token", "/gemini-live-token"], requireAuth, liveTokenLimiter, async (_req: Request, res: Response) => {
    const result = await createGeminiLiveToken();
    return res.status(result.status || (result.ok ? 200 : 500)).json(result);
  });

  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerGoogleAuthRoutes(app);
  registerRoadmapRestRoutes(app);
  registerTtsRoutes(app);

  // tRPC API - supports both /api/trpc and /trpc for serverless rewrites
  app.use(
    ["/api/trpc", "/trpc"],
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError({ error, path }) {
        console.error(`[tRPC Error at ${path ?? "unknown"}]:`, error);
      },
    })
  );

  // Global error handler - ensure JSON is returned, never raw HTML
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[Express Error Handler]:", err);
    if (!res.headersSent) {
      res.status(err.status || err.statusCode || 500).json({
        error: {
          message: err.message || "A server error occurred",
          code: err.code || "INTERNAL_SERVER_ERROR",
        },
      });
    }
  });

  return app;
}

export const app = createApp();
export default app;
