import type { NextFunction, Request, Response } from "express";
import type { IncomingMessage } from "node:http";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

/** Resolves the signed-in user from the session cookie / bearer token, or null. */
export async function getRequestUser(req: IncomingMessage): Promise<User | null> {
  try {
    return await sdk.authenticateRequest(req as Request);
  } catch {
    return null;
  }
}

/** Express middleware: rejects requests without a valid session with 401. */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = await getRequestUser(req);
  if (!user) {
    res.status(401).json({ ok: false, error: "Please sign in to use this feature." });
    return;
  }
  res.locals.user = user;
  next();
}

type RateLimitOptions = {
  /** Window length in milliseconds. */
  windowMs: number;
  /** Maximum requests per key within one window. */
  max: number;
};

/**
 * Minimal in-memory fixed-window rate limiter. Keys by signed-in user id when
 * `requireAuth` ran first, otherwise by client IP. Good enough for a single Node
 * process; a multi-instance deployment would need a shared store.
 */
export function createRateLimiter({ windowMs, max }: RateLimitOptions) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  const check = (key: string, now = Date.now()) => {
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      if (hits.size > 10_000) {
        hits.forEach((value, k) => {
          if (value.resetAt <= now) hits.delete(k);
        });
      }
      return { allowed: true, retryAfterSeconds: 0 };
    }
    entry.count += 1;
    if (entry.count > max) {
      return { allowed: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
    }
    return { allowed: true, retryAfterSeconds: 0 };
  };

  const middleware = (req: Request, res: Response, next: NextFunction) => {
    const user = res.locals.user as User | undefined;
    const key = user ? `user:${user.id}` : `ip:${req.ip ?? req.socket.remoteAddress ?? "unknown"}`;
    const result = check(key);
    if (!result.allowed) {
      res.setHeader("Retry-After", String(result.retryAfterSeconds));
      res.status(429).json({ ok: false, error: "Too many requests. Please wait a moment and try again." });
      return;
    }
    next();
  };

  return Object.assign(middleware, { check });
}
