import fs from "fs";
import path from "path";
import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { careerProfiles, InsertCareerProfile, InsertUser, User, users, CareerProfile, interviewSessions, InterviewSession, InsertInterviewSession } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { getSupabaseAdmin, getSupabaseClient } from "./supabase";

let _client: postgres.Sql | null = null;
let _db: ReturnType<typeof drizzle> | null = null;
let _directDbFailed = false;

export function getDatabaseUrl(): string | undefined {
  const url = (process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || process.env.SUPABASE_DB_URL || ENV.databaseUrl || "").trim();
  if (!url || url === "undefined" || url.includes("[YOUR-DATABASE-PASSWORD]") || url.includes("[PASSWORD]")) {
    return undefined;
  }
  return url;
}

export function markDirectDbFailed() {
  _directDbFailed = true;
  _db = null;
}

function getSupabase() {
  return getSupabaseAdmin() || getSupabaseClient();
}

export function isDirectDbPreferred(): boolean {
  if (process.env.USE_DIRECT_DB === "true") return true;
  // If Supabase API client is available, default to HTTPS REST for universal IPv4/IPv6 reachability
  if (getSupabase()) return false;
  return Boolean(getDatabaseUrl());
}

// Lazily create the Supabase PostgreSQL drizzle instance when explicitly requested or standalone
export async function getDb() {
  if (!isDirectDbPreferred() || _directDbFailed) return null;
  const connectionString = getDatabaseUrl();
  if (!_db && connectionString) {
    try {
      _client = postgres(connectionString, {
        prepare: false,
        max: 10,
        idle_timeout: 10,
        connect_timeout: 2,
      });
      _db = drizzle(_client);
    } catch (error) {
      console.warn("[Database] Direct PostgreSQL connection failed, falling back to Supabase API:", error);
      markDirectDbFailed();
    }
  }
  return _db;
}

// ─── Multi-Tier Durable Storage (Memory + Disk Backup + Supabase Cloud) ───────
const isServerlessEnv = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = isServerlessEnv
  ? path.resolve("/tmp", ".data")
  : path.resolve(process.cwd(), ".data");
const SESSIONS_FILE = path.resolve(DATA_DIR, "interview_sessions.json");
const PROFILES_FILE = path.resolve(DATA_DIR, "career_profiles.json");
const USERS_FILE = path.resolve(DATA_DIR, "users.json");

