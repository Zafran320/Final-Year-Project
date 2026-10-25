import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

const mocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  getUser: vi.fn(),
  createUser: vi.fn(),
  hasAdminRole: vi.fn(),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  createSessionToken: vi.fn(),
}));

vi.mock("../supabase", () => ({
  hasSupabaseAdminRole: () => mocks.hasAdminRole(),
  getSupabaseAdmin: () => ({
    auth: {
      signUp: mocks.signUp,
      signInWithPassword: mocks.signInWithPassword,
      getUser: mocks.getUser,
      admin: {
        createUser: mocks.createUser,
      },
    },
  }),
  getSupabaseClient: () => ({
    auth: {
      signUp: mocks.signUp,
      signInWithPassword: mocks.signInWithPassword,
      getUser: mocks.getUser,
    },
  }),
}));

vi.mock("../db", () => ({
  upsertUser: mocks.upsertUser,
  getUserByOpenId: mocks.getUserByOpenId,
}));

vi.mock("../_core/sdk", () => ({
  sdk: {
    createSessionToken: mocks.createSessionToken,
  },
}));

function createTestContext() {
  const setCookies: { name: string; val: string; options: Record<string, unknown> }[] = [];
  const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];

  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {
        origin: "https://careertwin-ai.vercel.app",
      },
    } as TrpcContext["req"],
    res: {
      cookie: (name: string, val: string, options: Record<string, unknown>) => {
        setCookies.push({ name, val, options });
      },
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, setCookies, clearedCookies };
}

describe("auth router with Supabase integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createSessionToken.mockResolvedValue("mocked-session-jwt-token");
    mocks.hasAdminRole.mockReturnValue(true);
  });

  it("reports googleStatus enabled when supabase is available", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const status = await caller.auth.googleStatus();
    expect(status.enabled).toBe(true);
  });

  it("successfully signs up with email using admin auto-confirm (zero rate limit)", async () => {
    const { ctx, setCookies } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    mocks.hasAdminRole.mockReturnValue(true);
    mocks.createUser.mockResolvedValue({
      data: {
        user: {
          id: "supa-user-admin-123",
          email: "ayesha@example.com",
          user_metadata: { name: "Ayesha Khan" },
        },
      },
      error: null,
    });

    mocks.getUserByOpenId.mockResolvedValue({
      id: 10,
      openId: "supabase:supa-user-admin-123",
      email: "ayesha@example.com",
      name: "Ayesha Khan",
      role: "user",
    });

    const result = await caller.auth.signUp({
      email: "ayesha@example.com",
      password: "strongpassword123",
      name: "Ayesha Khan",
    });

    expect(result.success).toBe(true);
    expect(result.user.name).toBe("Ayesha Khan");
    expect(mocks.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "ayesha@example.com",
        password: "strongpassword123",
        email_confirm: true,
      })
    );
    expect(setCookies.length).toBe(1);
    expect(setCookies[0].name).toBe("app_session_id");
  });

  it("falls back to standard signUp with dynamic redirect URL when admin is not available", async () => {
    const { ctx, setCookies } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    mocks.hasAdminRole.mockReturnValue(false);
    mocks.signUp.mockResolvedValue({
      data: {
        user: {
          id: "supa-user-fallback-456",
          email: "candidate@example.com",
          user_metadata: { name: "Candidate Fallback" },
        },
      },
      error: null,
    });

    mocks.getUserByOpenId.mockResolvedValue({
      id: 15,
      openId: "supabase:supa-user-fallback-456",
      email: "candidate@example.com",
      name: "Candidate Fallback",
      role: "user",
    });

    const result = await caller.auth.signUp({
      email: "candidate@example.com",
      password: "strongpassword123",
      name: "Candidate Fallback",
    });

    expect(result.success).toBe(true);
    expect(mocks.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "candidate@example.com",
        options: expect.objectContaining({
          emailRedirectTo: "https://careertwin-ai.vercel.app/auth/callback",
        }),
      })
    );
    expect(setCookies.length).toBe(1);
  });

  it("successfully signs in with password and sets session cookie", async () => {
    const { ctx, setCookies } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    mocks.signInWithPassword.mockResolvedValue({
      data: {
        user: {
          id: "supa-user-456",
          email: "candidate@example.com",
          user_metadata: { full_name: "Candidate Test" },
        },
      },
      error: null,
    });

    mocks.getUserByOpenId.mockResolvedValue({
      id: 11,
      openId: "supabase:supa-user-456",
      email: "candidate@example.com",
      name: "Candidate Test",
      role: "user",
    });

    const result = await caller.auth.login({
      email: "candidate@example.com",
      password: "validpassword123",
    });

    expect(result.success).toBe(true);
    expect(mocks.upsertUser).toHaveBeenCalledWith(
      expect.objectContaining({
        openId: "supabase:supa-user-456",
        loginMethod: "email",
      })
    );
    expect(setCookies.length).toBe(1);
  });

  it("synchronizes Google OAuth Supabase session correctly", async () => {
    const { ctx, setCookies } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    mocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: "supa-oauth-789",
          email: "googleuser@gmail.com",
          app_metadata: { provider: "google" },
          user_metadata: { name: "Google User" },
        },
      },
      error: null,
    });

    mocks.getUserByOpenId.mockResolvedValue({
      id: 12,
      openId: "supabase:supa-oauth-789",
      email: "googleuser@gmail.com",
      name: "Google User",
      role: "user",
    });

    const result = await caller.auth.syncSupabaseSession({
      accessToken: "mock-supabase-access-token",
    });

    expect(result.success).toBe(true);
    expect(result.user.name).toBe("Google User");
    expect(mocks.upsertUser).toHaveBeenCalledWith(
      expect.objectContaining({
        openId: "supabase:supa-oauth-789",
        loginMethod: "google",
      })
    );
    expect(setCookies.length).toBe(1);
  });
});
