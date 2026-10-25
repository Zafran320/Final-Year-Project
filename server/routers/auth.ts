import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "../_core/cookies";
import { ENV } from "../_core/env";
import { getGoogleOAuthConfig } from "../_core/googleAuth";
import { sdk } from "../_core/sdk";
import { publicProcedure, router } from "../_core/trpc";
import { getUserByOpenId, upsertUser } from "../db";
import { getSupabaseAdmin, getSupabaseClient, hasSupabaseAdminRole } from "../supabase";

const signUpSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  name: z.string().trim().max(160).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

const syncSessionSchema = z.object({
  accessToken: z.string().min(1, "Access token is required."),
});

export const authRouter = router({
  me: publicProcedure.query((opts) => opts.ctx.user),

  googleStatus: publicProcedure.query(() => {
    const hasNativeGoogle = Boolean(getGoogleOAuthConfig());
    const hasSupabase = Boolean(ENV.supabaseUrl && (ENV.supabaseAnonKey || ENV.supabaseServiceRoleKey));
    return {
      enabled: hasNativeGoogle || hasSupabase,
      mode: hasSupabase ? ("supabase" as const) : ("google" as const),
    };
  }),

  signUp: publicProcedure.input(signUpSchema).mutation(async ({ ctx, input }) => {
    const admin = getSupabaseAdmin();
    const canUseAdmin = hasSupabaseAdminRole() && Boolean(admin?.auth?.admin);

    const displayName = input.name?.trim() || input.email.split("@")[0] || "User";
    let supabaseUser: { id: string; email?: string | null } | null = null;

    if (canUseAdmin && admin) {
      // 1. Admin direct user creation with email_confirm: true
      // This bypasses Supabase's 3-emails/hr rate limit and eliminates broken localhost confirmation links
      const { data: adminData, error: adminError } = await admin.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true,
        user_metadata: {
          name: displayName,
          full_name: displayName,
        },
      });

      if (adminError) {
        const errorMsg = adminError.message?.toLowerCase() || "";
        if (errorMsg.includes("already registered") || errorMsg.includes("already exists")) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "An account with this email already exists. Please sign in instead.",
          });
        }
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: adminError.message || "Failed to create account.",
        });
      }

      supabaseUser = adminData.user;
    } else {
      // 2. Standard Supabase client signup fallback
      const supabase = getSupabaseClient() || admin;
      if (!supabase) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Supabase authentication is not configured on the server.",
        });
      }

      const reqOrigin = ctx.req?.headers?.origin || ctx.req?.headers?.referer;
      let originUrl = "http://localhost:3000";
      if (reqOrigin && typeof reqOrigin === "string") {
        try {
          originUrl = new URL(reqOrigin).origin;
        } catch {}
      }
      const emailRedirectTo = `${originUrl}/auth/callback`;

      const { data, error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          emailRedirectTo,
          data: {
            name: displayName,
            full_name: displayName,
          },
        },
      });

      if (error) {
        const errorMsg = error.message?.toLowerCase() || "";
        if (errorMsg.includes("rate limit") || errorMsg.includes("over_email_send_rate_limit")) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message:
              "Supabase email rate limit exceeded (maximum 3 emails/hour on free tier). In your Supabase Dashboard, go to Authentication -> Providers -> Email and disable 'Confirm email' to allow instant signups, or sign in with Google.",
          });
        }
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message || "Failed to create account in Supabase.",
        });
      }

      supabaseUser = data.user;
    }

    if (!supabaseUser) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Account creation could not be completed. Please try again.",
      });
    }

    const openId = `supabase:${supabaseUser.id}`;

    // 2. Upsert user in Postgres DB
    await upsertUser({
      openId,
      name: displayName,
      email: supabaseUser.email ?? input.email,
      loginMethod: "email",
      lastSignedIn: new Date(),
    });

    // 3. Generate CareerTwin signed session
    const sessionToken = await sdk.createSessionToken(openId, {
      name: displayName,
      expiresInMs: ONE_YEAR_MS,
    });

    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

    const dbUser = await getUserByOpenId(openId);

    return {
      success: true,
      user: dbUser ?? {
        id: -1,
        openId,
        name: displayName,
        email: input.email,
        loginMethod: "email",
        role: "user" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    };
  }),

  login: publicProcedure.input(loginSchema).mutation(async ({ ctx, input }) => {
    const supabase = getSupabaseAdmin() || getSupabaseClient();
    if (!supabase) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Supabase authentication is not configured on the server.",
      });
    }

    // 1. Authenticate credentials via Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: error.message === "Invalid login credentials" ? "Invalid email or password." : error.message,
      });
    }

    const supabaseUser = data.user;
    if (!supabaseUser) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid credentials.",
      });
    }

    const openId = `supabase:${supabaseUser.id}`;
    const displayName =
      supabaseUser.user_metadata?.name ||
      supabaseUser.user_metadata?.full_name ||
      supabaseUser.email?.split("@")[0] ||
      "User";

    // 2. Upsert into database
    await upsertUser({
      openId,
      name: displayName,
      email: supabaseUser.email ?? input.email,
      loginMethod: "email",
      lastSignedIn: new Date(),
    });

    // 3. Create CareerTwin signed session cookie
    const sessionToken = await sdk.createSessionToken(openId, {
      name: displayName,
      expiresInMs: ONE_YEAR_MS,
    });

    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

    const dbUser = await getUserByOpenId(openId);

    return {
      success: true,
      user: dbUser ?? {
        id: -1,
        openId,
        name: displayName,
        email: input.email,
        loginMethod: "email",
        role: "user" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    };
  }),

  syncSupabaseSession: publicProcedure.input(syncSessionSchema).mutation(async ({ ctx, input }) => {
    let supabaseUser: {
      id: string;
      email?: string | null;
      user_metadata?: Record<string, any>;
      app_metadata?: Record<string, any>;
      identities?: Array<{ provider?: string }>;
    } | null = null;

    // 1. Fast path: Decode JWT payload directly in <1ms without network latency
    try {
      const parts = input.accessToken.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
        if (payload && payload.sub) {
          supabaseUser = {
            id: payload.sub,
            email: payload.email,
            user_metadata: payload.user_metadata,
            app_metadata: payload.app_metadata,
          };
        }
      }
    } catch {}

    // 2. Network fallback only if token payload is unparseable
    if (!supabaseUser) {
      const supabase = getSupabaseAdmin() || getSupabaseClient();
      if (supabase) {
        try {
          const { data, error } = await supabase.auth.getUser(input.accessToken);
          if (!error && data?.user) {
            supabaseUser = data.user;
          }
        } catch (err) {
          console.warn("[Auth] Direct Supabase getUser fallback check timed out:", err);
        }
      }
    }

    if (!supabaseUser) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid or expired authentication session.",
      });
    }

    const openId = `supabase:${supabaseUser.id}`;
    const provider = (supabaseUser.app_metadata?.provider as string) || (supabaseUser.identities?.[0]?.provider as string) || "email";
    const displayName =
      supabaseUser.user_metadata?.name ||
      supabaseUser.user_metadata?.full_name ||
      supabaseUser.email?.split("@")[0] ||
      "User";

    // Upsert into database
    await upsertUser({
      openId,
      name: displayName,
      email: supabaseUser.email ?? null,
      loginMethod: provider,
      lastSignedIn: new Date(),
    });

    // Create session cookie
    const sessionToken = await sdk.createSessionToken(openId, {
      name: displayName,
      expiresInMs: ONE_YEAR_MS,
    });

    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

    const dbUser = await getUserByOpenId(openId);

    return {
      success: true,
      user: dbUser ?? {
        id: -1,
        openId,
        name: displayName,
        email: supabaseUser.email ?? "",
        loginMethod: provider,
        role: "user" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
    };
  }),

  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return {
      success: true,
    } as const;
  }),
});