function loadDiskUsers(): Map<string, User> {
  const map = new Map<string, User>();
  try {
    if (fs.existsSync(USERS_FILE)) {
      const raw = fs.readFileSync(USERS_FILE, "utf-8");
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        for (const item of list) {
          if (item && typeof item.openId === "string") {
            map.set(item.openId, {
              ...item,
              createdAt: new Date(item.createdAt),
              updatedAt: new Date(item.updatedAt),
              lastSignedIn: new Date(item.lastSignedIn),
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn("[Database] Failed to load disk users:", err);
  }
  return map;
}

function saveDiskUsers(map: Map<string, User>) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const list = Array.from(map.values());
    fs.writeFileSync(USERS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (err) {
    console.warn("[Database] Failed to save disk users:", err);
  }
}

function loadDiskProfiles(): Map<number, CareerProfile> {
  const map = new Map<number, CareerProfile>();
  try {
    if (fs.existsSync(PROFILES_FILE)) {
      const raw = fs.readFileSync(PROFILES_FILE, "utf-8");
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        for (const item of list) {
          if (item && typeof item.userId === "number") {
            map.set(item.userId, {
              ...item,
              createdAt: new Date(item.createdAt),
              updatedAt: new Date(item.updatedAt),
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn("[Database] Failed to load disk career profiles:", err);
  }
  return map;
}

function saveDiskProfiles(map: Map<number, CareerProfile>) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const list = Array.from(map.values());
    fs.writeFileSync(PROFILES_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (err) {
    console.warn("[Database] Failed to save disk career profiles:", err);
  }
}

const inMemoryUsers = loadDiskUsers();
const inMemoryProfiles = loadDiskProfiles();

interface CachedUser {
  user: User;
  cachedAt: number;
}
const userCache = new Map<string, CachedUser>();
const USER_CACHE_TTL_MS = 60_000;

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  // Update in-memory & local disk cache first
  const existing = userCache.get(user.openId)?.user || inMemoryUsers.get(user.openId);
  const now = new Date();
  const updatedUser: User = {
    id: existing?.id ?? Math.floor(Date.now() / 1000),
    openId: user.openId,
    name: user.name !== undefined ? (user.name ?? null) : (existing?.name ?? null),
    email: user.email !== undefined ? (user.email ?? null) : (existing?.email ?? null),
    loginMethod: user.loginMethod !== undefined ? (user.loginMethod ?? null) : (existing?.loginMethod ?? null),
    role: user.role !== undefined ? user.role : (user.openId === ENV.ownerOpenId ? "admin" : (existing?.role ?? "user")),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    lastSignedIn: user.lastSignedIn !== undefined ? new Date(user.lastSignedIn) : (existing?.lastSignedIn ?? now),
  };

  userCache.set(user.openId, { user: updatedUser, cachedAt: Date.now() });
  inMemoryUsers.set(user.openId, updatedUser);
  saveDiskUsers(inMemoryUsers);

  const db = await getDb();

  // Mode 1: Direct PostgreSQL via Drizzle ORM
  if (db) {
    try {
      const values: InsertUser = {
        openId: user.openId,
      };
      const updateSet: Record<string, unknown> = {};

      const textFields = ["name", "email", "loginMethod"] as const;
      type TextField = (typeof textFields)[number];

      const assignNullable = (field: TextField) => {
        const value = user[field];
        if (value === undefined) return;
        const normalized = value ?? null;
        values[field] = normalized;
        updateSet[field] = normalized;
      };

      textFields.forEach(assignNullable);

      if (user.lastSignedIn !== undefined) {
        values.lastSignedIn = user.lastSignedIn;
        updateSet.lastSignedIn = user.lastSignedIn;
      }
      if (user.role !== undefined) {
        values.role = user.role;
        updateSet.role = user.role;
      } else if (user.openId === ENV.ownerOpenId) {
        values.role = "admin";
        updateSet.role = "admin";
      }

      if (!values.lastSignedIn) {
        values.lastSignedIn = now;
      }

      if (Object.keys(updateSet).length === 0) {
        updateSet.lastSignedIn = now;
      }

      updateSet.updatedAt = now;

      await db.insert(users).values(values).onConflictDoUpdate({
        target: users.openId,
        set: updateSet,
      });
      return;
    } catch (dbError) {
      markDirectDbFailed();
      console.warn("[Database] Direct DB operation failed, falling back to Supabase API:", dbError);
    }
  }

  // Mode 2: Supabase REST API via Supabase Client
  const supabase = getSupabase();
  if (supabase) {
    try {
      const updatedAt = now.toISOString();
      const payload: Record<string, unknown> = {
        openId: user.openId,
        updatedAt,
      };

      if (user.name !== undefined) payload.name = user.name ?? null;
      if (user.email !== undefined) payload.email = user.email ?? null;
      if (user.loginMethod !== undefined) payload.loginMethod = user.loginMethod ?? null;
      if (user.role !== undefined) {
        payload.role = user.role;
      } else if (user.openId === ENV.ownerOpenId) {
        payload.role = "admin";
      } else if (!existing) {
        payload.role = "user";
      }

      if (user.lastSignedIn !== undefined) {
        payload.lastSignedIn = new Date(user.lastSignedIn).toISOString();
      } else if (!existing) {
        payload.lastSignedIn = now.toISOString();
      }

      const { error } = await supabase.from("users").upsert(payload, { onConflict: "openId" });
      if (error) {
        console.warn("[Supabase API] Warning on user upsert (preserved in local cache):", error.message || error);
      }
      return;
    } catch (apiError) {
      console.warn("[Supabase API] Cloud user sync timeout/offline; safely saved to local durable cache:", apiError);
      return;
    }
  }
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const cached = userCache.get(openId);
  if (cached && Date.now() - cached.cachedAt < USER_CACHE_TTL_MS) {
    return cached.user;
  }

  const db = await getDb();

  // Mode 1: Direct PostgreSQL
  if (db) {
    try {
      const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
      if (result.length > 0) {
        userCache.set(openId, { user: result[0], cachedAt: Date.now() });
        inMemoryUsers.set(openId, result[0]);
        saveDiskUsers(inMemoryUsers);
        return result[0];
      }
    } catch (dbError) {
      console.warn("[Database] Direct DB fetch failed, falling back to Supabase API:", dbError);
    }
  }

  // Mode 2: Supabase REST API
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("users").select("*").eq("openId", openId).maybeSingle();
      if (error) {
        console.warn("[Supabase API] Error fetching user (falling back to cache):", error);
      } else if (data) {
        const user: User = {
          id: data.id,
          openId: data.openId,
          name: data.name,
          email: data.email,
          loginMethod: data.loginMethod,
          role: data.role as "user" | "admin",
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt),
          lastSignedIn: new Date(data.lastSignedIn),
        };

        userCache.set(openId, { user, cachedAt: Date.now() });
        inMemoryUsers.set(openId, user);
        saveDiskUsers(inMemoryUsers);
        return user;
      }
    } catch (apiError) {
      console.warn("[Supabase API] User fetch connection exception (falling back to cache):", apiError);
    }
  }

  // Mode 3: Local disk cache fallback
  const diskUser = inMemoryUsers.get(openId);
  if (diskUser) {
    userCache.set(openId, { user: diskUser, cachedAt: Date.now() });
    return diskUser;
  }

  return undefined;
}

export async function getCareerProfileByUserId(userId: number): Promise<CareerProfile | undefined> {
  const db = await getDb();

  // Mode 1: Direct PostgreSQL
  if (db) {
    try {
      const result = await db.select().from(careerProfiles).where(eq(careerProfiles.userId, userId)).limit(1);
      if (result.length > 0) {
        inMemoryProfiles.set(userId, result[0]);
        saveDiskProfiles(inMemoryProfiles);
        return result[0];
      }
    } catch (dbError) {
      markDirectDbFailed();
      console.warn("[Database] Direct DB profile operation failed, falling back to Supabase API:", dbError);
    }
  }

  // Mode 2: Supabase REST API
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("careerProfiles").select("*").eq("userId", userId).maybeSingle();
      if (error) {
        console.warn("[Supabase API] Error fetching career profile (falling back to cache):", error);
      } else if (data) {
        const profile: CareerProfile = {
          ...data,
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt),
        } as CareerProfile;
        inMemoryProfiles.set(userId, profile);
        saveDiskProfiles(inMemoryProfiles);
        return profile;
      }
    } catch (apiError) {
      console.warn("[Supabase API] Career profile fetch connection exception (falling back to cache):", apiError);
    }
  }

  // Mode 3: Local durable cache
  return inMemoryProfiles.get(userId);
}

export async function upsertCareerProfile(
  userId: number,
  changes: Omit<Partial<InsertCareerProfile>, "id" | "userId" | "createdAt" | "updatedAt">,
): Promise<CareerProfile | undefined> {
  // Update in-memory / local disk cache immediately so data is never lost
  const existing = inMemoryProfiles.get(userId) || (await getCareerProfileByUserId(userId));
  const now = new Date();
  const updatedProfile: CareerProfile = {
    id: existing?.id ?? userId,
    userId,
    fullName: changes.fullName !== undefined ? (changes.fullName ?? null) : (existing?.fullName ?? null),
    location: changes.location !== undefined ? (changes.location ?? null) : (existing?.location ?? null),
    phone: changes.phone !== undefined ? (changes.phone ?? null) : (existing?.phone ?? null),
    contactEmail: changes.contactEmail !== undefined ? (changes.contactEmail ?? null) : (existing?.contactEmail ?? null),
    linkedinUrl: changes.linkedinUrl !== undefined ? (changes.linkedinUrl ?? null) : (existing?.linkedinUrl ?? null),
    portfolioUrl: changes.portfolioUrl !== undefined ? (changes.portfolioUrl ?? null) : (existing?.portfolioUrl ?? null),
    age: changes.age !== undefined ? (changes.age ?? null) : (existing?.age ?? null),
    education: changes.education !== undefined ? (changes.education ?? null) : (existing?.education ?? null),
    degree: changes.degree !== undefined ? (changes.degree ?? null) : (existing?.degree ?? null),
    careerStatus: changes.careerStatus !== undefined ? (changes.careerStatus ?? null) : (existing?.careerStatus ?? null),
    currentJob: changes.currentJob !== undefined ? (changes.currentJob ?? null) : (existing?.currentJob ?? null),
    company: changes.company !== undefined ? (changes.company ?? null) : (existing?.company ?? null),
    lookingFor: changes.lookingFor !== undefined ? (changes.lookingFor ?? null) : (existing?.lookingFor ?? null),
    careerField: changes.careerField !== undefined ? (changes.careerField ?? null) : (existing?.careerField ?? null),
    targetRole: changes.targetRole !== undefined ? (changes.targetRole ?? null) : (existing?.targetRole ?? null),
    skills: changes.skills !== undefined ? (changes.skills ?? null) : (existing?.skills ?? null),
    experience: changes.experience !== undefined ? (changes.experience ?? null) : (existing?.experience ?? null),
    professionalSummary: changes.professionalSummary !== undefined ? (changes.professionalSummary ?? null) : (existing?.professionalSummary ?? null),
    certifications: changes.certifications !== undefined ? (changes.certifications ?? null) : (existing?.certifications ?? null),
    languages: changes.languages !== undefined ? (changes.languages ?? null) : (existing?.languages ?? null),
    projects: changes.projects !== undefined ? (changes.projects ?? null) : (existing?.projects ?? null),
    verifiedDetails: changes.verifiedDetails !== undefined ? (changes.verifiedDetails ?? null) : (existing?.verifiedDetails ?? null),
    resumeReviewCache: changes.resumeReviewCache !== undefined ? (changes.resumeReviewCache ?? null) : (existing?.resumeReviewCache ?? null),
    resumeReviewCacheKey: changes.resumeReviewCacheKey !== undefined ? (changes.resumeReviewCacheKey ?? null) : (existing?.resumeReviewCacheKey ?? null),
    resumeKey: changes.resumeKey !== undefined ? (changes.resumeKey ?? null) : (existing?.resumeKey ?? null),
    resumeUrl: changes.resumeUrl !== undefined ? (changes.resumeUrl ?? null) : (existing?.resumeUrl ?? null),
    resumeName: changes.resumeName !== undefined ? (changes.resumeName ?? null) : (existing?.resumeName ?? null),
    resumeSize: changes.resumeSize !== undefined ? (changes.resumeSize ?? null) : (existing?.resumeSize ?? null),
    resumeMimeType: changes.resumeMimeType !== undefined ? (changes.resumeMimeType ?? null) : (existing?.resumeMimeType ?? null),
    profilePhotoKey: changes.profilePhotoKey !== undefined ? (changes.profilePhotoKey ?? null) : (existing?.profilePhotoKey ?? null),
    profilePhotoUrl: changes.profilePhotoUrl !== undefined ? (changes.profilePhotoUrl ?? null) : (existing?.profilePhotoUrl ?? null),
    profilePhotoSize: changes.profilePhotoSize !== undefined ? (changes.profilePhotoSize ?? null) : (existing?.profilePhotoSize ?? null),
    profilePhotoMimeType: changes.profilePhotoMimeType !== undefined ? (changes.profilePhotoMimeType ?? null) : (existing?.profilePhotoMimeType ?? null),
    personalizationEnabled: changes.personalizationEnabled !== undefined ? changes.personalizationEnabled : (existing?.personalizationEnabled ?? true),
    jobRecommendationsEnabled: changes.jobRecommendationsEnabled !== undefined ? changes.jobRecommendationsEnabled : (existing?.jobRecommendationsEnabled ?? true),
    professionalConnectionsEnabled: changes.professionalConnectionsEnabled !== undefined ? changes.professionalConnectionsEnabled : (existing?.professionalConnectionsEnabled ?? true),
    isComplete: changes.isComplete !== undefined ? changes.isComplete : (existing?.isComplete ?? false),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  inMemoryProfiles.set(userId, updatedProfile);
  saveDiskProfiles(inMemoryProfiles);

  const db = await getDb();

  // Mode 1: Direct PostgreSQL
  if (db) {
    try {
      const updateValues = {
        ...changes,
        updatedAt: now,
      };

      await db.insert(careerProfiles).values({ userId, ...changes }).onConflictDoUpdate({
        target: careerProfiles.userId,
        set: updateValues,
      });

      return (await getCareerProfileByUserId(userId)) || updatedProfile;
    } catch (dbError) {
      console.warn("[Database] Direct DB profile upsert failed, falling back to Supabase API:", dbError);
    }
  }

  // Mode 2: Supabase REST API
  const supabase = getSupabase();
  if (supabase) {
    try {
      const payload = {
        userId,
        ...changes,
        updatedAt: now.toISOString(),
      };

      const { error } = await supabase.from("careerProfiles").upsert(payload, { onConflict: "userId" });
      if (error) {
        console.warn("[Supabase API] Warning on profile upsert (persisted locally):", error.message || error);
      } else {
        const fresh = await getCareerProfileByUserId(userId);
        if (fresh) return fresh;
      }
    } catch (apiError) {
      console.warn("[Supabase API] Cloud sync connection timeout/error; safely saved to durable local storage:", apiError);
    }
    return updatedProfile;
  }

  return updatedProfile;
}

// ─── Interview Sessions Helpers (Multi-Tier Durable Storage) ────────────────

function loadDiskSessions(): Map<number, InterviewSession> {
  const map = new Map<number, InterviewSession>();
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const raw = fs.readFileSync(SESSIONS_FILE, "utf-8");
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        for (const item of list) {
          if (item && typeof item.id === "number") {
            map.set(item.id, {
              ...item,
              createdAt: new Date(item.createdAt),
              updatedAt: new Date(item.updatedAt),
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn("[Database] Failed to load disk interview sessions:", err);
  }
  return map;
}

function saveDiskSessions(map: Map<number, InterviewSession>) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const list = Array.from(map.values());
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (err) {
    console.warn("[Database] Failed to save disk interview sessions:", err);
  }
}

const inMemorySessions = loadDiskSessions();

/**
 * Cloud Supabase Backup Sync: Stores the active generated interview session
 * durably inside the user's careerProfiles record in Supabase so it survives
 * indefinitely until explicitly overridden by a newly generated session.
 */
async function syncSessionToCloudProfileBackup(userId: number, session: InterviewSession): Promise<void> {
  try {
    const supabase = getSupabase();
    if (!supabase) return;
    const backupJson = JSON.stringify({
      _type: "active_interview_roadmap_session",
      session: {
        id: session.id,
        userId: session.userId,
        companyName: session.companyName,
        targetRole: session.targetRole,
        jobDescription: session.jobDescription,
        resumeSummary: session.resumeSummary,
        levels: session.levels,
        currentLevel: session.currentLevel,
        status: session.status,
        metadata: session.metadata,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
      },
    });

    await supabase
      .from("careerProfiles")
      .update({
        resumeReviewCache: backupJson,
        updatedAt: new Date().toISOString(),
      })
      .eq("userId", userId);
  } catch (err) {
    // silently catch backup error
  }
}

export async function createInterviewSession(
  session: InsertInterviewSession
): Promise<InterviewSession> {
  const db = await getDb();
  let createdSession: InterviewSession | null = null;

  // Mode 1: Direct PostgreSQL
  if (db) {
    try {
      const [created] = await db.insert(interviewSessions).values(session).returning();
      if (created) {
        createdSession = created;
      }
    } catch (dbError) {
      console.warn("[Database] Direct DB session creation failed, falling back to Supabase API:", dbError);
    }
  }

  // Mode 2: Supabase REST API (Try 'interviewSessions' & 'interview_sessions')
  if (!createdSession) {
    const supabase = getSupabase();
    if (supabase) {
      const payload = {
        userId: session.userId,
        companyName: session.companyName ?? null,
        targetRole: session.targetRole ?? null,
        jobDescription: session.jobDescription ?? null,
        resumeSummary: session.resumeSummary ?? null,
        levels: session.levels,
        currentLevel: session.currentLevel ?? 1,
        status: session.status ?? "generated",
        metadata: session.metadata ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        const { data, error } = await supabase.from("interviewSessions").insert(payload).select().single();
        if (!error && data) {
          createdSession = {
            ...data,
            createdAt: new Date(data.createdAt),
            updatedAt: new Date(data.updatedAt),
          } as InterviewSession;
        }
      } catch {}

      if (!createdSession) {
        try {
          const { data, error } = await supabase.from("interview_sessions").insert(payload).select().single();
          if (!error && data) {
            createdSession = {
              ...data,
              createdAt: new Date(data.createdAt || data.created_at),
              updatedAt: new Date(data.updatedAt || data.updated_at),
            } as InterviewSession;
          }
        } catch {}
      }
    }
  }

  // Mode 3: Robust Fallback with Unique Timestamp ID
  if (!createdSession) {
    createdSession = {
      id: Date.now(),
      userId: session.userId,
      companyName: session.companyName ?? null,
      targetRole: session.targetRole ?? null,
      jobDescription: session.jobDescription ?? null,
      resumeSummary: session.resumeSummary ?? null,
      levels: session.levels,
      currentLevel: session.currentLevel ?? 1,
      status: session.status ?? "generated",
      metadata: session.metadata ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  // Update In-Memory Cache and Persist to Disk File
  inMemorySessions.set(createdSession.id, createdSession);
  saveDiskSessions(inMemorySessions);

  // Sync snapshot to cloud careerProfiles table as permanent DB backup
  void syncSessionToCloudProfileBackup(createdSession.userId, createdSession);

  return createdSession;
}

export async function getInterviewSessionsByUserId(
  userId: number
): Promise<InterviewSession[]> {
  const db = await getDb();

  // 1. Check PostgreSQL Direct DB
  if (db) {
    try {
      const sessions = await db
        .select()
        .from(interviewSessions)
        .where(eq(interviewSessions.userId, userId))
        .orderBy(desc(interviewSessions.createdAt));
      if (sessions && sessions.length > 0) {
        sessions.forEach((s) => inMemorySessions.set(s.id, s));
        saveDiskSessions(inMemorySessions);
        return sessions;
      }
    } catch (dbError) {
      console.warn("[Database] Direct DB get all sessions failed, checking other tiers:", dbError);
    }
  }

  // 2. Check Supabase REST API
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("interviewSessions")
        .select("*")
        .eq("userId", userId)
        .order("createdAt", { ascending: false });

      if (!error && data && data.length > 0) {
        const parsed = data.map((d: any) => ({
          ...d,
          createdAt: new Date(d.createdAt),
          updatedAt: new Date(d.updatedAt),
        })) as InterviewSession[];
        parsed.forEach((s) => inMemorySessions.set(s.id, s));
        saveDiskSessions(inMemorySessions);
        return parsed;
      }
    } catch {}

    try {
      const { data, error } = await supabase
        .from("interview_sessions")
        .select("*")
        .eq("userId", userId)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        const parsed = data.map((d: any) => ({
          ...d,
          createdAt: new Date(d.createdAt || d.created_at),
          updatedAt: new Date(d.updatedAt || d.updated_at),
        })) as InterviewSession[];
        parsed.forEach((s) => inMemorySessions.set(s.id, s));
        saveDiskSessions(inMemorySessions);
        return parsed;
      }
    } catch {}
  }

  // 3. Check in-memory / persistent disk store for this user
  const diskUserSessions = Array.from(inMemorySessions.values())
    .filter((s) => s.userId === userId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  if (diskUserSessions.length > 0) {
    return diskUserSessions;
  }

  // 4. Check Cloud Profile Backup in Supabase
  if (supabase) {
    try {
      const profile = await getCareerProfileByUserId(userId);
      if (profile?.resumeReviewCache) {
        const parsed = JSON.parse(profile.resumeReviewCache);
        if (parsed?._type === "active_interview_roadmap_session" && parsed?.session) {
          const restored: InterviewSession = {
            ...parsed.session,
            createdAt: new Date(parsed.session.createdAt),
            updatedAt: new Date(parsed.session.updatedAt),
          };
          inMemorySessions.set(restored.id, restored);
          saveDiskSessions(inMemorySessions);
          return [restored];
        }
      }
    } catch {}
  }

  return [];
}

export async function getLatestInterviewSessionByUserId(
  userId: number
): Promise<InterviewSession | null> {
  const db = await getDb();

  // 1. Check PostgreSQL Direct DB
  if (db) {
    try {
      const [session] = await db
        .select()
        .from(interviewSessions)
        .where(eq(interviewSessions.userId, userId))
        .orderBy(desc(interviewSessions.createdAt))
        .limit(1);
      if (session) {
        inMemorySessions.set(session.id, session);
        saveDiskSessions(inMemorySessions);
        return session;
      }
    } catch (dbError) {
      console.warn("[Database] Direct DB get latest session failed, checking other tiers:", dbError);
    }
  }

  // 2. Check Supabase REST API ('interviewSessions' & 'interview_sessions')
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("interviewSessions")
        .select("*")
        .eq("userId", userId)
        .order("createdAt", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        const session = {
          ...data,
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt),
        } as InterviewSession;
        inMemorySessions.set(session.id, session);
        saveDiskSessions(inMemorySessions);
        return session;
      }
    } catch {}

    try {
      const { data, error } = await supabase
        .from("interview_sessions")
        .select("*")
        .eq("userId", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        const session = {
          ...data,
          createdAt: new Date(data.createdAt || data.created_at),
          updatedAt: new Date(data.updatedAt || data.updated_at),
        } as InterviewSession;
        inMemorySessions.set(session.id, session);
        saveDiskSessions(inMemorySessions);
        return session;
      }
    } catch {}
  }

  // 3. Check in-memory & persistent disk store for this user
  const userSessions = Array.from(inMemorySessions.values())
    .filter((s) => s.userId === userId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  if (userSessions.length > 0 && userSessions[0]) {
    return userSessions[0];
  }

  // 4. Check Cloud Profile Backup in Supabase
  if (supabase) {
    try {
      const profile = await getCareerProfileByUserId(userId);
      if (profile?.resumeReviewCache) {
        const parsed = JSON.parse(profile.resumeReviewCache);
        if (parsed?._type === "active_interview_roadmap_session" && parsed?.session) {
          const restored: InterviewSession = {
            ...parsed.session,
            createdAt: new Date(parsed.session.createdAt),
            updatedAt: new Date(parsed.session.updatedAt),
          };
          inMemorySessions.set(restored.id, restored);
          saveDiskSessions(inMemorySessions);
          return restored;
        }
      }
    } catch {}
  }

  return null;
}

export async function updateInterviewSession(
  id: number,
  userId: number,
  changes: Partial<InsertInterviewSession>
): Promise<InterviewSession | null> {
  const db = await getDb();
  let updatedSession: InterviewSession | null = null;

  // 1. Direct PostgreSQL
  if (db) {
    try {
      const [updated] = await db
        .update(interviewSessions)
        .set({ ...changes, updatedAt: new Date() })
        .where(eq(interviewSessions.id, id))
        .returning();
      if (updated) {
        updatedSession = updated;
      }
    } catch (dbError) {
      console.warn("[Database] Direct DB update session failed, falling back to Supabase API:", dbError);
    }
  }

  // 2. Supabase REST API
  if (!updatedSession) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("interviewSessions")
          .update({ ...changes, updatedAt: new Date().toISOString() })
          .eq("id", id)
          .eq("userId", userId)
          .select()
          .maybeSingle();

        if (!error && data) {
          updatedSession = {
            ...data,
            createdAt: new Date(data.createdAt),
            updatedAt: new Date(data.updatedAt),
          } as InterviewSession;
        }
      } catch {}

      if (!updatedSession) {
        try {
          const { data, error } = await supabase
            .from("interview_sessions")
            .update({ ...changes, updatedAt: new Date().toISOString() })
            .eq("id", id)
            .eq("userId", userId)
            .select()
            .maybeSingle();

          if (!error && data) {
            updatedSession = {
              ...data,
              createdAt: new Date(data.createdAt || data.created_at),
              updatedAt: new Date(data.updatedAt || data.updated_at),
            } as InterviewSession;
          }
        } catch {}
      }
    }
  }

  // 3. Fallback to updating in-memory and disk
  if (!updatedSession) {
    const existing = inMemorySessions.get(id);
    if (existing && existing.userId === userId) {
      updatedSession = {
        ...existing,
        ...changes,
        updatedAt: new Date(),
      };
    }
  }

  if (updatedSession) {
    inMemorySessions.set(id, updatedSession);
    saveDiskSessions(inMemorySessions);
    void syncSessionToCloudProfileBackup(userId, updatedSession);
    return updatedSession;
  }

  return null;
}

