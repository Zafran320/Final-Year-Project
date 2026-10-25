import { describe, expect, it } from "vitest";
import {
  createInterviewSession,
  getCareerProfileByUserId,
  getDatabaseUrl,
  getInterviewSessionsByUserId,
  getLatestInterviewSessionByUserId,
  getUserByOpenId,
  updateInterviewSession,
  upsertUser,
} from "./db";
import { getSupabaseAdmin, getSupabaseClient } from "./supabase";

describe("Supabase database helper module", () => {
  it("extracts database url from environment variations", () => {
    const originalEnv = process.env.DATABASE_URL;
    process.env.DATABASE_URL = "postgresql://postgres:secret@db.xyz.supabase.co:5432/postgres";
    expect(getDatabaseUrl()).toBe("postgresql://postgres:secret@db.xyz.supabase.co:5432/postgres");
    if (originalEnv) {
      process.env.DATABASE_URL = originalEnv;
    } else {
      delete process.env.DATABASE_URL;
    }
  });

  it("handles non-existent user and profile lookups gracefully", async () => {
    const user = await getUserByOpenId("non-existent-user-test-unique-id-9999");
    expect(user).toBeUndefined();

    const profile = await getCareerProfileByUserId(9999999);
    expect(profile).toBeUndefined();
  }, 15000);

  it("validates that upsertUser requires openId", async () => {
    // @ts-expect-error test invalid payload
    await expect(upsertUser({ email: "test@example.com" })).rejects.toThrow("User openId is required for upsert");
  });

  it("provides active Supabase clients when env is configured", () => {
    const admin = getSupabaseAdmin();
    const client = getSupabaseClient();
    expect(admin).toBeDefined();
    expect(client).toBeDefined();
  });

  it("durable session storage: creates, persists, retrieves, and overrides interview sessions", async () => {
    const testUserId = 884411;
    const testLevels = JSON.stringify([
      { level_number: 1, difficulty: "Easy", title: "Level 1 Icebreaker", focus_area: "Background" },
      { level_number: 2, difficulty: "Easy", title: "Level 2 Basics", focus_area: "Syntax" },
    ]);

    // 1. Create first session (e.g. Flutter Developer)
    const session1 = await createInterviewSession({
      userId: testUserId,
      companyName: "Systems Limited",
      targetRole: "Flutter Developer",
      levels: testLevels,
      currentLevel: 1,
      status: "generated",
    });

    expect(session1).toBeDefined();
    expect(session1.targetRole).toBe("Flutter Developer");
    expect(session1.companyName).toBe("Systems Limited");

    // 2. Retrieve latest session - should be session 1
    const retrieved1 = await getLatestInterviewSessionByUserId(testUserId);
    expect(retrieved1).toBeDefined();
    expect(retrieved1?.id).toBe(session1.id);
    expect(retrieved1?.targetRole).toBe("Flutter Developer");

    // 3. Update level progression
    const updated = await updateInterviewSession(session1.id, testUserId, {
      currentLevel: 3,
      status: "in_progress",
    });
    expect(updated?.currentLevel).toBe(3);
    expect(updated?.status).toBe("in_progress");

    // 4. Overriding: User generates a new session (e.g. Senior AI Engineer at Google)
    const session2 = await createInterviewSession({
      userId: testUserId,
      companyName: "Google",
      targetRole: "Senior AI Engineer",
      levels: testLevels,
      currentLevel: 1,
      status: "generated",
    });

    // 5. Retrieve latest session again - should seamlessly return session 2 (override)
    const latestAfterOverride = await getLatestInterviewSessionByUserId(testUserId);
    expect(latestAfterOverride).toBeDefined();
    expect(latestAfterOverride?.id).toBe(session2.id);
    expect(latestAfterOverride?.targetRole).toBe("Senior AI Engineer");
    expect(latestAfterOverride?.companyName).toBe("Google");

    // 6. All sessions list contains both
    const allSessions = await getInterviewSessionsByUserId(testUserId);
    expect(allSessions.length).toBeGreaterThanOrEqual(2);
  });

  it("persists arbitrary stage count (1, 3, or dynamic) and real-time live questions & ML biometrics", async () => {
    const testUserId = 771199;
    // Arbitrary 3 dynamic stages (does not require fixed 10 stages)
    const customDynamicStages = JSON.stringify([
      { level_number: 1, difficulty: "Easy", title: "Custom Stage 1", focus_area: "Problem Solving" },
      { level_number: 2, difficulty: "Intermediate", title: "Custom Stage 2", focus_area: "Deep ML" },
      { level_number: 3, difficulty: "Hard", title: "Custom Stage 3", focus_area: "System Design" },
    ]);

    const liveSession = await createInterviewSession({
      userId: testUserId,
      companyName: "OpenAI",
      targetRole: "Research Engineer",
      levels: customDynamicStages,
      currentLevel: 1,
      status: "in_progress",
    });

    expect(liveSession).toBeDefined();
    expect(JSON.parse(liveSession.levels).length).toBe(3);

    // Simulate real-time turn sync with generated question, candidate answer, and live ML telemetry
    const realTimeMetadata = JSON.stringify({
      liveProgress: {
        lastUpdated: new Date().toISOString(),
        currentLevel: 1,
        askedQuestions: ["How does reinforcement learning optimize policy gradients?"],
        recordedAnswers: ["Policy gradient directly optimizes expected reward via log probabilities."],
        liveMetrics: {
          eyeContact: 95,
          confidence: 90,
          communicationClarity: 88,
          speechFluency: 92,
          eyeOpenness: 89,
          hesitationCount: 0,
          stutterCount: 0,
        },
      },
    });

    const updated = await updateInterviewSession(liveSession.id, testUserId, {
      metadata: realTimeMetadata,
      status: "in_progress",
    });

    expect(updated).toBeDefined();
    const fetched = await getLatestInterviewSessionByUserId(testUserId);
    expect(fetched).toBeDefined();
    const parsedMeta = JSON.parse(fetched!.metadata!);
    expect(parsedMeta.liveProgress.askedQuestions[0]).toContain("reinforcement learning");
    expect(parsedMeta.liveProgress.liveMetrics.eyeContact).toBe(95);
    expect(parsedMeta.liveProgress.liveMetrics.speechFluency).toBe(92);
  });
});
