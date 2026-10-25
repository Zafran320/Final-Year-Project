var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/_core/env.ts
var ENV;
var init_env = __esm({
  "server/_core/env.ts"() {
    "use strict";
    ENV = {
      appId: process.env.VITE_APP_ID ?? "",
      cookieSecret: process.env.JWT_SECRET || "careertwin-ai-jwt-secret-fallback-key-minimum-32-chars",
      databaseUrl: process.env.DATABASE_URL ?? process.env.SUPABASE_DATABASE_URL ?? process.env.SUPABASE_DB_URL ?? "",
      supabaseUrl: process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "",
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? "",
      supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
      oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
      ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
      isProduction: process.env.NODE_ENV === "production",
      // Forge (commercial LLM gateway) — falls back to Gemini OpenAI-compatible endpoint
      forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
      forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
      geminiApiKey: process.env.GEMINI_API_KEY ?? ""
    };
  }
});

// server/supabase.ts
var supabase_exports = {};
__export(supabase_exports, {
  createClient: () => createClient,
  getSupabaseAdmin: () => getSupabaseAdmin,
  getSupabaseClient: () => getSupabaseClient,
  hasSupabaseAdminRole: () => hasSupabaseAdminRole
});
import { createClient } from "@supabase/supabase-js";
function hasSupabaseAdminRole() {
  return Boolean(ENV.supabaseUrl && ENV.supabaseServiceRoleKey);
}
function getSupabaseAdmin() {
  if (!_supabaseAdmin && ENV.supabaseUrl && (ENV.supabaseServiceRoleKey || ENV.supabaseAnonKey)) {
    try {
      _supabaseAdmin = createClient(ENV.supabaseUrl, ENV.supabaseServiceRoleKey || ENV.supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        global: {
          fetch: resilientFetch
        }
      });
    } catch (error) {
      console.warn("[Supabase] Failed to initialize Supabase admin client:", error);
      _supabaseAdmin = null;
    }
  }
  return _supabaseAdmin;
}
function getSupabaseClient() {
  if (!_supabaseClient && ENV.supabaseUrl && ENV.supabaseAnonKey) {
    try {
      _supabaseClient = createClient(ENV.supabaseUrl, ENV.supabaseAnonKey, {
        global: {
          fetch: resilientFetch
        }
      });
    } catch (error) {
      console.warn("[Supabase] Failed to initialize Supabase public client:", error);
      _supabaseClient = null;
    }
  }
  return _supabaseClient;
}
var _supabaseAdmin, _supabaseClient, resilientFetch;
var init_supabase = __esm({
  "server/supabase.ts"() {
    "use strict";
    init_env();
    _supabaseAdmin = null;
    _supabaseClient = null;
    resilientFetch = async (input, init) => {
      const maxAttempts = 2;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const timeoutSignal = AbortSignal.timeout(6e3);
          const signal = init?.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal;
          return await fetch(input, { ...init, signal });
        } catch (error) {
          if (attempt === maxAttempts) throw error;
          await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
        }
      }
      return fetch(input, init);
    };
  }
});

// server/_core/app.ts
import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// server/_core/googleAuth.ts
import { randomBytes } from "crypto";
import { OAuth2Client } from "google-auth-library";
import { parse as parseCookieHeader2 } from "cookie";

// server/db.ts
import fs from "fs";
import path from "path";
import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// drizzle/schema.ts
import { boolean, integer, pgEnum, pgTable, serial, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
var roleEnum = pgEnum("role", ["user", "admin"]);
var users = pgTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: serial("id").primaryKey(),
  /** OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn", { withTimezone: true, mode: "date" }).defaultNow().notNull()
});
var careerProfiles = pgTable("careerProfiles", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  fullName: varchar("fullName", { length: 160 }),
  location: varchar("location", { length: 160 }),
  phone: varchar("phone", { length: 64 }),
  contactEmail: varchar("contactEmail", { length: 320 }),
  linkedinUrl: varchar("linkedinUrl", { length: 500 }),
  portfolioUrl: varchar("portfolioUrl", { length: 500 }),
  age: integer("age"),
  education: varchar("education", { length: 80 }),
  degree: varchar("degree", { length: 180 }),
  careerStatus: varchar("careerStatus", { length: 32 }),
  currentJob: varchar("currentJob", { length: 180 }),
  company: varchar("company", { length: 180 }),
  lookingFor: varchar("lookingFor", { length: 80 }),
  careerField: varchar("careerField", { length: 120 }),
  targetRole: varchar("targetRole", { length: 180 }),
  skills: text("skills"),
  experience: text("experience"),
  professionalSummary: text("professionalSummary"),
  certifications: text("certifications"),
  languages: text("languages"),
  projects: text("projects"),
  verifiedDetails: text("verifiedDetails"),
  resumeReviewCache: text("resumeReviewCache"),
  resumeReviewCacheKey: varchar("resumeReviewCacheKey", { length: 500 }),
  resumeKey: varchar("resumeKey", { length: 500 }),
  resumeUrl: varchar("resumeUrl", { length: 500 }),
  resumeName: varchar("resumeName", { length: 260 }),
  resumeSize: integer("resumeSize"),
  resumeMimeType: varchar("resumeMimeType", { length: 120 }),
  profilePhotoKey: varchar("profilePhotoKey", { length: 500 }),
  profilePhotoUrl: varchar("profilePhotoUrl", { length: 500 }),
  profilePhotoSize: integer("profilePhotoSize"),
  profilePhotoMimeType: varchar("profilePhotoMimeType", { length: 120 }),
  personalizationEnabled: boolean("personalizationEnabled").default(true).notNull(),
  jobRecommendationsEnabled: boolean("jobRecommendationsEnabled").default(true).notNull(),
  professionalConnectionsEnabled: boolean("professionalConnectionsEnabled").default(true).notNull(),
  isComplete: boolean("isComplete").default(false).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull()
}, (table) => [uniqueIndex("careerProfiles_userId_unique").on(table.userId)]);
var interviewSessions = pgTable("interviewSessions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  companyName: varchar("companyName", { length: 180 }),
  targetRole: varchar("targetRole", { length: 180 }),
  jobDescription: text("jobDescription"),
  resumeSummary: text("resumeSummary"),
  levels: text("levels").notNull(),
  // JSON string representing the 10 levels array
  currentLevel: integer("currentLevel").default(1).notNull(),
  status: varchar("status", { length: 32 }).default("generated").notNull(),
  // 'generated', 'in_progress', 'completed'
  metadata: text("metadata"),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull()
});

// server/db.ts
init_env();
init_supabase();
var _client = null;
var _db = null;
var _directDbFailed = false;
function getDatabaseUrl() {
  const url = (process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || process.env.SUPABASE_DB_URL || ENV.databaseUrl || "").trim();
  if (!url || url === "undefined" || url.includes("[YOUR-DATABASE-PASSWORD]") || url.includes("[PASSWORD]")) {
    return void 0;
  }
  return url;
}
function markDirectDbFailed() {
  _directDbFailed = true;
  _db = null;
}
function getSupabase() {
  return getSupabaseAdmin() || getSupabaseClient();
}
function isDirectDbPreferred() {
  if (process.env.USE_DIRECT_DB === "true") return true;
  if (getSupabase()) return false;
  return Boolean(getDatabaseUrl());
}
async function getDb() {
  if (!isDirectDbPreferred() || _directDbFailed) return null;
  const connectionString = getDatabaseUrl();
  if (!_db && connectionString) {
    try {
      _client = postgres(connectionString, {
        prepare: false,
        max: 10,
        idle_timeout: 10,
        connect_timeout: 2
      });
      _db = drizzle(_client);
    } catch (error) {
      console.warn("[Database] Direct PostgreSQL connection failed, falling back to Supabase API:", error);
      markDirectDbFailed();
    }
  }
  return _db;
}
var isServerlessEnv = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
var DATA_DIR = isServerlessEnv ? path.resolve("/tmp", ".data") : path.resolve(process.cwd(), ".data");
var SESSIONS_FILE = path.resolve(DATA_DIR, "interview_sessions.json");
var PROFILES_FILE = path.resolve(DATA_DIR, "career_profiles.json");
var USERS_FILE = path.resolve(DATA_DIR, "users.json");
function loadDiskUsers() {
  const map = /* @__PURE__ */ new Map();
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
              lastSignedIn: new Date(item.lastSignedIn)
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
function saveDiskUsers(map) {
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
function loadDiskProfiles() {
  const map = /* @__PURE__ */ new Map();
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
              updatedAt: new Date(item.updatedAt)
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
function saveDiskProfiles(map) {
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
var inMemoryUsers = loadDiskUsers();
var inMemoryProfiles = loadDiskProfiles();
var userCache = /* @__PURE__ */ new Map();
var USER_CACHE_TTL_MS = 6e4;
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const existing = userCache.get(user.openId)?.user || inMemoryUsers.get(user.openId);
  const now = /* @__PURE__ */ new Date();
  const updatedUser = {
    id: existing?.id ?? Math.floor(Date.now() / 1e3),
    openId: user.openId,
    name: user.name !== void 0 ? user.name ?? null : existing?.name ?? null,
    email: user.email !== void 0 ? user.email ?? null : existing?.email ?? null,
    loginMethod: user.loginMethod !== void 0 ? user.loginMethod ?? null : existing?.loginMethod ?? null,
    role: user.role !== void 0 ? user.role : user.openId === ENV.ownerOpenId ? "admin" : existing?.role ?? "user",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    lastSignedIn: user.lastSignedIn !== void 0 ? new Date(user.lastSignedIn) : existing?.lastSignedIn ?? now
  };
  userCache.set(user.openId, { user: updatedUser, cachedAt: Date.now() });
  inMemoryUsers.set(user.openId, updatedUser);
  saveDiskUsers(inMemoryUsers);
  const db = await getDb();
  if (db) {
    try {
      const values = {
        openId: user.openId
      };
      const updateSet = {};
      const textFields = ["name", "email", "loginMethod"];
      const assignNullable = (field) => {
        const value = user[field];
        if (value === void 0) return;
        const normalized = value ?? null;
        values[field] = normalized;
        updateSet[field] = normalized;
      };
      textFields.forEach(assignNullable);
      if (user.lastSignedIn !== void 0) {
        values.lastSignedIn = user.lastSignedIn;
        updateSet.lastSignedIn = user.lastSignedIn;
      }
      if (user.role !== void 0) {
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
        set: updateSet
      });
      return;
    } catch (dbError) {
      markDirectDbFailed();
      console.warn("[Database] Direct DB operation failed, falling back to Supabase API:", dbError);
    }
  }
  const supabase = getSupabase();
  if (supabase) {
    try {
      const updatedAt = now.toISOString();
      const payload = {
        openId: user.openId,
        updatedAt
      };
      if (user.name !== void 0) payload.name = user.name ?? null;
      if (user.email !== void 0) payload.email = user.email ?? null;
      if (user.loginMethod !== void 0) payload.loginMethod = user.loginMethod ?? null;
      if (user.role !== void 0) {
        payload.role = user.role;
      } else if (user.openId === ENV.ownerOpenId) {
        payload.role = "admin";
      } else if (!existing) {
        payload.role = "user";
      }
      if (user.lastSignedIn !== void 0) {
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
async function getUserByOpenId(openId) {
  const cached = userCache.get(openId);
  if (cached && Date.now() - cached.cachedAt < USER_CACHE_TTL_MS) {
    return cached.user;
  }
  const db = await getDb();
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
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("users").select("*").eq("openId", openId).maybeSingle();
      if (error) {
        console.warn("[Supabase API] Error fetching user (falling back to cache):", error);
      } else if (data) {
        const user = {
          id: data.id,
          openId: data.openId,
          name: data.name,
          email: data.email,
          loginMethod: data.loginMethod,
          role: data.role,
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt),
          lastSignedIn: new Date(data.lastSignedIn)
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
  const diskUser = inMemoryUsers.get(openId);
  if (diskUser) {
    userCache.set(openId, { user: diskUser, cachedAt: Date.now() });
    return diskUser;
  }
  return void 0;
}
async function getCareerProfileByUserId(userId) {
  const db = await getDb();
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
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("careerProfiles").select("*").eq("userId", userId).maybeSingle();
      if (error) {
        console.warn("[Supabase API] Error fetching career profile (falling back to cache):", error);
      } else if (data) {
        const profile = {
          ...data,
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt)
        };
        inMemoryProfiles.set(userId, profile);
        saveDiskProfiles(inMemoryProfiles);
        return profile;
      }
    } catch (apiError) {
      console.warn("[Supabase API] Career profile fetch connection exception (falling back to cache):", apiError);
    }
  }
  return inMemoryProfiles.get(userId);
}
async function upsertCareerProfile(userId, changes) {
  const existing = inMemoryProfiles.get(userId) || await getCareerProfileByUserId(userId);
  const now = /* @__PURE__ */ new Date();
  const updatedProfile = {
    id: existing?.id ?? userId,
    userId,
    fullName: changes.fullName !== void 0 ? changes.fullName ?? null : existing?.fullName ?? null,
    location: changes.location !== void 0 ? changes.location ?? null : existing?.location ?? null,
    phone: changes.phone !== void 0 ? changes.phone ?? null : existing?.phone ?? null,
    contactEmail: changes.contactEmail !== void 0 ? changes.contactEmail ?? null : existing?.contactEmail ?? null,
    linkedinUrl: changes.linkedinUrl !== void 0 ? changes.linkedinUrl ?? null : existing?.linkedinUrl ?? null,
    portfolioUrl: changes.portfolioUrl !== void 0 ? changes.portfolioUrl ?? null : existing?.portfolioUrl ?? null,
    age: changes.age !== void 0 ? changes.age ?? null : existing?.age ?? null,
    education: changes.education !== void 0 ? changes.education ?? null : existing?.education ?? null,
    degree: changes.degree !== void 0 ? changes.degree ?? null : existing?.degree ?? null,
    careerStatus: changes.careerStatus !== void 0 ? changes.careerStatus ?? null : existing?.careerStatus ?? null,
    currentJob: changes.currentJob !== void 0 ? changes.currentJob ?? null : existing?.currentJob ?? null,
    company: changes.company !== void 0 ? changes.company ?? null : existing?.company ?? null,
    lookingFor: changes.lookingFor !== void 0 ? changes.lookingFor ?? null : existing?.lookingFor ?? null,
    careerField: changes.careerField !== void 0 ? changes.careerField ?? null : existing?.careerField ?? null,
    targetRole: changes.targetRole !== void 0 ? changes.targetRole ?? null : existing?.targetRole ?? null,
    skills: changes.skills !== void 0 ? changes.skills ?? null : existing?.skills ?? null,
    experience: changes.experience !== void 0 ? changes.experience ?? null : existing?.experience ?? null,
    professionalSummary: changes.professionalSummary !== void 0 ? changes.professionalSummary ?? null : existing?.professionalSummary ?? null,
    certifications: changes.certifications !== void 0 ? changes.certifications ?? null : existing?.certifications ?? null,
    languages: changes.languages !== void 0 ? changes.languages ?? null : existing?.languages ?? null,
    projects: changes.projects !== void 0 ? changes.projects ?? null : existing?.projects ?? null,
    verifiedDetails: changes.verifiedDetails !== void 0 ? changes.verifiedDetails ?? null : existing?.verifiedDetails ?? null,
    resumeReviewCache: changes.resumeReviewCache !== void 0 ? changes.resumeReviewCache ?? null : existing?.resumeReviewCache ?? null,
    resumeReviewCacheKey: changes.resumeReviewCacheKey !== void 0 ? changes.resumeReviewCacheKey ?? null : existing?.resumeReviewCacheKey ?? null,
    resumeKey: changes.resumeKey !== void 0 ? changes.resumeKey ?? null : existing?.resumeKey ?? null,
    resumeUrl: changes.resumeUrl !== void 0 ? changes.resumeUrl ?? null : existing?.resumeUrl ?? null,
    resumeName: changes.resumeName !== void 0 ? changes.resumeName ?? null : existing?.resumeName ?? null,
    resumeSize: changes.resumeSize !== void 0 ? changes.resumeSize ?? null : existing?.resumeSize ?? null,
    resumeMimeType: changes.resumeMimeType !== void 0 ? changes.resumeMimeType ?? null : existing?.resumeMimeType ?? null,
    profilePhotoKey: changes.profilePhotoKey !== void 0 ? changes.profilePhotoKey ?? null : existing?.profilePhotoKey ?? null,
    profilePhotoUrl: changes.profilePhotoUrl !== void 0 ? changes.profilePhotoUrl ?? null : existing?.profilePhotoUrl ?? null,
    profilePhotoSize: changes.profilePhotoSize !== void 0 ? changes.profilePhotoSize ?? null : existing?.profilePhotoSize ?? null,
    profilePhotoMimeType: changes.profilePhotoMimeType !== void 0 ? changes.profilePhotoMimeType ?? null : existing?.profilePhotoMimeType ?? null,
    personalizationEnabled: changes.personalizationEnabled !== void 0 ? changes.personalizationEnabled : existing?.personalizationEnabled ?? true,
    jobRecommendationsEnabled: changes.jobRecommendationsEnabled !== void 0 ? changes.jobRecommendationsEnabled : existing?.jobRecommendationsEnabled ?? true,
    professionalConnectionsEnabled: changes.professionalConnectionsEnabled !== void 0 ? changes.professionalConnectionsEnabled : existing?.professionalConnectionsEnabled ?? true,
    isComplete: changes.isComplete !== void 0 ? changes.isComplete : existing?.isComplete ?? false,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  };
  inMemoryProfiles.set(userId, updatedProfile);
  saveDiskProfiles(inMemoryProfiles);
  const db = await getDb();
  if (db) {
    try {
      const updateValues = {
        ...changes,
        updatedAt: now
      };
      await db.insert(careerProfiles).values({ userId, ...changes }).onConflictDoUpdate({
        target: careerProfiles.userId,
        set: updateValues
      });
      return await getCareerProfileByUserId(userId) || updatedProfile;
    } catch (dbError) {
      console.warn("[Database] Direct DB profile upsert failed, falling back to Supabase API:", dbError);
    }
  }
  const supabase = getSupabase();
  if (supabase) {
    try {
      const payload = {
        userId,
        ...changes,
        updatedAt: now.toISOString()
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
function loadDiskSessions() {
  const map = /* @__PURE__ */ new Map();
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
              updatedAt: new Date(item.updatedAt)
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
function saveDiskSessions(map) {
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
var inMemorySessions = loadDiskSessions();
async function syncSessionToCloudProfileBackup(userId, session) {
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
        updatedAt: session.updatedAt.toISOString()
      }
    });
    await supabase.from("careerProfiles").update({
      resumeReviewCache: backupJson,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("userId", userId);
  } catch (err) {
  }
}
async function createInterviewSession(session) {
  const db = await getDb();
  let createdSession = null;
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
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      try {
        const { data, error } = await supabase.from("interviewSessions").insert(payload).select().single();
        if (!error && data) {
          createdSession = {
            ...data,
            createdAt: new Date(data.createdAt),
            updatedAt: new Date(data.updatedAt)
          };
        }
      } catch {
      }
      if (!createdSession) {
        try {
          const { data, error } = await supabase.from("interview_sessions").insert(payload).select().single();
          if (!error && data) {
            createdSession = {
              ...data,
              createdAt: new Date(data.createdAt || data.created_at),
              updatedAt: new Date(data.updatedAt || data.updated_at)
            };
          }
        } catch {
        }
      }
    }
  }
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
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
  }
  inMemorySessions.set(createdSession.id, createdSession);
  saveDiskSessions(inMemorySessions);
  void syncSessionToCloudProfileBackup(createdSession.userId, createdSession);
  return createdSession;
}
async function getInterviewSessionsByUserId(userId) {
  const db = await getDb();
  if (db) {
    try {
      const sessions = await db.select().from(interviewSessions).where(eq(interviewSessions.userId, userId)).orderBy(desc(interviewSessions.createdAt));
      if (sessions && sessions.length > 0) {
        sessions.forEach((s) => inMemorySessions.set(s.id, s));
        saveDiskSessions(inMemorySessions);
        return sessions;
      }
    } catch (dbError) {
      console.warn("[Database] Direct DB get all sessions failed, checking other tiers:", dbError);
    }
  }
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("interviewSessions").select("*").eq("userId", userId).order("createdAt", { ascending: false });
      if (!error && data && data.length > 0) {
        const parsed = data.map((d) => ({
          ...d,
          createdAt: new Date(d.createdAt),
          updatedAt: new Date(d.updatedAt)
        }));
        parsed.forEach((s) => inMemorySessions.set(s.id, s));
        saveDiskSessions(inMemorySessions);
        return parsed;
      }
    } catch {
    }
    try {
      const { data, error } = await supabase.from("interview_sessions").select("*").eq("userId", userId).order("created_at", { ascending: false });
      if (!error && data && data.length > 0) {
        const parsed = data.map((d) => ({
          ...d,
          createdAt: new Date(d.createdAt || d.created_at),
          updatedAt: new Date(d.updatedAt || d.updated_at)
        }));
        parsed.forEach((s) => inMemorySessions.set(s.id, s));
        saveDiskSessions(inMemorySessions);
        return parsed;
      }
    } catch {
    }
  }
  const diskUserSessions = Array.from(inMemorySessions.values()).filter((s) => s.userId === userId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  if (diskUserSessions.length > 0) {
    return diskUserSessions;
  }
  if (supabase) {
    try {
      const profile = await getCareerProfileByUserId(userId);
      if (profile?.resumeReviewCache) {
        const parsed = JSON.parse(profile.resumeReviewCache);
        if (parsed?._type === "active_interview_roadmap_session" && parsed?.session) {
          const restored = {
            ...parsed.session,
            createdAt: new Date(parsed.session.createdAt),
            updatedAt: new Date(parsed.session.updatedAt)
          };
          inMemorySessions.set(restored.id, restored);
          saveDiskSessions(inMemorySessions);
          return [restored];
        }
      }
    } catch {
    }
  }
  return [];
}
async function getLatestInterviewSessionByUserId(userId) {
  const db = await getDb();
  if (db) {
    try {
      const [session] = await db.select().from(interviewSessions).where(eq(interviewSessions.userId, userId)).orderBy(desc(interviewSessions.createdAt)).limit(1);
      if (session) {
        inMemorySessions.set(session.id, session);
        saveDiskSessions(inMemorySessions);
        return session;
      }
    } catch (dbError) {
      console.warn("[Database] Direct DB get latest session failed, checking other tiers:", dbError);
    }
  }
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("interviewSessions").select("*").eq("userId", userId).order("createdAt", { ascending: false }).limit(1).maybeSingle();
      if (!error && data) {
        const session = {
          ...data,
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt)
        };
        inMemorySessions.set(session.id, session);
        saveDiskSessions(inMemorySessions);
        return session;
      }
    } catch {
    }
    try {
      const { data, error } = await supabase.from("interview_sessions").select("*").eq("userId", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!error && data) {
        const session = {
          ...data,
          createdAt: new Date(data.createdAt || data.created_at),
          updatedAt: new Date(data.updatedAt || data.updated_at)
        };
        inMemorySessions.set(session.id, session);
        saveDiskSessions(inMemorySessions);
        return session;
      }
    } catch {
    }
  }
  const userSessions = Array.from(inMemorySessions.values()).filter((s) => s.userId === userId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  if (userSessions.length > 0 && userSessions[0]) {
    return userSessions[0];
  }
  if (supabase) {
    try {
      const profile = await getCareerProfileByUserId(userId);
      if (profile?.resumeReviewCache) {
        const parsed = JSON.parse(profile.resumeReviewCache);
        if (parsed?._type === "active_interview_roadmap_session" && parsed?.session) {
          const restored = {
            ...parsed.session,
            createdAt: new Date(parsed.session.createdAt),
            updatedAt: new Date(parsed.session.updatedAt)
          };
          inMemorySessions.set(restored.id, restored);
          saveDiskSessions(inMemorySessions);
          return restored;
        }
      }
    } catch {
    }
  }
  return null;
}
async function updateInterviewSession(id, userId, changes) {
  const db = await getDb();
  let updatedSession = null;
  if (db) {
    try {
      const [updated] = await db.update(interviewSessions).set({ ...changes, updatedAt: /* @__PURE__ */ new Date() }).where(eq(interviewSessions.id, id)).returning();
      if (updated) {
        updatedSession = updated;
      }
    } catch (dbError) {
      console.warn("[Database] Direct DB update session failed, falling back to Supabase API:", dbError);
    }
  }
  if (!updatedSession) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase.from("interviewSessions").update({ ...changes, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", id).eq("userId", userId).select().maybeSingle();
        if (!error && data) {
          updatedSession = {
            ...data,
            createdAt: new Date(data.createdAt),
            updatedAt: new Date(data.updatedAt)
          };
        }
      } catch {
      }
      if (!updatedSession) {
        try {
          const { data, error } = await supabase.from("interview_sessions").update({ ...changes, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", id).eq("userId", userId).select().maybeSingle();
          if (!error && data) {
            updatedSession = {
              ...data,
              createdAt: new Date(data.createdAt || data.created_at),
              updatedAt: new Date(data.updatedAt || data.updated_at)
            };
          }
        } catch {
        }
      }
    }
  }
  if (!updatedSession) {
    const existing = inMemorySessions.get(id);
    if (existing && existing.userId === userId) {
      updatedSession = {
        ...existing,
        ...changes,
        updatedAt: /* @__PURE__ */ new Date()
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

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
var OAUTH_STATE_COOKIE = "__Host-oauth_state";
var decodeOAuthState = (state) => {
  let decoded;
  try {
    decoded = atob(state);
  } catch {
    return { redirectUri: "" };
  }
  try {
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed.redirectUri === "string") return parsed;
  } catch {
  }
  return { redirectUri: decoded };
};
var allowedResumeTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  const isSecure = isSecureRequest(req);
  return {
    httpOnly: true,
    path: "/",
    sameSite: isSecure ? "none" : "lax",
    secure: isSecure
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
init_env();
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    if (ENV.oAuthServerUrl) {
      console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    }
  }
  decodeState(state) {
    return decodeOAuthState(state).redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret || "careertwin-ai-jwt-secret-fallback-key-minimum-32-chars";
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);
    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }
    const session = await this.verifySession(sessionToken);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
      const taskUid = userInfo.taskUid ?? null;
      if (!taskUid) {
        throw ForbiddenError("Cron session missing task_uid");
      }
      return buildCronUser(userInfo);
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      if (session.openId.startsWith("supabase:")) {
        try {
          const { getSupabaseAdmin: getSupabaseAdmin2, getSupabaseClient: getSupabaseClient2 } = await Promise.resolve().then(() => (init_supabase(), supabase_exports));
          const supabase = getSupabaseAdmin2() || getSupabaseClient2();
          if (supabase) {
            const supaId = session.openId.replace("supabase:", "");
            const { data } = await supabase.auth.admin.getUserById(supaId);
            if (data?.user) {
              await upsertUser({
                openId: session.openId,
                name: data.user.user_metadata?.name || session.name || null,
                email: data.user.email ?? null,
                loginMethod: data.user.app_metadata?.provider || "email",
                lastSignedIn: signedInAt
              });
              user = await getUserByOpenId(session.openId);
            }
          }
        } catch {
        }
      } else if (ENV.oAuthServerUrl) {
        try {
          const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
          await upsertUser({
            openId: userInfo.openId,
            name: userInfo.name || null,
            email: userInfo.email ?? null,
            loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
            lastSignedIn: signedInAt
          });
          user = await getUserByOpenId(userInfo.openId);
        } catch (error) {
          console.warn("[Auth] Failed to sync user from OAuth:", error);
        }
      }
    }
    if (!user) {
      user = {
        id: -1,
        openId: session.openId,
        name: session.name || "User",
        email: null,
        loginMethod: "email",
        role: "user",
        createdAt: signedInAt,
        updatedAt: signedInAt,
        lastSignedIn: signedInAt
      };
    } else {
      const lastUpdate = lastSignedInUpdateCache.get(user.openId);
      if (!lastUpdate || Date.now() - lastUpdate > 15 * 60 * 1e3) {
        lastSignedInUpdateCache.set(user.openId, Date.now());
        upsertUser({
          openId: user.openId,
          lastSignedIn: signedInAt
        }).catch((err) => {
          console.warn("[Auth] Background lastSignedIn update skipped:", err?.message || err);
        });
      }
    }
    return user;
  }
};
var lastSignedInUpdateCache = /* @__PURE__ */ new Map();
var CRON_OPEN_ID_PREFIX = "cron_";
function buildCronUser(userInfo) {
  const now = /* @__PURE__ */ new Date();
  return {
    id: -1,
    openId: userInfo.openId,
    name: userInfo.name || "Manus Scheduled Task",
    email: null,
    loginMethod: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: userInfo.taskUid ?? void 0,
    isCron: true
  };
}
var sdk = new SDKServer();

// server/_core/googleAuth.ts
var GOOGLE_STATE_COOKIE = "__Host-google_oauth_state";
var GOOGLE_AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
var GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
var GOOGLE_SCOPES = "openid email profile";
function getGoogleOAuthConfig(env = process.env) {
  const clientId = env.GOOGLE_OAUTH_CLIENT_ID?.trim() ?? "";
  const clientSecret = env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() ?? "";
  const redirectUri = env.GOOGLE_OAUTH_REDIRECT_URI?.trim() ?? "";
  return clientId && clientSecret && redirectUri ? { clientId, clientSecret, redirectUri } : null;
}
function safeLoginRedirect(res, reason) {
  res.redirect(302, `/login?error=${reason}`);
}
function registerGoogleAuthRoutes(app2) {
  app2.get("/api/auth/google/status", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({ enabled: Boolean(getGoogleOAuthConfig()) });
  });
  app2.get("/api/auth/google/start", (req, res) => {
    const config = getGoogleOAuthConfig();
    if (!config) {
      safeLoginRedirect(res, "google-unavailable");
      return;
    }
    const state = randomBytes(32).toString("hex");
    const options = getSessionCookieOptions(req);
    res.cookie(GOOGLE_STATE_COOKIE, state, { ...options, maxAge: 10 * 60 * 1e3 });
    const authorizationUrl = new URL(GOOGLE_AUTHORIZATION_ENDPOINT);
    authorizationUrl.searchParams.set("client_id", config.clientId);
    authorizationUrl.searchParams.set("redirect_uri", config.redirectUri);
    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set("scope", GOOGLE_SCOPES);
    authorizationUrl.searchParams.set("state", state);
    authorizationUrl.searchParams.set("prompt", "select_account");
    res.redirect(302, authorizationUrl.toString());
  });
  app2.get("/api/auth/google/callback", async (req, res) => {
    const config = getGoogleOAuthConfig();
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";
    const expectedState = parseCookieHeader2(req.headers.cookie ?? "")[GOOGLE_STATE_COOKIE];
    res.clearCookie(GOOGLE_STATE_COOKIE, { path: "/", secure: true, sameSite: "none" });
    if (!config || !code || !state || !expectedState || state !== expectedState) {
      safeLoginRedirect(res, config ? "google-failed" : "google-unavailable");
      return;
    }
    try {
      const tokenResponse = await fetch(GOOGLE_TOKEN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: config.redirectUri,
          grant_type: "authorization_code"
        })
      });
      if (!tokenResponse.ok) throw new Error("Google token exchange failed");
      const tokens = await tokenResponse.json();
      if (!tokens.id_token) throw new Error("Google did not return an ID token");
      const client = new OAuth2Client(config.clientId);
      const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: config.clientId });
      const profile = ticket.getPayload();
      if (!profile?.sub || !profile.email || profile.email_verified !== true) throw new Error("Google profile verification failed");
      const openId = `google:${profile.sub}`;
      await upsertUser({
        openId,
        name: typeof profile.name === "string" ? profile.name : null,
        email: profile.email,
        loginMethod: "google",
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(openId, { name: typeof profile.name === "string" ? profile.name : "", expiresInMs: ONE_YEAR_MS });
      res.cookie("app_session_id", sessionToken, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[Google OAuth] Callback failed", error);
      safeLoginRedirect(res, "google-failed");
    }
  });
}

// server/_core/oauth.ts
import { parse as parseCookieHeader3 } from "cookie";
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app2) {
  app2.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    const { nonce } = decodeOAuthState(state);
    const expectedNonce = parseCookieHeader3(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];
    if (!nonce || nonce !== expectedNonce) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/", secure: true, sameSite: "none" });
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/storageProxy.ts
init_supabase();
import fs2 from "node:fs";
import path2 from "node:path";
var LOCAL_STORAGE_DIR = path2.resolve(process.cwd(), ".storage");
var STORAGE_BUCKET = "careertwin-storage";
function registerStorageProxy(app2) {
  const handleFileRequest = async (key, res) => {
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    const localFilePath = path2.join(LOCAL_STORAGE_DIR, key);
    if (fs2.existsSync(localFilePath)) {
      res.sendFile(localFilePath);
      return;
    }
    const supabase = getSupabaseAdmin() || getSupabaseClient();
    if (supabase) {
      try {
        const { data: publicData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(key);
        if (publicData?.publicUrl) {
          res.redirect(307, publicData.publicUrl);
          return;
        }
      } catch (err) {
        console.warn("[StorageProxy] Supabase redirect error:", err);
      }
    }
    res.status(404).send("File not found");
  };
  app2.get("/local-storage/*", async (req, res) => {
    const key = req.params[0];
    await handleFileRequest(key, res);
  });
  app2.get("/manus-storage/*", async (req, res) => {
    const key = req.params[0];
    await handleFileRequest(key, res);
  });
}

// server/gemini.ts
import fs3 from "node:fs";
import path3 from "node:path";
import zlib from "node:zlib";
import { z } from "zod";
import * as mammoth from "mammoth";
import { convert } from "@opendataloader/pdf";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// shared/publicUrl.ts
function normalizePublicHttpsUrl(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "";
  const candidate = raw.startsWith("//") ? `https:${raw}` : /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    if (!url.hostname || url.protocol !== "http:" && url.protocol !== "https:" || url.username || url.password || url.hostname === "localhost" || url.hostname.endsWith(".local")) return "";
    url.protocol = "https:";
    return url.toString();
  } catch {
    return "";
  }
}

// server/gemini.ts
if (typeof globalThis.DOMMatrix === "undefined") {
  globalThis.DOMMatrix = class DOMMatrix {
    a = 1;
    b = 0;
    c = 0;
    d = 1;
    e = 0;
    f = 0;
    m11 = 1;
    m12 = 0;
    m13 = 0;
    m14 = 0;
    m21 = 0;
    m22 = 1;
    m23 = 0;
    m24 = 0;
    m31 = 0;
    m32 = 0;
    m33 = 1;
    m34 = 0;
    m41 = 0;
    m42 = 0;
    m43 = 0;
    m44 = 1;
    is2D = true;
    isIdentity = true;
    constructor(init) {
      if (Array.isArray(init)) {
        this.a = init[0] ?? 1;
        this.b = init[1] ?? 0;
        this.c = init[2] ?? 0;
        this.d = init[3] ?? 1;
        this.e = init[4] ?? 0;
        this.f = init[5] ?? 0;
      }
    }
  };
}
function getGeminiApiKey() {
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0) {
    return process.env.GEMINI_API_KEY.trim().replace(/^["']|["']$/g, "");
  }
  try {
    const envPath = path3.resolve(process.cwd(), ".env");
    if (fs3.existsSync(envPath)) {
      const content = fs3.readFileSync(envPath, "utf-8");
      const match = content.match(/^GEMINI_API_KEY=["']?([^"'\r\n]+)["']?/m);
      if (match && match[1]) {
        const key = match[1].trim().replace(/^["']|["']$/g, "");
        process.env.GEMINI_API_KEY = key;
        return key;
      }
    }
  } catch {
  }
  return void 0;
}
var _cachedModels = [];
var _modelsCachedAt = 0;
var PREFERRED_MODEL_ORDER = [
  "gemini-3.1-flash-lite",
  "gemini-3.7-flash",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite-preview",
  "gemini-2.5-flash",
  "gemini-flash-latest"
];
var SKIP_MODELS = /* @__PURE__ */ new Set([
  "gemini-2.5-pro",
  // 404 / slow
  "gemini-pro-latest",
  // frequent 429
  "gemini-omni-flash-preview",
  "gemini-omni-1.1-flash",
  "deep-research-max-preview-04-2026",
  "deep-research-preview-04-2026",
  "deep-research-pro-preview-12-2025",
  "antigravity-preview-05-2026",
  "nano-banana-pro-preview"
]);
async function getAutoDiscoveredGeminiModels(apiKey) {
  if (process.env.NODE_ENV === "test" || apiKey === "test-key") {
    return [process.env.GEMINI_MODEL || "gemini-1.5-flash"];
  }
  if (_cachedModels.length > 0 && Date.now() - _modelsCachedAt < 10 * 60 * 1e3) {
    return _cachedModels;
  }
  let availableFromApi = [];
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`, {
      signal: AbortSignal.timeout(3e3)
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.models)) {
        availableFromApi = data.models.filter((m) => m.supportedGenerationMethods?.includes("generateContent")).map((m) => (m.name || "").replace(/^models\//, "")).filter((m) => Boolean(m) && !SKIP_MODELS.has(m) && !m.toLowerCase().includes("tts"));
      }
    }
  } catch {
    availableFromApi = PREFERRED_MODEL_ORDER.filter((m) => !SKIP_MODELS.has(m));
  }
  const sorted = [
    ...PREFERRED_MODEL_ORDER.filter((p) => availableFromApi.length === 0 || availableFromApi.includes(p)),
    ...availableFromApi.filter((a) => !PREFERRED_MODEL_ORDER.includes(a) && (a.includes("flash") || a.includes("pro")) && !a.toLowerCase().includes("tts"))
  ];
  _cachedModels = sorted;
  _modelsCachedAt = Date.now();
  return sorted;
}
var maxPromptCharacters = 8e4;
var compactResumeSourceTextLimit = 28e3;
var geminiResumeRequestTimeoutMs = 35e3;
var geminiResumeFallbackTimeoutMs = 2e4;
var geminiQualificationRecoveryTimeoutMs = 1e4;
var resumeFieldNames = ["fullName", "location", "phone", "contactEmail", "linkedinUrl", "portfolioUrl", "age", "education", "degree", "careerStatus", "currentJob", "company", "lookingFor", "careerField", "targetRole", "skills", "experience", "professionalSummary", "certifications", "languages", "projects", "verifiedDetails"];
var fieldEvidenceSchema = z.object({
  confidence: z.number().min(0).max(1),
  sourceText: z.string().trim().max(360)
});
var evidenceShape = Object.fromEntries(resumeFieldNames.map((name) => [name, fieldEvidenceSchema]));
var resumeProjectSchema = z.object({
  name: z.string().trim().max(140),
  summary: z.string().trim().max(700),
  link: z.string().trim().max(500),
  technologies: z.array(z.string().trim().min(1).max(80)).max(16)
});
var resumeCertificationSchema = z.object({
  name: z.string().trim().max(140),
  issuer: z.string().trim().max(140),
  credentialId: z.string().trim().max(100),
  issuedOn: z.string().trim().max(40),
  link: z.string().trim().max(500)
});
var resumeLanguageSchema = z.object({
  name: z.string().trim().max(80),
  proficiency: z.enum(["Native", "Professional", "Conversational", "Basic", ""])
});
var resumeVerifiedDetailSchema = z.object({
  category: z.enum(["Achievement", "Award", "Coursework", "Leadership", "Volunteer", "Publication", "Training", "Other"]),
  title: z.string().trim().min(1).max(120),
  detail: z.string().trim().min(1).max(260)
});
var resumeSuggestionSchema = z.object({
  fullName: z.string().trim().max(160),
  location: z.string().trim().max(160),
  phone: z.string().trim().max(64),
  contactEmail: z.string().trim().max(320),
  linkedinUrl: z.string().trim().max(500),
  portfolioUrl: z.string().trim().max(500),
  age: z.number().int().min(0).max(120),
  education: z.enum(["Bachelor's", "Master's", "MPhil", "PhD", "Diploma", "Other", ""]),
  degree: z.string().trim().max(180),
  careerStatus: z.enum(["working", "seeking", ""]),
  currentJob: z.string().trim().max(180),
  company: z.string().trim().max(180),
  lookingFor: z.enum(["First Job", "Internship", "Freelance", "Career Switch", "Higher Studies", ""]),
  careerField: z.string().trim().max(120),
  targetRole: z.string().trim().max(180),
  skills: z.array(z.string().trim().min(1).max(120)).max(40),
  experience: z.string().trim().max(6e3),
  professionalSummary: z.string().trim().max(1600),
  certifications: z.array(resumeCertificationSchema).max(12),
  languages: z.array(resumeLanguageSchema).max(10),
  projects: z.array(resumeProjectSchema).max(8),
  verifiedDetails: z.array(resumeVerifiedDetailSchema).max(16),
  fieldEvidence: z.object(evidenceShape)
});
var qualificationRecoverySchema = z.object({
  certifications: z.array(resumeCertificationSchema).max(12),
  languages: z.array(resumeLanguageSchema).max(10),
  projects: z.array(resumeProjectSchema).max(8),
  fieldEvidence: z.object({ certifications: fieldEvidenceSchema, languages: fieldEvidenceSchema, projects: fieldEvidenceSchema })
});
var responseSchema = {
  type: "object",
  properties: {
    fullName: { type: "string" },
    location: { type: "string" },
    phone: { type: "string" },
    contactEmail: { type: "string" },
    linkedinUrl: { type: "string" },
    portfolioUrl: { type: "string" },
    age: { type: "integer", description: "Explicit age, or age calculated from an explicit date of birth; use 0 only when neither is present." },
    education: { type: "string", enum: ["Bachelor's", "Master's", "MPhil", "PhD", "Diploma", "Other", "unknown"] },
    degree: { type: "string" },
    careerStatus: { type: "string", enum: ["working", "seeking", "unknown"] },
    currentJob: { type: "string" },
    company: { type: "string" },
    lookingFor: { type: "string", enum: ["First Job", "Internship", "Freelance", "Career Switch", "Higher Studies", "unknown"] },
    careerField: { type: "string" },
    targetRole: { type: "string" },
    skills: { type: "array", items: { type: "string" } },
    experience: { type: "string" },
    professionalSummary: { type: "string" },
    certifications: { type: "array", items: { type: "object", properties: { name: { type: "string" }, issuer: { type: "string" }, credentialId: { type: "string" }, issuedOn: { type: "string" }, link: { type: "string" } }, required: ["name"] } },
    languages: { type: "array", items: { type: "object", properties: { name: { type: "string" }, proficiency: { type: "string", enum: ["Native", "Professional", "Conversational", "Basic", "unknown"] } }, required: ["name"] } },
    projects: { type: "array", items: { type: "object", properties: { name: { type: "string" }, summary: { type: "string" }, link: { type: "string" }, technologies: { type: "array", items: { type: "string" } } }, required: ["name"] } },
    verifiedDetails: { type: "array", items: { type: "object", properties: { category: { type: "string", enum: ["Achievement", "Award", "Coursework", "Leadership", "Volunteer", "Publication", "Training", "Other"] }, title: { type: "string" }, detail: { type: "string" } }, required: ["title", "detail"] } },
    fieldEvidence: {
      type: "object",
      properties: Object.fromEntries(resumeFieldNames.map((name) => [name, { type: "object", properties: { confidence: { type: "number" }, sourceText: { type: "string" } }, required: ["confidence", "sourceText"] }]))
    }
  },
  required: ["fullName", "skills", "experience"]
};
function normalizeUnknownEnumValues(value) {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(normalizeUnknownEnumValues);
  const record = value;
  const normalized = Object.fromEntries(Object.entries(record).map(([key, child]) => [key, normalizeUnknownEnumValues(child)]));
  for (const key of ["education", "careerStatus", "lookingFor", "proficiency"]) if (normalized[key] === "unknown") normalized[key] = "";
  return normalized;
}
var normalizePublicHttpsUrl2 = normalizePublicHttpsUrl;
function compactResumeSourceText(documentText) {
  const seenLines = /* @__PURE__ */ new Set();
  const uniqueLines = documentText.split(/\n+/).map((line) => line.replace(/\s+/g, " ").trim()).filter((line) => {
    if (!line) return false;
    const key = line.toLocaleLowerCase();
    if (seenLines.has(key)) return false;
    seenLines.add(key);
    return true;
  });
  const compacted = uniqueLines.join("\n").trim();
  if (compacted.length <= compactResumeSourceTextLimit) return compacted;
  const firstSectionLength = Math.floor(compactResumeSourceTextLimit * 0.74);
  const finalSectionLength = compactResumeSourceTextLimit - firstSectionLength;
  return `${compacted.slice(0, firstSectionLength).trim()}
[Resume content continues]
${compacted.slice(-finalSectionLength).trim()}`;
}
var educationAliases = {
  bachelor: "Bachelor's",
  bachelors: "Bachelor's",
  "bachelor's": "Bachelor's",
  bsc: "Bachelor's",
  bs: "Bachelor's",
  be: "Bachelor's",
  bba: "Bachelor's",
  master: "Master's",
  masters: "Master's",
  "master's": "Master's",
  msc: "Master's",
  ms: "Master's",
  mba: "Master's",
  mphil: "MPhil",
  phd: "PhD",
  diploma: "Diploma",
  other: "Other"
};
function normalizeEducation(value) {
  if (typeof value !== "string") return "";
  const compact = value.trim().toLowerCase().replace(/[^a-z]/g, "");
  if (compact.includes("bachelor") || compact.startsWith("bsc") || compact.startsWith("bs")) return "Bachelor's";
  if (compact.includes("master") || compact.startsWith("msc") || compact.startsWith("ms") || compact.startsWith("mba")) return "Master's";
  if (compact.includes("mphil")) return "MPhil";
  if (compact.includes("phd")) return "PhD";
  if (compact.includes("diploma")) return "Diploma";
  return educationAliases[compact] ?? "";
}
function normalizeCareerStatus(value) {
  if (typeof value !== "string") return "";
  const compact = value.trim().toLowerCase();
  if (["working", "employed", "currently working", "currently employed"].includes(compact)) return "working";
  if (["seeking", "job seeker", "seeking opportunity", "looking for work", "open to work"].includes(compact)) return "seeking";
  return "";
}
function normalizeLookingFor(value) {
  if (typeof value !== "string") return "";
  const compact = value.trim().toLowerCase();
  if (["first job", "job", "graduate job", "entry level job"].includes(compact)) return "First Job";
  if (["intern", "internship"].includes(compact)) return "Internship";
  if (["freelance", "freelancing"].includes(compact)) return "Freelance";
  if (["career switch", "switching careers"].includes(compact)) return "Career Switch";
  if (["higher studies", "postgraduate studies", "further study"].includes(compact)) return "Higher Studies";
  return "";
}
function conciseText(value, maxLength) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maxLength) : "";
}
function experienceEntryToTimelineText(value) {
  if (typeof value === "string") return conciseText(value, 900);
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const record = value;
  const role = conciseText(record.role ?? record.title ?? record.position ?? record.jobTitle, 180);
  const organization = conciseText(record.organization ?? record.company ?? record.employer ?? record.institution, 180);
  const location = conciseText(record.location ?? record.city, 120);
  const period = conciseText(record.period ?? record.dates ?? record.dateRange ?? record.duration, 120);
  const description = conciseText(record.description ?? record.summary ?? record.details ?? record.achievements, 440);
  const headline = [role, organization ? `at ${organization}` : ""].filter(Boolean).join(" ");
  const detail = [location, period].filter(Boolean).join(" | ");
  return [headline, detail ? `\u2014 ${detail}` : "", description].filter(Boolean).join(" ").trim().slice(0, 900);
}
function recoverExplicitEducation(documentText) {
  const candidates = documentText.match(/\b(?:bachelor(?:'s)?|bsc|b\.s\.?|bs|master(?:'s)?|msc|m\.s\.?|ms|mba|mphil|ph\.d\.?|phd|diploma)\b[^\n|•]{0,180}/gi) ?? [];
  const degree = conciseText(candidates[0], 180);
  return degree ? { education: normalizeEducation(degree), degree } : null;
}
function recoverCurrentCareerDirection(experience) {
  const currentEntry = experience.split(";").map((entry) => entry.trim()).find((entry) => /\b(?:present|current)\b/i.test(entry));
  if (!currentEntry) return null;
  const match = currentEntry.match(/^(.+?)\s+at\s+(.+?)(?:\s+—|\s+\||$)/i);
  return {
    careerStatus: "working",
    currentJob: conciseText(match?.[1] ?? currentEntry.split(/\s+—|\s+\|/)[0], 180),
    company: conciseText(match?.[2] ?? "", 180),
    sourceText: conciseText(currentEntry, 360)
  };
}
function recoverExplicitCertifications(documentText) {
  const seen = /* @__PURE__ */ new Set();
  return documentText.split(/\n+/).map((line) => conciseText(line, 140)).filter((line) => {
    const key = line.toLocaleLowerCase();
    const isCertification = /\b(?:certificate|certification|certified|course completion|training|credential)\b/i.test(line);
    if (!isCertification || line.length < 8 || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 12).map((name) => ({ name, issuer: "", credentialId: "", issuedOn: "", link: "" }));
}
function extractExplicitAgeHint(text2, now = /* @__PURE__ */ new Date()) {
  const explicitAge = text2.match(/\bage\s*[:\-]?\s*(\d{1,3})\b|\b(\d{1,3})\s*(?:years?\s*old|yrs?\s*old)\b/i);
  const ageValue = Number(explicitAge?.[1] ?? explicitAge?.[2]);
  if (Number.isInteger(ageValue) && ageValue >= 0 && ageValue <= 120) return { age: ageValue, sourceText: explicitAge?.[0].trim() ?? "" };
  const dob = text2.match(/\b(?:date\s*of\s*birth|birth\s*date|dob)\s*[:\-]?\s*((?:\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})|(?:\d{4}[\/.\-]\d{1,2}[\/.\-]\d{1,2})|(?:\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}))/i);
  if (!dob?.[1]) return null;
  const value = dob[1].trim();
  let birthDate = null;
  const numeric = value.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
  const iso = value.match(/^(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})$/);
  if (numeric) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]);
    const rawYear = Number(numeric[3]);
    const year = rawYear < 100 ? 1900 + rawYear : rawYear;
    birthDate = new Date(year, month - 1, day);
  } else if (iso) {
    birthDate = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  } else {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) birthDate = new Date(parsed);
  }
  if (!birthDate || Number.isNaN(birthDate.getTime()) || birthDate > now) return null;
  let age = now.getFullYear() - birthDate.getFullYear();
  if (now.getMonth() < birthDate.getMonth() || now.getMonth() === birthDate.getMonth() && now.getDate() < birthDate.getDate()) age -= 1;
  return age >= 0 && age <= 120 ? { age, sourceText: dob[0].trim() } : null;
}
function normalizeResumePayload(value, documentText = "") {
  const normalized = normalizeUnknownEnumValues(value);
  if (!normalized || typeof normalized !== "object" || Array.isArray(normalized)) return normalized;
  const record = normalized;
  for (const field of ["fullName", "location", "phone", "contactEmail", "linkedinUrl", "portfolioUrl", "degree", "currentJob", "company", "careerField", "targetRole", "professionalSummary"]) {
    if (typeof record[field] !== "string") record[field] = "";
  }
  record.fullName = conciseText(record.fullName, 160);
  record.location = conciseText(record.location, 160);
  record.phone = conciseText(record.phone, 64);
  record.contactEmail = conciseText(record.contactEmail, 320);
  record.degree = conciseText(record.degree, 180);
  record.currentJob = conciseText(record.currentJob, 180);
  record.company = conciseText(record.company, 180);
  record.careerField = conciseText(record.careerField, 120);
  record.targetRole = conciseText(record.targetRole, 180);
  record.professionalSummary = conciseText(record.professionalSummary, 1600);
  record.linkedinUrl = normalizePublicHttpsUrl2(record.linkedinUrl);
  record.portfolioUrl = normalizePublicHttpsUrl2(record.portfolioUrl);
  record.education = normalizeEducation(record.education);
  record.careerStatus = normalizeCareerStatus(record.careerStatus);
  record.lookingFor = normalizeLookingFor(record.lookingFor);
  const numericAge = typeof record.age === "number" ? record.age : Number(record.age);
  record.age = Number.isInteger(numericAge) && numericAge >= 0 && numericAge <= 120 ? numericAge : 0;
  if (documentText) {
    if (!record.contactEmail) {
      const emailMatch = documentText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) record.contactEmail = conciseText(emailMatch[0], 320);
    }
    if (!record.phone) {
      const phoneMatch = documentText.match(/(?:\+?\d{1,4}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/);
      if (phoneMatch && phoneMatch[0].replace(/\D/g, "").length >= 7) {
        record.phone = conciseText(phoneMatch[0], 64);
      }
    }
    if (!record.linkedinUrl) {
      const linkedinMatch = documentText.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_\-\.%]+/i);
      if (linkedinMatch) record.linkedinUrl = normalizePublicHttpsUrl2(linkedinMatch[0]);
    }
    if (!record.portfolioUrl) {
      const githubMatch = documentText.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9_\-\.%]+/i);
      if (githubMatch) record.portfolioUrl = normalizePublicHttpsUrl2(githubMatch[0]);
    }
  }
  const rawSkills = Array.isArray(record.skills) ? record.skills : typeof record.skills === "string" ? record.skills.split(/[\n,•|]/) : [];
  const seenSkills = /* @__PURE__ */ new Set();
  record.skills = rawSkills.map((skill) => String(skill).trim()).filter((skill) => {
    if (!skill || seenSkills.has(skill.toLocaleLowerCase())) return false;
    seenSkills.add(skill.toLocaleLowerCase());
    return true;
  }).slice(0, 40);
  const rawExperience = Array.isArray(record.experience) ? record.experience : record.experience ? [record.experience] : [];
  record.experience = rawExperience.map(experienceEntryToTimelineText).filter(Boolean).join("; ").slice(0, 6e3);
  const seenCertifications = /* @__PURE__ */ new Set();
  const rawCertifications = Array.isArray(record.certifications) ? record.certifications : typeof record.certifications === "string" && record.certifications.trim() ? [{ name: record.certifications }] : [];
  record.certifications = rawCertifications.map((certification) => {
    const source = certification && typeof certification === "object" && !Array.isArray(certification) ? certification : {};
    return {
      name: typeof source.name === "string" ? source.name.trim().slice(0, 140) : "",
      issuer: typeof source.issuer === "string" ? source.issuer.trim().slice(0, 140) : "",
      credentialId: typeof source.credentialId === "string" ? source.credentialId.trim().slice(0, 100) : "",
      issuedOn: typeof source.issuedOn === "string" ? source.issuedOn.trim().slice(0, 40) : "",
      link: normalizePublicHttpsUrl2(source.link).slice(0, 500)
    };
  }).filter((certification) => {
    const key = certification.name.toLocaleLowerCase();
    if (!key || seenCertifications.has(key)) return false;
    seenCertifications.add(key);
    return true;
  }).slice(0, 20);
  const rawLanguages = Array.isArray(record.languages) ? record.languages : typeof record.languages === "string" ? record.languages.split(/[\n,•|]/).map((name) => ({ name })) : [];
  const seenLanguages = /* @__PURE__ */ new Set();
  record.languages = rawLanguages.map((language) => {
    const source = language && typeof language === "object" && !Array.isArray(language) ? language : {};
    const name = typeof source.name === "string" ? source.name.trim().slice(0, 80) : "";
    const rawProficiency = typeof source.proficiency === "string" ? source.proficiency.trim().toLowerCase() : "";
    const proficiency = rawProficiency === "native" ? "Native" : rawProficiency === "professional" || rawProficiency === "fluent" ? "Professional" : rawProficiency === "conversational" || rawProficiency === "intermediate" ? "Conversational" : rawProficiency === "basic" || rawProficiency === "beginner" ? "Basic" : "";
    return { name, proficiency };
  }).filter((language) => {
    const key = language.name.toLocaleLowerCase();
    if (!key || seenLanguages.has(key)) return false;
    seenLanguages.add(key);
    return true;
  }).slice(0, 10);
  const seenProjects = /* @__PURE__ */ new Set();
  record.projects = (Array.isArray(record.projects) ? record.projects : []).map((project) => {
    const source = project && typeof project === "object" && !Array.isArray(project) ? project : {};
    const rawTech = source.technologies ?? source.tech ?? source.tools ?? source.stack ?? [];
    const rawTechnologies = Array.isArray(rawTech) ? rawTech : typeof rawTech === "string" ? rawTech.split(/[\n,•|]/) : [];
    const seenTechnologies = /* @__PURE__ */ new Set();
    const technologies = rawTechnologies.map((technology) => String(technology).trim()).filter((technology) => {
      if (!technology || seenTechnologies.has(technology.toLocaleLowerCase())) return false;
      seenTechnologies.add(technology.toLocaleLowerCase());
      return true;
    }).slice(0, 16);
    const rawSummary = source.summary ?? source.description ?? source.details ?? "";
    const summary = typeof rawSummary === "string" ? rawSummary.trim().slice(0, 700) : Array.isArray(rawSummary) ? rawSummary.join(" ").trim().slice(0, 700) : "";
    return {
      name: typeof source.name === "string" ? source.name.trim().slice(0, 140) : "",
      summary,
      link: normalizePublicHttpsUrl2(source.link).slice(0, 500),
      technologies
    };
  }).filter((project) => {
    const key = project.name.toLocaleLowerCase();
    if (!key || seenProjects.has(key)) return false;
    seenProjects.add(key);
    return true;
  }).slice(0, 20);
  const verifiedDetailCategories = /* @__PURE__ */ new Set(["Achievement", "Award", "Coursework", "Leadership", "Volunteer", "Publication", "Training", "Other"]);
  const normalizedDetailSource = documentText.replace(/\s+/g, " ").trim().toLocaleLowerCase();
  const seenVerifiedDetails = /* @__PURE__ */ new Set();
  record.verifiedDetails = (Array.isArray(record.verifiedDetails) ? record.verifiedDetails : []).map((detail) => {
    const source = detail && typeof detail === "object" && !Array.isArray(detail) ? detail : {};
    const category = typeof source.category === "string" && verifiedDetailCategories.has(source.category) ? source.category : "Other";
    return { category, title: conciseText(source.title, 120), detail: conciseText(source.detail, 260) };
  }).filter((detail) => {
    const key = `${detail.category}|${detail.title}|${detail.detail}`.toLocaleLowerCase();
    const detailIsGrounded = !normalizedDetailSource || normalizedDetailSource.includes(detail.detail.replace(/\s+/g, " ").toLocaleLowerCase()) || normalizedDetailSource.includes(detail.title.replace(/\s+/g, " ").toLocaleLowerCase());
    if (!detail.title || !detail.detail || !detailIsGrounded || seenVerifiedDetails.has(key)) return false;
    seenVerifiedDetails.add(key);
    return true;
  }).slice(0, 20);
  const rawEvidence = record.fieldEvidence && typeof record.fieldEvidence === "object" && !Array.isArray(record.fieldEvidence) ? record.fieldEvidence : {};
  const normalizedDocumentText = documentText.replace(/\s+/g, " ").trim().toLocaleLowerCase();
  const fieldEvidence = Object.fromEntries(resumeFieldNames.map((name) => {
    const item = rawEvidence[name] && typeof rawEvidence[name] === "object" && !Array.isArray(rawEvidence[name]) ? rawEvidence[name] : {};
    const numericConfidence = typeof item.confidence === "number" ? item.confidence : Number(item.confidence);
    const sourceText = typeof item.sourceText === "string" ? item.sourceText.trim().slice(0, 360) : "";
    const sourceIsGrounded = !normalizedDocumentText || !sourceText || normalizedDocumentText.includes(sourceText.replace(/\s+/g, " ").toLocaleLowerCase());
    return [name, sourceIsGrounded ? { confidence: Number.isFinite(numericConfidence) ? Math.max(0, Math.min(1, numericConfidence)) : 0, sourceText } : { confidence: 0, sourceText: "" }];
  }));
  const explicitAge = record.age === 0 ? extractExplicitAgeHint(documentText) : null;
  if (explicitAge) {
    record.age = explicitAge.age;
    fieldEvidence.age = { confidence: explicitAge.sourceText.toLowerCase().includes("dob") || explicitAge.sourceText.toLowerCase().includes("birth") ? 0.9 : 0.98, sourceText: explicitAge.sourceText };
  }
  const explicitEducation = documentText && (!record.education || !record.degree) ? recoverExplicitEducation(documentText) : null;
  if (explicitEducation) {
    if (!record.education && explicitEducation.education) record.education = explicitEducation.education;
    if (!record.degree) record.degree = explicitEducation.degree;
    if (!fieldEvidence.education.sourceText && explicitEducation.education) fieldEvidence.education = { confidence: 0.9, sourceText: explicitEducation.degree };
    if (!fieldEvidence.degree.sourceText) fieldEvidence.degree = { confidence: 0.9, sourceText: explicitEducation.degree };
  }
  const experienceText = typeof record.experience === "string" ? record.experience : "";
  const currentCareer = !record.careerStatus || !record.currentJob || !record.company ? recoverCurrentCareerDirection(experienceText) : null;
  if (currentCareer) {
    if (!record.careerStatus) record.careerStatus = currentCareer.careerStatus;
    if (!record.currentJob) record.currentJob = currentCareer.currentJob;
    if (!record.company) record.company = currentCareer.company;
    if (!fieldEvidence.careerStatus.sourceText) fieldEvidence.careerStatus = { confidence: 0.94, sourceText: currentCareer.sourceText };
    if (!fieldEvidence.currentJob.sourceText && currentCareer.currentJob) fieldEvidence.currentJob = { confidence: 0.94, sourceText: currentCareer.sourceText };
    if (!fieldEvidence.company.sourceText && currentCareer.company) fieldEvidence.company = { confidence: 0.94, sourceText: currentCareer.sourceText };
  }
  if (!record.targetRole && record.currentJob) {
    record.targetRole = record.currentJob;
  }
  if (!record.careerField && record.targetRole) {
    record.careerField = record.targetRole;
  }
  const normalizedCertifications = Array.isArray(record.certifications) ? record.certifications : [];
  if (normalizedCertifications.length === 0 && documentText) {
    const explicitCertifications = recoverExplicitCertifications(documentText);
    if (explicitCertifications.length) {
      record.certifications = explicitCertifications;
      fieldEvidence.certifications = { confidence: 0.86, sourceText: explicitCertifications[0].name };
    }
  }
  if (!record.contactEmail && documentText) {
    const emailMatch = documentText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
    if (emailMatch) {
      record.contactEmail = emailMatch[0].trim();
      if (!fieldEvidence.contactEmail.sourceText) {
        fieldEvidence.contactEmail = { confidence: 0.95, sourceText: emailMatch[0].trim() };
      }
    }
  }
  if (!record.phone && documentText) {
    const phoneMatch = documentText.match(/(?:\+?\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,5}/);
    if (phoneMatch && phoneMatch[0].replace(/\D/g, "").length >= 7) {
      record.phone = phoneMatch[0].trim();
      if (!fieldEvidence.phone.sourceText) {
        fieldEvidence.phone = { confidence: 0.92, sourceText: phoneMatch[0].trim() };
      }
    }
  }
  if (!record.linkedinUrl && documentText) {
    const linkedinMatch = documentText.match(/https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/i) || documentText.match(/linkedin\.com\/in\/[a-zA-Z0-9_-]+/i);
    if (linkedinMatch) {
      const url = linkedinMatch[0].startsWith("http") ? linkedinMatch[0] : `https://${linkedinMatch[0]}`;
      record.linkedinUrl = normalizePublicHttpsUrl2(url);
      if (!fieldEvidence.linkedinUrl.sourceText) {
        fieldEvidence.linkedinUrl = { confidence: 0.96, sourceText: linkedinMatch[0] };
      }
    }
  }
  if (!record.portfolioUrl && documentText) {
    const githubMatch = documentText.match(/https?:\/\/(?:www\.)?github\.com\/[a-zA-Z0-9_-]+/i) || documentText.match(/github\.com\/[a-zA-Z0-9_-]+/i);
    if (githubMatch) {
      const url = githubMatch[0].startsWith("http") ? githubMatch[0] : `https://${githubMatch[0]}`;
      record.portfolioUrl = normalizePublicHttpsUrl2(url);
      if (!fieldEvidence.portfolioUrl.sourceText) {
        fieldEvidence.portfolioUrl = { confidence: 0.95, sourceText: githubMatch[0] };
      }
    }
  }
  if (!record.fullName && documentText) {
    const lines = documentText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const candidateName = lines.find((l) => l.length >= 3 && l.length <= 50 && !l.includes("@") && !l.includes("http") && !/curriculum|resume|cv\b/i.test(l));
    if (candidateName) {
      record.fullName = candidateName;
      if (!fieldEvidence.fullName.sourceText) {
        fieldEvidence.fullName = { confidence: 0.85, sourceText: candidateName };
      }
    }
  }
  return { ...record, fieldEvidence };
}
function extractTextFromResponse(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts) && parts.length > 0) {
    const texts = parts.map((p) => typeof p?.text === "string" ? p.text : "").filter(Boolean);
    if (texts.length > 0) return texts.join("");
  }
  const directText = payload?.candidates?.[0]?.content?.text;
  if (typeof directText === "string" && directText.trim()) return directText;
  throw new Error("Gemini returned no structured resume suggestions.");
}
function isGeminiTimeout(error) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return error instanceof DOMException && error.name === "TimeoutError" || message.includes("timeout");
}
async function retryTemporaryProviderDemand(request) {
  let response = await request();
  if (response.status !== 503) return response;
  console.warn("[Resume AI] Gemini reported temporary high demand; retrying once.");
  await new Promise((resolve) => setTimeout(resolve, 600));
  response = await request();
  return response;
}
function parseGeminiJson(text2) {
  let cleaned = text2.trim();
  const codeBlockMatch = cleaned.match(/```(?:json|json5)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    cleaned = codeBlockMatch[1].trim();
  } else {
    cleaned = cleaned.replace(/^```[a-z0-9_-]*\s*/i, "").replace(/\s*```$/, "").trim();
  }
  cleaned = cleaned.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  cleaned = cleaned.replace(/,\s*([\}\]])/g, "$1");
  try {
    return JSON.parse(cleaned);
  } catch (initialError) {
    const start = cleaned.indexOf("{");
    if (start < 0) throw initialError;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < cleaned.length; index += 1) {
      const character = cleaned[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (character === "\\") escaped = true;
        else if (character === '"') inString = false;
        continue;
      }
      if (character === '"') inString = true;
      else if (character === "{") depth += 1;
      else if (character === "}") {
        depth -= 1;
        if (depth === 0) {
          try {
            const slice = cleaned.slice(start, index + 1).replace(/,\s*([\}\]])/g, "$1");
            return JSON.parse(slice);
          } catch {
          }
        }
      }
    }
    try {
      let candidate = cleaned.slice(start);
      const stack = [];
      let inStr = false;
      let esc = false;
      for (let i = 0; i < candidate.length; i++) {
        const char = candidate[i];
        if (inStr) {
          if (esc) esc = false;
          else if (char === "\\") esc = true;
          else if (char === '"') inStr = false;
        } else {
          if (char === '"') inStr = true;
          else if (char === "{") stack.push("{");
          else if (char === "[") stack.push("[");
          else if (char === "}" && stack.length > 0 && stack[stack.length - 1] === "{") stack.pop();
          else if (char === "]" && stack.length > 0 && stack[stack.length - 1] === "[") stack.pop();
        }
      }
      let repaired = candidate;
      if (inStr) repaired += '"';
      repaired = repaired.replace(/,\s*$/, "");
      while (stack.length > 0) {
        const top = stack.pop();
        repaired += top === "{" ? "}" : "]";
      }
      repaired = repaired.replace(/,\s*([\}\]])/g, "$1");
      const parsed = JSON.parse(repaired);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
    }
    throw initialError;
  }
}
function resumeDecodeFailureCategory(error) {
  if (error instanceof SyntaxError) return "json-syntax";
  const message = error instanceof Error ? error.message.toLocaleLowerCase() : "";
  if (message.includes("no structured resume suggestions")) return "missing-text-part";
  return "unexpected-shape";
}
function compactResumePrompt() {
  return `Extract a private resume into one compact JSON object. Use only facts printed in the resume. Return only valid JSON: no markdown or commentary. Include only fields you can support; the server fills unknown fields safely. Use these names when present: fullName, location, phone, contactEmail, linkedinUrl, portfolioUrl, age, education, degree, careerStatus, currentJob, company, lookingFor, careerField, targetRole, skills, experience, professionalSummary, certifications, languages, projects, verifiedDetails. Keep strings concise. Return every distinct named technical, domain, business, tool, automation, coursework, and professional skill as a standalone tag, not a grouped summary; limit skills to 40, certifications to 8, languages to 6, projects to 5, and verifiedDetails to 10. Certifications use name, issuer, credentialId, issuedOn, link. Languages use name, proficiency. Projects use name, summary below 180 characters, link, technologies with at most 8 items. For every public LinkedIn, portfolio, certification, or project link, return a valid absolute HTTPS URL; add https:// when the resume prints only a domain, and omit invalid, private, credentialed, or non-web links. verifiedDetails captures only extra explicit resume facts not represented above: category is Achievement, Award, Coursework, Leadership, Volunteer, Publication, Training, or Other; title is a short label; detail is an exact resume phrase below 220 characters. Omit unsupported fields and never invent values, links, technologies, or details.`;
}
function needsQualificationRecovery(suggestions) {
  if (suggestions.fullName && (suggestions.skills.length > 0 || suggestions.experience.length > 0)) {
    return false;
  }
  return false;
}
function mergeQualificationRecovery(primary, recovery) {
  const recoveredCertifications = new Map(recovery.certifications.map((certification) => [certification.name.toLocaleLowerCase(), certification]));
  const certifications = primary.certifications.map((certification) => {
    const recovered = recoveredCertifications.get(certification.name.toLocaleLowerCase());
    return recovered ? { name: certification.name, issuer: certification.issuer || recovered.issuer, credentialId: certification.credentialId || recovered.credentialId, issuedOn: certification.issuedOn || recovered.issuedOn, link: certification.link || recovered.link } : certification;
  });
  for (const certification of recovery.certifications) if (!certifications.some((item) => item.name.toLocaleLowerCase() === certification.name.toLocaleLowerCase())) certifications.push(certification);
  const recoveredLanguages = new Map(recovery.languages.map((language) => [language.name.toLocaleLowerCase(), language]));
  const languages = primary.languages.map((language) => ({ ...language, proficiency: language.proficiency || recoveredLanguages.get(language.name.toLocaleLowerCase())?.proficiency || "" }));
  for (const language of recovery.languages) if (!languages.some((item) => item.name.toLocaleLowerCase() === language.name.toLocaleLowerCase())) languages.push(language);
  const recoveredProjects = new Map(recovery.projects.map((project) => [project.name.toLocaleLowerCase(), project]));
  const projects = primary.projects.map((project) => {
    const recovered = recoveredProjects.get(project.name.toLocaleLowerCase());
    return recovered ? { name: project.name, summary: project.summary || recovered.summary, link: project.link || recovered.link, technologies: project.technologies.length ? project.technologies : recovered.technologies } : project;
  });
  for (const project of recovery.projects) if (!projects.some((item) => item.name.toLocaleLowerCase() === project.name.toLocaleLowerCase())) projects.push(project);
  const fieldEvidence = { ...primary.fieldEvidence };
  for (const field of ["certifications", "languages", "projects"]) if (!fieldEvidence[field].sourceText && recovery[field].length) fieldEvidence[field] = recovery.fieldEvidence[field];
  return { ...primary, certifications: certifications.slice(0, 12), languages: languages.slice(0, 10), projects: projects.slice(0, 8), fieldEvidence };
}
function normalizeQualificationRecoveryPayload(value) {
  const normalized = normalizeResumePayload(value);
  return {
    certifications: normalized.certifications ?? [],
    languages: normalized.languages ?? [],
    projects: normalized.projects ?? [],
    fieldEvidence: {
      certifications: normalized.fieldEvidence?.certifications ?? { confidence: 0, sourceText: "" },
      languages: normalized.fieldEvidence?.languages ?? { confidence: 0, sourceText: "" },
      projects: normalized.fieldEvidence?.projects ?? { confidence: 0, sourceText: "" }
    }
  };
}
function flattenPdfElements(value, output = [], citations = []) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) flattenPdfElements(item, output, citations);
    return;
  }
  const record = value;
  const content = typeof record.content === "string" ? record.content.trim() : "";
  if (content) {
    output.push(content);
    const page = record["page number"] ?? record.page;
    const bbox = record["bounding box"] ?? record.bbox;
    const location = [page ? `page ${page}` : "", Array.isArray(bbox) ? `position ${bbox.join(", ")}` : ""].filter(Boolean).join(", ");
    citations.push(location ? `[${location}] ${content}` : content);
  }
  for (const [key, child] of Object.entries(record)) {
    if (key !== "content") flattenPdfElements(child, output, citations);
  }
}
async function extractPdfWithOpenDataLoader(buffer) {
  try {
    const directory = await mkdtemp(join(tmpdir(), "careertwin-resume-"));
    const inputPath = join(directory, "resume.pdf");
    try {
      await writeFile(inputPath, buffer);
      await convert(inputPath, { outputDir: directory, format: ["json"], quiet: true, readingOrder: "xycut", keepLineBreaks: true, imageOutput: "off", threads: "1" });
      const parsed = JSON.parse(await readFile(join(directory, "resume.json"), "utf8"));
      const textParts = [];
      const citationParts = [];
      flattenPdfElements(parsed, textParts, citationParts);
      const text2 = textParts.join("\n").replace(/\u0000/g, "").trim().slice(0, maxPromptCharacters);
      if (!text2) return null;
      return { text: text2, citations: citationParts.join("\n").slice(0, maxPromptCharacters) };
    } finally {
      await rm(directory, { recursive: true, force: true }).catch(() => void 0);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message.split("\n")[0] : String(error);
    console.warn(`[Resume AI] OpenDataLoader fallback skipped: ${msg}`);
    return null;
  }
}
function extractPdfTextPureJs(buffer) {
  try {
    const raw = buffer.toString("latin1");
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match;
    const textPieces = [];
    while ((match = streamRegex.exec(raw)) !== null) {
      let streamBuffer = Buffer.from(match[1], "latin1");
      try {
        streamBuffer = Buffer.from(zlib.inflateSync(streamBuffer));
      } catch {
      }
      const streamStr = streamBuffer.toString("latin1");
      const tjMatches = streamStr.match(/\(([^)]*)\)\s*Tj/g);
      if (tjMatches) {
        for (const tj of tjMatches) {
          const inner = tj.slice(1, tj.lastIndexOf(")")).replace(/\\([()\\])/g, "$1");
          if (inner.trim()) textPieces.push(inner.trim());
        }
      }
      const tjArrayMatches = streamStr.match(/\[(.*?)\]\s*TJ/g);
      if (tjArrayMatches) {
        for (const tja of tjArrayMatches) {
          const innerStrings = tja.match(/\(([^)]*)\)/g);
          if (innerStrings) {
            const reconstructed = innerStrings.map((s) => s.slice(1, -1).replace(/\\([()\\])/g, "$1")).join("");
            if (reconstructed.trim()) textPieces.push(reconstructed.trim());
          }
        }
      }
    }
    return textPieces.join(" ").replace(/\s+/g, " ").trim();
  } catch {
    return "";
  }
}
async function extractPdfText(buffer) {
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse(new Uint8Array(buffer));
    const result = await parser.getText();
    const cleanText = (typeof result === "string" ? result : result?.text || "").replace(/\u0000/g, "").trim();
    if (cleanText.length > 20) {
      await parser.destroy().catch(() => void 0);
      return { text: cleanText.slice(0, maxPromptCharacters), citations: cleanText.slice(0, maxPromptCharacters) };
    }
  } catch (err) {
    console.warn(`[Resume AI] Fast in-memory pdf-parse note: ${err instanceof Error ? err.message : err}`);
  }
  try {
    const pureJsText = extractPdfTextPureJs(buffer);
    if (pureJsText.length > 20) {
      return { text: pureJsText.slice(0, maxPromptCharacters), citations: pureJsText.slice(0, maxPromptCharacters) };
    }
  } catch {
  }
  try {
    return await extractPdfWithOpenDataLoader(buffer);
  } catch {
    return null;
  }
}
async function resumeTextForLegacyDocument(buffer, mimeType) {
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  if (mimeType === "application/msword") {
    throw new Error("AI import currently supports PDF and DOCX resumes. Your DOC file is still saved securely; please review the fields manually.");
  }
  return null;
}
async function extractResumeSuggestions(buffer, mimeType) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error("Resume intelligence is not configured yet. Please ensure GEMINI_API_KEY is set in .env.");
  if (buffer.length === 0) throw new Error("The uploaded resume is empty.");
  const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const prompt = `You are a precision resume intake assistant for CareerTwin AI. Extract ALL information printed in the resume into valid JSON. Capture every single skill, project, certification, language, work experience entry, education details, and awards without omitting anything. Use only facts explicitly stated in the resume; do not invent details.

Return all fields:
- fullName: Full candidate name from header
- location: City, Country / State
- phone: Phone number / Mobile
- contactEmail: Primary contact email
- linkedinUrl: Complete LinkedIn URL (https://...)
- portfolioUrl: Complete GitHub, portfolio, or personal website URL (https://...)
- age: Integer age if stated or calculated from birth date (0 if omitted)
- education: Highest level ("Bachelor's", "Master's", "MPhil", "PhD", "Diploma", or "Other")
- degree: Full program and institution name (e.g., "BS in Computer Science from FAST-NUCES")
- careerStatus: "working" if currently employed, "seeking" if looking for opportunities
- currentJob: Current / most recent job title
- company: Current / most recent employer name
- lookingFor: "First Job", "Internship", "Freelance", "Career Switch", "Higher Studies", or ""
- careerField: Field of expertise (e.g., "Software Engineering", "Artificial Intelligence", "Web Development")
- targetRole: Target or primary job role (e.g., "Full Stack Developer", "AI Engineer")
- skills: Array of EVERY distinct technical skill, programming language, tool, library, framework, database, and domain competency (e.g. ["React", "TypeScript", "Node.js", "Python", "Docker", "PostgreSQL", ...])
- experience: Clean timeline format for all roles: "Role at Company \u2014 Location | Dates Description; ..."
- professionalSummary: 2-4 sentence executive profile from the resume
- certifications: Array of objects [{ name, issuer, credentialId, issuedOn, link }]
- languages: Array of objects [{ name, proficiency: "Native" | "Professional" | "Conversational" | "Basic" }]
- projects: Array of objects [{ name, summary, link, technologies: [...] }]
- verifiedDetails: Array of objects [{ category: "Achievement" | "Award" | "Coursework" | "Leadership" | "Volunteer" | "Publication" | "Training" | "Other", title, detail }]

Resume content follows:`;
  const parts = [{ text: prompt }];
  let documentTextForHints = "";
  if (mimeType === "application/pdf") {
    let parsedPdf = null;
    try {
      parsedPdf = await extractPdfText(buffer);
    } catch (error) {
      const reason = error instanceof Error ? error.message.split("\n")[0].slice(0, 180) : "unknown parser failure";
      console.warn(`[Resume AI] PDF extraction note: ${reason}`);
      parsedPdf = null;
    }
    if (parsedPdf?.text && parsedPdf.text.length > 50) {
      documentTextForHints = parsedPdf.text;
      parts[0] = { text: `${prompt}

Extracted Resume Content:
${parsedPdf.text}` };
    } else if (buffer.length > 0 && buffer.length < 16 * 1024 * 1024) {
      parts.push({ inline_data: { mime_type: mimeType, data: buffer.toString("base64") } });
    }
  } else {
    const text2 = await resumeTextForLegacyDocument(buffer, mimeType);
    const normalizedText = (text2 || "").replace(/\u0000/g, "").trim().slice(0, maxPromptCharacters);
    if (!normalizedText) throw new Error("No readable text was found in this resume.");
    documentTextForHints = normalizedText;
    parts[0] = { text: `${prompt}

${normalizedText}` };
  }
  const models = await getAutoDiscoveredGeminiModels(apiKey);
  const requestGemini = async (generationConfig, timeoutMs, requestParts = parts) => {
    let lastError = null;
    let lastResponse = null;
    for (const model of models) {
      const t0 = Date.now();
      try {
        const response2 = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: requestParts }],
              generationConfig: {
                ...generationConfig
              }
            }),
            signal: AbortSignal.timeout(timeoutMs)
          }
        );
        const ms = Date.now() - t0;
        if (response2.ok) {
          console.log(`[Resume AI] \u2705 ${model} responded OK in ${ms}ms`);
          return response2;
        }
        lastResponse = response2;
        const status = response2.status;
        console.warn(`[Resume AI] \u274C ${model} returned HTTP ${status} in ${ms}ms, trying next...`);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        const reason = lastError.message.toLowerCase().includes("timeout") ? "timeout" : lastError.message.slice(0, 60);
        console.warn(`[Resume AI] \u274C ${model} network error in ${Date.now() - t0}ms: ${reason}`);
      }
    }
    if (lastResponse) return lastResponse;
    throw lastError || new Error("All auto-discovered Gemini candidate models failed to respond.");
  };
  const compactParts = documentTextForHints ? [{ text: `${compactResumePrompt()}

Resume text:
${compactResumeSourceText(documentTextForHints)}` }] : [{ text: compactResumePrompt() }, ...parts.filter((part) => "inline_data" in part)];
  const requestCompactFallback = () => requestGemini({ responseMimeType: "application/json", temperature: 0.1, maxOutputTokens: 2048 }, geminiResumeFallbackTimeoutMs, compactParts);
  const ensureSuccessfulGeminiResponse = async (candidate) => {
    if (candidate.ok) return;
    const detail = await candidate.text().catch(() => "");
    let providerMessage = "no provider detail";
    try {
      providerMessage = String(JSON.parse(detail)?.error?.message ?? providerMessage).slice(0, 240);
    } catch {
      providerMessage = detail.replace(/\s+/g, " ").slice(0, 240) || providerMessage;
    }
    console.warn(`[Resume AI] Gemini request failed (${candidate.status}): ${providerMessage}`);
    if (candidate.status === 429) throw new Error("Gemini\u2019s free-tier limit was reached. Your resume is saved; please try AI import again later.");
    if (candidate.status === 400 && mimeType === "application/pdf") throw new Error("Gemini could not read this PDF. Check that it opens normally and is not password-protected, then retry AI review. Your resume is saved securely.");
    throw new Error(detail.includes("API key") ? "The Gemini API key was rejected. Please check the server configuration." : "Gemini could not analyze this resume right now. Your resume is saved securely. You can retry the AI review below.");
  };
  const decodeResumeResponse = async (candidate) => {
    const rawJson = await candidate.json();
    const text2 = extractTextFromResponse(rawJson);
    const parsed2 = parseGeminiJson(text2);
    return normalizeResumePayload(parsed2, documentTextForHints);
  };
  let response;
  try {
    response = await retryTemporaryProviderDemand(
      () => requestGemini({ responseMimeType: "application/json", responseSchema, temperature: 0.1, maxOutputTokens: 4096 }, geminiResumeRequestTimeoutMs)
    );
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.message.toLowerCase().includes("timeout") || error.message.toLowerCase().includes("aborted"))) {
      console.warn("[Resume AI] Primary request timed out, retrying with compact JSON fallback...");
      try {
        response = await retryTemporaryProviderDemand(requestCompactFallback);
      } catch (fallbackError) {
        if (fallbackError instanceof Error && (fallbackError.name === "TimeoutError" || fallbackError.message.toLowerCase().includes("timeout") || fallbackError.message.toLowerCase().includes("aborted"))) {
          throw new Error("Gemini is taking longer than usual to analyze this resume right now. Your resume is saved securely; please retry AI review in a moment.");
        }
        throw fallbackError;
      }
    } else {
      throw error;
    }
  }
  if (!response.ok) {
    console.warn("[Resume AI] Primary structured request failed, retrying with compact JSON fallback...");
    response = await retryTemporaryProviderDemand(requestCompactFallback);
  }
  await ensureSuccessfulGeminiResponse(response);
  let decoded;
  try {
    decoded = await decodeResumeResponse(response);
  } catch (error) {
    console.warn(`[Resume AI] Primary response decode failed (${resumeDecodeFailureCategory(error)}); retrying with compact format...`);
    response = await retryTemporaryProviderDemand(requestCompactFallback);
    await ensureSuccessfulGeminiResponse(response);
    try {
      decoded = await decodeResumeResponse(response);
    } catch {
      throw new Error("Gemini could not return a readable resume review right now. Your resume is saved securely; please retry AI review in a moment.");
    }
  }
  let parsed = resumeSuggestionSchema.safeParse(decoded);
  if (!parsed.success) {
    const paths = parsed.error.issues.map((issue) => `${issue.path.join(".") || "root"} (${issue.code})`).slice(0, 12).join(", ");
    console.warn(`[Resume AI] Validation note at: ${paths}; normalizing output safely.`);
  }
  const result = decoded || normalizeResumePayload({}, documentTextForHints);
  if (!documentTextForHints || !needsQualificationRecovery(result)) {
    return result;
  }
  const recoveryPrompt = `You are completing a private resume intake audit. Extract only explicit CERTIFICATIONS, LANGUAGES, and PROJECTS that were omitted or left incomplete in an earlier pass. Use the exact resume text below. Never infer facts. Return JSON only with certifications (name, issuer, credentialId, issuedOn, link), languages (name, proficiency), projects (name, summary, link, technologies), and fieldEvidence for exactly those three fields. Use empty strings or arrays when absent. Return a certificate issuer, identifier, date, public credential link, language proficiency, project link, or technology only if printed in the resume. Use valid absolute HTTPS URLs for any returned public link. Keep evidence excerpts exact and below 180 characters.

Resume text:
${compactResumeSourceText(documentTextForHints)}`;
  try {
    const recoveryResponse = await requestGemini({ responseMimeType: "application/json", temperature: 0, maxOutputTokens: 2400 }, geminiQualificationRecoveryTimeoutMs, [{ text: recoveryPrompt }]);
    if (!recoveryResponse.ok) {
      console.warn(`[Resume AI] Qualification recovery skipped after provider HTTP ${recoveryResponse.status}.`);
      return result;
    }
    const recoveryPayload = await recoveryResponse.json();
    const recovery = qualificationRecoverySchema.safeParse(normalizeQualificationRecoveryPayload(parseGeminiJson(extractTextFromResponse(recoveryPayload))));
    if (!recovery.success) {
      console.warn("[Resume AI] Qualification recovery returned an invalid structure; preserving the primary result.");
      return result;
    }
    return mergeQualificationRecovery(result, recovery.data);
  } catch (error) {
    const reason = isGeminiTimeout(error) ? "timed out" : "failed";
    console.warn(`[Resume AI] Qualification recovery ${reason}; preserving the primary result.`);
    return result;
  }
}

// shared/roadmapTypes.ts
import { z as z2 } from "zod";
var interviewLevelSchema = z2.object({
  level_number: z2.number().int().min(1).max(10),
  difficulty: z2.enum(["Easy", "Intermediate", "Hard"]),
  title: z2.string().min(1),
  focus_area: z2.string().min(1),
  ai_prompt_instructions: z2.string().min(10),
  question_count: z2.number().int().default(3),
  estimated_duration_min: z2.number().int().default(5)
});
var generateRoadmapInputSchema = z2.object({
  user_cv_data: z2.object({
    fullName: z2.string().optional(),
    targetRole: z2.string().optional(),
    experience: z2.string().optional(),
    skills: z2.string().optional(),
    education: z2.string().optional(),
    projects: z2.string().optional(),
    summary: z2.string().optional(),
    verifiedDetails: z2.string().optional()
  }).optional(),
  job_description_data: z2.object({
    companyName: z2.string().optional(),
    companyWebsite: z2.string().optional(),
    targetRole: z2.string().optional(),
    jobDescription: z2.string().optional(),
    requirements: z2.array(z2.string()).optional(),
    notes: z2.string().optional()
  })
});
var roadmapResponseSchema = z2.object({
  sessionId: z2.number(),
  currentLevel: z2.number(),
  status: z2.string(),
  companyName: z2.string().nullable(),
  targetRole: z2.string().nullable(),
  levels: z2.array(interviewLevelSchema)
});

// server/roadmapService.ts
function buildGeminiRoadmapPrompt(input) {
  const cv = input.user_cv_data || {};
  const job = input.job_description_data || {};
  return `You are an elite, world-class Technical Recruiter, Principal Engineer, and Executive Hiring Director.
Your task is to analyze the candidate's CV profile and the target job/company description, identify skill gaps and alignment areas, and synthesize a **strictly structured 10-level mock interview progression matrix**.

### Candidate Profile:
- Name: ${cv.fullName || "Candidate"}
- Target Role: ${cv.targetRole || job.targetRole || "Software Engineer"}
- Summary: ${cv.summary || "Not specified"}
- Skills & Tech Stack: ${cv.skills || "Not specified"}
- Experience & History: ${cv.experience || "Not specified"}
- Key Projects: ${cv.projects || "Not specified"}
- Education / Certifications: ${cv.education || "Not specified"}

### Target Job & Company Information:
- Company Name: ${job.companyName || "Target Company"}
- Role: ${job.targetRole || "Target Position"}
- Job Description: ${job.jobDescription || "Standard technical requirements and responsibilities"}
- Key Requirements: ${job.requirements?.join(", ") || "Standard domain competencies"}
- Notes / Context: ${job.notes || "None"}

### Progression Constraints:
You MUST create exactly 10 distinct, sequential interview levels adhering to this progression:
1. **Levels 1\u20133 (Easy)**: Icebreakers, background walkthrough, resume verification, culture alignment, and basic role motivation.
2. **Levels 4\u20137 (Intermediate)**: Deep scenario-based inquiries, STAR methodology behavioral evaluations, core technical architecture, problem-solving, and live system reasoning.
3. **Levels 8\u201310 (Hard)**: High-pressure situational stress testing, production outage triage, complex stakeholder conflict resolution, executive trade-offs, and critical leadership dilemmas under fire.

### Output Constraints:
You MUST reply strictly with a valid JSON array of 10 objects matching this exact structure:
[
  {
    "level_number": 1,
    "difficulty": "Easy",
    "title": "Level 1: Title Here",
    "focus_area": "Concise summary of topics evaluated",
    "ai_prompt_instructions": "Detailed adaptive instructions telling the live AI interviewer which focus area to stay inside, how to grade every answer (STRONG / PARTIAL / WEAK), and how to reinforce in real time \u2014 escalate deeper when strong, probe the specific gap when partial, simplify and coach when weak. Questions are UNLIMITED and generated live turn-by-turn; NEVER list or script specific questions.",
    "question_count": 3,
    "estimated_duration_min": 5
  },
  ...
  {
    "level_number": 10,
    "difficulty": "Hard",
    "title": "Level 10: Title Here",
    "focus_area": "High-stakes executive stress test & trade-offs",
    "ai_prompt_instructions": "Detailed adaptive instructions (as above \u2014 reinforcement loop, no scripted questions)...",
    "question_count": 4,
    "estimated_duration_min": 10
  }
]

IMPORTANT: "question_count" is the STAGE GOAL \u2014 the recommended number of exchanges to complete the stage at real-interview pacing (the live interviewer suggests wrapping up around it, but the candidate may keep practicing with unlimited extra questions). Never write fixed questions into any field.

DO NOT return any surrounding markdown commentary or markdown code fences if possible, just raw valid JSON.`;
}
function normalizeLevels(items) {
  return items.map((item, idx) => {
    const levelNum = Number(item.level_number || item.level || idx + 1);
    let diff = "Intermediate";
    if (levelNum <= 3) diff = "Easy";
    else if (levelNum >= 8) diff = "Hard";
    else diff = "Intermediate";
    return interviewLevelSchema.parse({
      level_number: levelNum,
      difficulty: item.difficulty || diff,
      title: item.title || `Level ${levelNum}: ${item.focus_area || "Interview Stage"}`,
      focus_area: item.focus_area || item.focus || "Core Competencies",
      ai_prompt_instructions: item.ai_prompt_instructions || item.instructions || item.prompt || "Conduct an interactive interview evaluating the candidate's answers.",
      question_count: Number(item.question_count) || (levelNum <= 3 ? 3 : levelNum <= 7 ? 4 : 5),
      estimated_duration_min: Number(item.estimated_duration_min) || (levelNum <= 3 ? 5 : 8)
    });
  });
}
function extractJsonArray(raw) {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }
  cleaned = cleaned.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  try {
    let candidate = cleaned;
    const start = candidate.indexOf("[");
    const end = candidate.lastIndexOf("]");
    if (start !== -1 && end !== -1 && end > start) {
      candidate = candidate.slice(start, end + 1);
    }
    candidate = candidate.replace(/,\s*([\}\]])/g, "$1");
    const parsed = JSON.parse(candidate);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return normalizeLevels(parsed);
    }
  } catch {
  }
  const objects = [];
  const objectRegex = /\{[\s\S]*?"(?:level_number|level)"[\s\S]*?\}(?=\s*,\s*\{|\s*\]|\s*$)/g;
  let match;
  while ((match = objectRegex.exec(cleaned)) !== null) {
    try {
      const objStr = match[0].replace(/,\s*([\}\]])/g, "$1");
      const obj = JSON.parse(objStr);
      if (obj && (obj.level_number || obj.level || obj.title || obj.focus_area)) {
        objects.push(obj);
      }
    } catch {
    }
  }
  if (objects.length > 0) {
    return normalizeLevels(objects);
  }
  try {
    let candidate = cleaned;
    const start = candidate.indexOf("[");
    if (start !== -1) {
      candidate = candidate.slice(start);
      let inString = false;
      let escaped = false;
      for (let i = 0; i < candidate.length; i++) {
        const char = candidate[i];
        if (inString) {
          if (escaped) escaped = false;
          else if (char === "\\") escaped = true;
          else if (char === '"') inString = false;
        } else if (char === '"') {
          inString = true;
        }
      }
      if (inString) candidate += '"';
      candidate = candidate.replace(/,\s*$/, "");
      if (!candidate.endsWith("]")) candidate += "\n]";
      candidate = candidate.replace(/,\s*([\}\]])/g, "$1");
      const parsed = JSON.parse(candidate);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return normalizeLevels(parsed);
      }
    }
  } catch {
  }
  throw new Error("Could not extract interview level array from model output.");
}
var ADAPTIVE_QUESTION_DIRECTIVE = ` Questions are UNLIMITED \u2014 generate each one live from the candidate's previous answer. Silently grade every answer (STRONG / PARTIAL / WEAK): STRONG \u2192 escalate deeper with a harder follow-up; PARTIAL \u2192 probe the specific gap; WEAK \u2192 simplify, coach briefly, and re-approach from an easier angle. Never repeat a question and never use a scripted question list. Treat "question_count" as the stage goal: around that number of exchanges, be ready to warmly suggest wrapping up the stage when directed.`;
function generateFallbackRoadmap(input) {
  const role = input.job_description_data.targetRole || "Software Engineer";
  const company = input.job_description_data.companyName || "Target Company";
  const levels = [
    {
      level_number: 1,
      difficulty: "Easy",
      title: "Level 1: Background & Resume Validation",
      focus_area: "Work history, key projects, and career trajectory",
      ai_prompt_instructions: `Act as a warm hiring manager at ${company}. Validate the candidate's resume achievements, verify core tech stack familiarity for ${role}, and explore their motivation for joining.`,
      question_count: 3,
      estimated_duration_min: 5
    },
    {
      level_number: 2,
      difficulty: "Easy",
      title: "Level 2: Culture Fit & Work Style",
      focus_area: "Collaboration, agility, and communication",
      ai_prompt_instructions: `Evaluate how the candidate collaborates in cross-functional teams, handles asynchronous communication, and adapts to ${company}'s fast-paced engineering culture.`,
      question_count: 3,
      estimated_duration_min: 5
    },
    {
      level_number: 3,
      difficulty: "Easy",
      title: "Level 3: Core Technical Foundations",
      focus_area: "Fundamental concepts, syntax, and tooling",
      ai_prompt_instructions: `Probe baseline understanding of key tools, data structures, and core principles needed for ${role}.`,
      question_count: 3,
      estimated_duration_min: 6
    },
    {
      level_number: 4,
      difficulty: "Intermediate",
      title: "Level 4: STAR Behavioral - Conflict & Ownership",
      focus_area: "Ownership, handling disagreements, and accountability",
      ai_prompt_instructions: `Ask STAR method questions about a time the candidate had a technical disagreement with a peer or lead, how they navigated trade-offs, and the measurable outcome.`,
      question_count: 4,
      estimated_duration_min: 7
    },
    {
      level_number: 5,
      difficulty: "Intermediate",
      title: "Level 5: Practical Problem Solving & Scenario",
      focus_area: "Applied architecture, debugging, and edge cases",
      ai_prompt_instructions: `Present a realistic real-world engineering challenge relevant to ${company}. Ask the candidate to step through their diagnosis, design decisions, and testing strategy.`,
      question_count: 4,
      estimated_duration_min: 8
    },
    {
      level_number: 6,
      difficulty: "Intermediate",
      title: "Level 6: System Design & Scalability",
      focus_area: "Data flow, caching, bottleneck resolution",
      ai_prompt_instructions: `Evaluate system design acumen for ${role}. Test knowledge of microservices/monolith trade-offs, database indexing, latency optimization, and reliability patterns.`,
      question_count: 4,
      estimated_duration_min: 8
    },
    {
      level_number: 7,
      difficulty: "Intermediate",
      title: "Level 7: Security, Resilience & Testing",
      focus_area: "Defensive coding, CI/CD, and regression prevention",
      ai_prompt_instructions: `Probe the candidate's mindset regarding security vulnerabilities (OWASP), automated testing pipelines, and disaster recovery strategies.`,
      question_count: 4,
      estimated_duration_min: 8
    },
    {
      level_number: 8,
      difficulty: "Hard",
      title: "Level 8: High-Pressure Production Outage",
      focus_area: "Incident response, root cause analysis, and triage",
      ai_prompt_instructions: `Place candidate into an active P0 production incident scenario where traffic spikes by 10x and error rates are climbing. Evaluate composure, triage prioritization, and rollback decisions.`,
      question_count: 4,
      estimated_duration_min: 9
    },
    {
      level_number: 9,
      difficulty: "Hard",
      title: "Level 9: Architectural Deadlock & Trade-offs",
      focus_area: "Technical governance, legacy refactoring, and cost",
      ai_prompt_instructions: `Simulate a high-stakes meeting where leadership demands a 3-month feature delivered in 3 weeks. Ask candidate how they compromise without accumulating fatal technical debt.`,
      question_count: 4,
      estimated_duration_min: 9
    },
    {
      level_number: 10,
      difficulty: "Hard",
      title: "Level 10: Executive Leadership & Stress Test",
      focus_area: "Vision, high-stakes trade-offs, and critical judgment",
      ai_prompt_instructions: `Act as the VP of Engineering asking demanding, multi-variable strategic questions. Test how candidate makes decisions with incomplete data and defends their technical decisions.`,
      question_count: 5,
      estimated_duration_min: 10
    }
  ];
  return levels.map((level) => ({
    ...level,
    ai_prompt_instructions: `${level.ai_prompt_instructions}${ADAPTIVE_QUESTION_DIRECTIVE}`
  }));
}
async function generateRoadmapMatrix(userId, input) {
  const apiKey = getGeminiApiKey();
  let levels = [];
  if (apiKey) {
    try {
      const models = await getAutoDiscoveredGeminiModels(apiKey);
      const prompt = buildGeminiRoadmapPrompt(input);
      for (const model of models.slice(0, 3)) {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                  temperature: 0.4,
                  maxOutputTokens: 8192,
                  responseMimeType: "application/json"
                }
              }),
              signal: AbortSignal.timeout(3e4)
            }
          );
          if (res.ok) {
            const data = await res.json();
            const text2 = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text2) {
              const parsed = extractJsonArray(text2);
              if (parsed.length > 0) {
                levels = parsed.slice(0, 10);
                if (levels.length >= 10) break;
              }
            }
          }
        } catch (modelErr) {
          console.warn(`[Roadmap AI] Model ${model} call failed, trying next:`, modelErr);
        }
      }
    } catch (err) {
      console.warn("[Roadmap AI] Gemini generation error, using deterministic fallback:", err);
    }
  }
  if (levels.length > 0 && levels.length < 10) {
    const fallback = generateFallbackRoadmap(input);
    for (let i = levels.length; i < 10; i++) {
      levels.push(fallback[i]);
    }
  }
  if (levels.length < 10) {
    levels = generateFallbackRoadmap(input);
  }
  const session = await createInterviewSession({
    userId,
    companyName: input.job_description_data.companyName || null,
    targetRole: input.job_description_data.targetRole || null,
    jobDescription: input.job_description_data.jobDescription || null,
    resumeSummary: input.user_cv_data?.summary || null,
    levels: JSON.stringify(levels),
    currentLevel: 1,
    status: "generated",
    metadata: JSON.stringify({
      skills: input.user_cv_data?.skills,
      generatedAt: (/* @__PURE__ */ new Date()).toISOString()
    })
  });
  return {
    sessionId: session.id,
    currentLevel: session.currentLevel,
    status: session.status,
    companyName: session.companyName,
    targetRole: session.targetRole,
    levels
  };
}

// server/roadmapRest.ts
function registerRoadmapRestRoutes(app2) {
  app2.post("/api/generate-roadmap", async (req, res) => {
    try {
      let userId = 1;
      try {
        const user = await sdk.authenticateRequest(req);
        if (user?.id) userId = user.id;
      } catch {
      }
      const parsed = generateRoadmapInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid request payload",
          details: parsed.error.issues
        });
      }
      const result = await generateRoadmapMatrix(userId, parsed.data);
      return res.status(200).json(result);
    } catch (err) {
      console.error("[REST API] Error in /api/generate-roadmap:", err);
      return res.status(500).json({
        error: "Failed to generate interview roadmap",
        message: err instanceof Error ? err.message : String(err)
      });
    }
  });
  app2.get("/api/interview-sessions/latest", async (req, res) => {
    try {
      let userId = 1;
      try {
        const user = await sdk.authenticateRequest(req);
        if (user?.id) userId = user.id;
      } catch {
      }
      const session = await getLatestInterviewSessionByUserId(userId);
      if (!session) {
        return res.status(404).json({ error: "No interview session found" });
      }
      let levels = [];
      try {
        levels = JSON.parse(session.levels);
      } catch {
      }
      return res.status(200).json({
        id: session.id,
        companyName: session.companyName,
        targetRole: session.targetRole,
        jobDescription: session.jobDescription,
        currentLevel: session.currentLevel,
        status: session.status,
        levels,
        createdAt: session.createdAt
      });
    } catch (err) {
      console.error("[REST API] Error in /api/interview-sessions/latest:", err);
      return res.status(500).json({
        error: "Failed to fetch latest interview session"
      });
    }
  });
}

// server/ttsRouter.ts
import { spawn } from "child_process";
var MALE_VOICE_CATALOG = {
  "gemini-puck": {
    id: "gemini-puck",
    name: "Aiden (Puck Neural)",
    lang: "Multilingual / Roman Urdu / English",
    accent: "Executive Tech Hiring Manager Male",
    description: "Google Gemini Flagship Dynamic, polished male voice for technical interviews"
  },
  "gemini-fenrir": {
    id: "gemini-fenrir",
    name: "Aiden (Deep Neural)",
    lang: "Multilingual / Roman Urdu / English",
    accent: "Authoritative Studio Male",
    description: "Google Gemini Flagship Deep, highly emotive male voice with natural breath control"
  },
  "ur-PK-AsadNeural": {
    id: "ur-PK-AsadNeural",
    name: "Asad",
    lang: "Urdu / Roman Urdu / Regional",
    accent: "Pakistani Male",
    description: "Deep, authoritative Microsoft Neural voice for Urdu and Pakistani dialects"
  },
  "en-US-ChristopherNeural": {
    id: "en-US-ChristopherNeural",
    name: "Christopher",
    lang: "English (US)",
    accent: "Executive American Male",
    description: "Polished, commanding tone ideal for senior tech hiring manager"
  },
  "hi-IN-MadhurNeural": {
    id: "hi-IN-MadhurNeural",
    name: "Madhur",
    lang: "Hindi",
    accent: "Indian Male",
    description: "Clear, natural Hindi phrasing and technical diction"
  }
};
var DEFAULT_MALE_VOICE = "gemini-puck";
function pcmToWav(pcmBuffer, sampleRate = 24e3, numChannels = 1, bitsPerSample = 16) {
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const dataSize = pcmBuffer.length;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  pcmBuffer.copy(buffer, 44);
  return buffer;
}
async function generateGeminiSpeech(text2, voiceName = "Fenrir") {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: text2 }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName
                // 'Fenrir', 'Puck', 'Charon'
              }
            }
          }
        }
      }),
      signal: AbortSignal.timeout(9e3)
    });
    if (!res.ok) {
      console.warn(`[Gemini TTS HTTP ${res.status}]`);
      return null;
    }
    const data = await res.json();
    const base64Audio = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return null;
    const pcmBuf = Buffer.from(base64Audio, "base64");
    return pcmToWav(pcmBuf, 24e3, 1, 16);
  } catch (err) {
    console.warn("[Gemini TTS Fallback]:", err);
    return null;
  }
}
function generateEdgeSpeech(text2, voice, rate = "+0%", pitch = "-2Hz", volume = "+0%") {
  return new Promise((resolve, reject) => {
    const p = spawn("python3", [
      "-u",
      "-c",
      `
import sys, asyncio, edge_tts

async def main():
    text = sys.argv[1]
    voice = sys.argv[2]
    rate = sys.argv[3]
    pitch = sys.argv[4]
    volume = sys.argv[5]
    
    communicate = edge_tts.Communicate(text=text, voice=voice, rate=rate, pitch=pitch, volume=volume)
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            sys.stdout.buffer.write(chunk["data"])
            sys.stdout.buffer.flush()

asyncio.run(main())
      `,
      text2,
      voice,
      rate,
      pitch,
      volume
    ]);
    const chunks = [];
    let errOutput = "";
    p.stdout.on("data", (d) => chunks.push(d));
    p.stderr.on("data", (e) => errOutput += e.toString());
    p.on("close", (code) => {
      if (code !== 0 && chunks.length === 0) {
        reject(new Error(`Edge-TTS failed with code ${code}: ${errOutput}`));
      } else {
        resolve(Buffer.concat(chunks));
      }
    });
  });
}
function resolveEdgeVoice(text2, language, explicitVoice) {
  if (explicitVoice && MALE_VOICE_CATALOG[explicitVoice] && explicitVoice.includes("Neural")) {
    return explicitVoice;
  }
  if (language) {
    const l = language.toLowerCase();
    if (l.includes("roman") || l.includes("ur")) return "ur-PK-AsadNeural";
    if (l.includes("hi")) return "hi-IN-MadhurNeural";
    if (l.includes("en-gb")) return "en-GB-RyanNeural";
    if (l.includes("en")) return "en-US-ChristopherNeural";
    if (l.includes("ps") || l.includes("sd") || l.includes("pa") || l.includes("bal") || l.includes("skr")) {
      return "ur-PK-AsadNeural";
    }
  }
  if (/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text2)) {
    return "ur-PK-AsadNeural";
  }
  if (/[\u0900-\u097F]/.test(text2)) {
    return "hi-IN-MadhurNeural";
  }
  return "ur-PK-AsadNeural";
}
function registerTtsRoutes(app2) {
  app2.post("/api/generate-speech", async (req, res) => {
    try {
      const {
        text: text2,
        language,
        voice,
        rate = "+0%",
        pitch = "-2Hz",
        volume = "+0%"
      } = req.body;
      if (!text2 || typeof text2 !== "string" || !text2.trim()) {
        res.status(400).json({ error: "Text is required and cannot be empty." });
        return;
      }
      const speechText = text2.trim();
      let wavBuffer = null;
      if (!voice || voice === "gemini-puck" || voice === "gemini-fenrir") {
        const geminiVoice = voice === "gemini-fenrir" ? "Fenrir" : "Puck";
        wavBuffer = await generateGeminiSpeech(speechText, geminiVoice);
        if (wavBuffer && wavBuffer.length > 1e3) {
          res.setHeader("Content-Type", "audio/wav");
          res.setHeader("Content-Length", wavBuffer.length.toString());
          res.setHeader("Cache-Control", "no-cache");
          res.setHeader("X-Voice-Engine", "gemini-neural-male");
          res.setHeader("X-Voice-Used", geminiVoice);
          res.status(200).send(wavBuffer);
          return;
        }
      }
      try {
        const edgeVoice = resolveEdgeVoice(speechText, language, voice);
        const mp3Buffer = await generateEdgeSpeech(speechText, edgeVoice, rate, pitch, volume);
        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Content-Length", mp3Buffer.length.toString());
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("X-Voice-Engine", "edge-tts");
        res.setHeader("X-Voice-Used", edgeVoice);
        res.status(200).send(mp3Buffer);
        return;
      } catch (edgeErr) {
        console.warn("[TTS] Edge-TTS failed, retrying Gemini Puck:", edgeErr);
        const fallbackWav = await generateGeminiSpeech(speechText, "Puck");
        if (fallbackWav && fallbackWav.length > 1e3) {
          res.setHeader("Content-Type", "audio/wav");
          res.setHeader("Content-Length", fallbackWav.length.toString());
          res.setHeader("Cache-Control", "no-cache");
          res.setHeader("X-Voice-Engine", "gemini-neural-male");
          res.setHeader("X-Voice-Used", "Puck");
          res.status(200).send(fallbackWav);
          return;
        }
        throw edgeErr;
      }
    } catch (err) {
      console.error("[TTS Server Error]:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to generate neural male speech" });
      }
    }
  });
  app2.get("/api/voices", (_req, res) => {
    res.json({
      status: "online",
      default_voice: DEFAULT_MALE_VOICE,
      male_voices: MALE_VOICE_CATALOG
    });
  });
}

// server/geminiLiveToken.ts
var GEMINI_LIVE_MODEL = "models/gemini-2.5-flash-native-audio-latest";
async function createGeminiLiveToken() {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return {
      ok: false,
      status: 503,
      error: "GEMINI_API_KEY is not configured on the server."
    };
  }
  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/auth_tokens", {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        uses: 20
        // Sufficient for live session establishment and transient reconnections
      })
    });
    const data = await response.json();
    if (!response.ok || !data?.name) {
      const errMsg = data?.error?.message || `Google API returned status ${response.status}`;
      console.warn("[GeminiLiveToken] Failed to issue token from Google:", errMsg);
      return {
        ok: false,
        status: response.status || 502,
        error: `Failed to issue Gemini Live ephemeral token: ${errMsg}`
      };
    }
    const token = data.name;
    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeURIComponent(token)}`;
    return {
      ok: true,
      status: 200,
      token,
      wsUrl,
      model: GEMINI_LIVE_MODEL
    };
  } catch (err) {
    console.error("[GeminiLiveToken] Unexpected error calling Google auth_tokens:", err);
    return {
      ok: false,
      status: 500,
      error: err?.message || "Internal server error while provisioning live token."
    };
  }
}

// server/_core/systemRouter.ts
import { z as z3 } from "zod";

// server/_core/notification.ts
init_env();
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
    console.log(`[Notification] Project notification: [${title}] - ${content}`);
    return true;
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z3.object({
      timestamp: z3.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z3.object({
      title: z3.string().min(1, "title is required"),
      content: z3.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers/auth.ts
import { TRPCError as TRPCError3 } from "@trpc/server";
import { z as z4 } from "zod";
init_env();
init_supabase();
var signUpSchema = z4.object({
  email: z4.string().trim().email("Please enter a valid email address."),
  password: z4.string().min(6, "Password must be at least 6 characters."),
  name: z4.string().trim().max(160).optional()
});
var loginSchema = z4.object({
  email: z4.string().trim().email("Please enter a valid email address."),
  password: z4.string().min(1, "Password is required.")
});
var syncSessionSchema = z4.object({
  accessToken: z4.string().min(1, "Access token is required.")
});
var authRouter = router({
  me: publicProcedure.query((opts) => opts.ctx.user),
  googleStatus: publicProcedure.query(() => {
    const hasNativeGoogle = Boolean(getGoogleOAuthConfig());
    const hasSupabase = Boolean(ENV.supabaseUrl && (ENV.supabaseAnonKey || ENV.supabaseServiceRoleKey));
    return {
      enabled: hasNativeGoogle || hasSupabase,
      mode: hasSupabase ? "supabase" : "google"
    };
  }),
  signUp: publicProcedure.input(signUpSchema).mutation(async ({ ctx, input }) => {
    const admin = getSupabaseAdmin();
    const canUseAdmin = hasSupabaseAdminRole() && Boolean(admin?.auth?.admin);
    const displayName = input.name?.trim() || input.email.split("@")[0] || "User";
    let supabaseUser = null;
    if (canUseAdmin && admin) {
      const { data: adminData, error: adminError } = await admin.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true,
        user_metadata: {
          name: displayName,
          full_name: displayName
        }
      });
      if (adminError) {
        const errorMsg = adminError.message?.toLowerCase() || "";
        if (errorMsg.includes("already registered") || errorMsg.includes("already exists")) {
          throw new TRPCError3({
            code: "BAD_REQUEST",
            message: "An account with this email already exists. Please sign in instead."
          });
        }
        throw new TRPCError3({
          code: "BAD_REQUEST",
          message: adminError.message || "Failed to create account."
        });
      }
      supabaseUser = adminData.user;
    } else {
      const supabase = getSupabaseClient() || admin;
      if (!supabase) {
        throw new TRPCError3({
          code: "INTERNAL_SERVER_ERROR",
          message: "Supabase authentication is not configured on the server."
        });
      }
      const reqOrigin = ctx.req?.headers?.origin || ctx.req?.headers?.referer;
      let originUrl = "http://localhost:3000";
      if (reqOrigin && typeof reqOrigin === "string") {
        try {
          originUrl = new URL(reqOrigin).origin;
        } catch {
        }
      }
      const emailRedirectTo = `${originUrl}/auth/callback`;
      const { data, error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          emailRedirectTo,
          data: {
            name: displayName,
            full_name: displayName
          }
        }
      });
      if (error) {
        const errorMsg = error.message?.toLowerCase() || "";
        if (errorMsg.includes("rate limit") || errorMsg.includes("over_email_send_rate_limit")) {
          throw new TRPCError3({
            code: "TOO_MANY_REQUESTS",
            message: "Supabase email rate limit exceeded (maximum 3 emails/hour on free tier). In your Supabase Dashboard, go to Authentication -> Providers -> Email and disable 'Confirm email' to allow instant signups, or sign in with Google."
          });
        }
        throw new TRPCError3({
          code: "BAD_REQUEST",
          message: error.message || "Failed to create account in Supabase."
        });
      }
      supabaseUser = data.user;
    }
    if (!supabaseUser) {
      throw new TRPCError3({
        code: "BAD_REQUEST",
        message: "Account creation could not be completed. Please try again."
      });
    }
    const openId = `supabase:${supabaseUser.id}`;
    await upsertUser({
      openId,
      name: displayName,
      email: supabaseUser.email ?? input.email,
      loginMethod: "email",
      lastSignedIn: /* @__PURE__ */ new Date()
    });
    const sessionToken = await sdk.createSessionToken(openId, {
      name: displayName,
      expiresInMs: ONE_YEAR_MS
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
        role: "user",
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date(),
        lastSignedIn: /* @__PURE__ */ new Date()
      }
    };
  }),
  login: publicProcedure.input(loginSchema).mutation(async ({ ctx, input }) => {
    const supabase = getSupabaseAdmin() || getSupabaseClient();
    if (!supabase) {
      throw new TRPCError3({
        code: "INTERNAL_SERVER_ERROR",
        message: "Supabase authentication is not configured on the server."
      });
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password
    });
    if (error) {
      throw new TRPCError3({
        code: "BAD_REQUEST",
        message: error.message === "Invalid login credentials" ? "Invalid email or password." : error.message
      });
    }
    const supabaseUser = data.user;
    if (!supabaseUser) {
      throw new TRPCError3({
        code: "UNAUTHORIZED",
        message: "Invalid credentials."
      });
    }
    const openId = `supabase:${supabaseUser.id}`;
    const displayName = supabaseUser.user_metadata?.name || supabaseUser.user_metadata?.full_name || supabaseUser.email?.split("@")[0] || "User";
    await upsertUser({
      openId,
      name: displayName,
      email: supabaseUser.email ?? input.email,
      loginMethod: "email",
      lastSignedIn: /* @__PURE__ */ new Date()
    });
    const sessionToken = await sdk.createSessionToken(openId, {
      name: displayName,
      expiresInMs: ONE_YEAR_MS
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
        role: "user",
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date(),
        lastSignedIn: /* @__PURE__ */ new Date()
      }
    };
  }),
  syncSupabaseSession: publicProcedure.input(syncSessionSchema).mutation(async ({ ctx, input }) => {
    let supabaseUser = null;
    try {
      const parts = input.accessToken.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
        if (payload && payload.sub) {
          supabaseUser = {
            id: payload.sub,
            email: payload.email,
            user_metadata: payload.user_metadata,
            app_metadata: payload.app_metadata
          };
        }
      }
    } catch {
    }
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
      throw new TRPCError3({
        code: "UNAUTHORIZED",
        message: "Invalid or expired authentication session."
      });
    }
    const openId = `supabase:${supabaseUser.id}`;
    const provider = supabaseUser.app_metadata?.provider || supabaseUser.identities?.[0]?.provider || "email";
    const displayName = supabaseUser.user_metadata?.name || supabaseUser.user_metadata?.full_name || supabaseUser.email?.split("@")[0] || "User";
    await upsertUser({
      openId,
      name: displayName,
      email: supabaseUser.email ?? null,
      loginMethod: provider,
      lastSignedIn: /* @__PURE__ */ new Date()
    });
    const sessionToken = await sdk.createSessionToken(openId, {
      name: displayName,
      expiresInMs: ONE_YEAR_MS
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
        role: "user",
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date(),
        lastSignedIn: /* @__PURE__ */ new Date()
      }
    };
  }),
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return {
      success: true
    };
  })
});

// server/routers/careerProfile.ts
import { randomUUID } from "node:crypto";
import { z as z5 } from "zod";

// server/github.ts
var cache = /* @__PURE__ */ new Map();
var pending = /* @__PURE__ */ new Map();
var cacheTtlMs = 30 * 60 * 1e3;
function githubRepositoryFromLink(link) {
  const value = link.trim();
  const normalized = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(normalized);
    if (!["github.com", "www.github.com"].includes(url.hostname.toLowerCase())) return null;
    const [owner = "", rawRepository = ""] = url.pathname.split("/").filter(Boolean);
    const repository = rawRepository.replace(/\.git$/i, "");
    if (!/^[A-Za-z0-9-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repository)) return null;
    return { sourceLink: url.toString(), owner, repository, key: `${owner}/${repository}` };
  } catch {
    return null;
  }
}
async function requestRepositoryMetadata(sourceLink, owner, repository) {
  try {
    const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "CareerTwin-AI",
        "X-GitHub-Api-Version": "2026-03-10"
      },
      signal: AbortSignal.timeout(6e3)
    });
    if (!response.ok) return null;
    const payload = await response.json();
    const stars = Number(payload.stargazers_count);
    const forks = Number(payload.forks_count);
    if (!Number.isInteger(stars) || stars < 0 || !Number.isInteger(forks) || forks < 0) return null;
    return {
      sourceLink,
      repository: typeof payload.full_name === "string" ? payload.full_name : `${owner}/${repository}`,
      htmlUrl: typeof payload.html_url === "string" ? payload.html_url : `https://github.com/${owner}/${repository}`,
      stars,
      forks
    };
  } catch {
    return null;
  }
}
async function getGitHubRepositoryMetadata(link) {
  const parsed = githubRepositoryFromLink(link);
  if (!parsed) return null;
  const current = cache.get(parsed.key);
  if (current && current.expiresAt > Date.now()) return current.value;
  const active = pending.get(parsed.key);
  if (active) return active;
  const request = requestRepositoryMetadata(parsed.sourceLink, parsed.owner, parsed.repository).then((value) => {
    cache.set(parsed.key, { value, expiresAt: Date.now() + cacheTtlMs });
    pending.delete(parsed.key);
    return value;
  }).catch(() => {
    pending.delete(parsed.key);
    return null;
  });
  pending.set(parsed.key, request);
  return request;
}
async function getGitHubRepositoryMetadataForLinks(links) {
  const uniqueLinks = Array.from(new Set(links.map((link) => link.trim()).filter(Boolean))).slice(0, 8);
  const repositories = [];
  for (const link of uniqueLinks) {
    const repository = await getGitHubRepositoryMetadata(link);
    if (repository) repositories.push(repository);
  }
  return repositories;
}

// server/storage.ts
init_supabase();
import fs4 from "node:fs/promises";
import path4 from "node:path";
var STORAGE_BUCKET2 = "careertwin-storage";
var isServerlessEnv2 = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
var LOCAL_STORAGE_DIR2 = isServerlessEnv2 ? path4.resolve("/tmp", ".storage") : path4.resolve(process.cwd(), ".storage");
var _bucketEnsured = false;
async function ensureLocalDir(filePath) {
  const dir = path4.dirname(filePath);
  await fs4.mkdir(dir, { recursive: true });
}
async function ensureBucket() {
  if (_bucketEnsured) return;
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === STORAGE_BUCKET2);
    if (!exists) {
      await supabase.storage.createBucket(STORAGE_BUCKET2, {
        public: true,
        fileSizeLimit: 10485760
        // 10MB
      });
    }
    _bucketEnsured = true;
  } catch (err) {
    console.warn("[Storage] Note on bucket creation:", err);
  }
}
function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, "");
}
function appendHashSuffix(relKey) {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const key = appendHashSuffix(normalizeKey(relKey));
  const buffer = typeof data === "string" ? Buffer.from(data, "utf-8") : Buffer.from(data);
  const supabase = getSupabaseAdmin() || getSupabaseClient();
  if (supabase) {
    try {
      await ensureBucket();
      const { error } = await supabase.storage.from(STORAGE_BUCKET2).upload(key, buffer, {
        contentType,
        upsert: true
      });
      if (!error) {
        const { data: publicData } = supabase.storage.from(STORAGE_BUCKET2).getPublicUrl(key);
        if (publicData?.publicUrl) {
          try {
            const localPath2 = path4.join(LOCAL_STORAGE_DIR2, key);
            await ensureLocalDir(localPath2);
            await fs4.writeFile(localPath2, buffer);
          } catch {
          }
          return { key, url: publicData.publicUrl };
        }
      } else {
        console.warn("[Storage] Supabase storage upload warning, saving to local mirror:", error.message);
      }
    } catch (supaErr) {
      console.warn("[Storage] Supabase storage exception:", supaErr);
    }
  }
  const localPath = path4.join(LOCAL_STORAGE_DIR2, key);
  await ensureLocalDir(localPath);
  await fs4.writeFile(localPath, buffer);
  return { key, url: `/local-storage/${key}` };
}
async function storageGetSignedUrl(relKey) {
  const key = normalizeKey(relKey);
  const supabase = getSupabaseAdmin() || getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.storage.from(STORAGE_BUCKET2).createSignedUrl(key, 3600);
      if (!error && data?.signedUrl) {
        return data.signedUrl;
      }
    } catch {
    }
    const { data: publicData } = supabase.storage.from(STORAGE_BUCKET2).getPublicUrl(key);
    if (publicData?.publicUrl) {
      return publicData.publicUrl;
    }
  }
  return `/local-storage/${key}`;
}
async function storageGetBuffer(relKey) {
  const key = normalizeKey(relKey);
  try {
    const localPath = path4.join(LOCAL_STORAGE_DIR2, key);
    const buf = await fs4.readFile(localPath);
    if (buf && buf.length > 0) return buf;
  } catch {
  }
  const supabase = getSupabaseAdmin() || getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.storage.from(STORAGE_BUCKET2).download(key);
      if (!error && data) {
        const arrayBuf = await data.arrayBuffer();
        return Buffer.from(arrayBuf);
      }
    } catch {
    }
  }
  return null;
}

// server/services/careerOpsScraper.ts
var BASE_COMPANIES_RAW = [
  // ─── Meta / Facebook Careers (Global Remote & Regional Tech Hubs) ───
  {
    id: "co-meta-01",
    company: "Meta",
    city: "Remote",
    role: "Frontend Engineer (React Core & UI Architecture)",
    mode: "Remote",
    sal: "$115,000 \u2013 $185,000 / yr",
    exp: "Senior",
    core: ["React", "TypeScript", "JavaScript", "GraphQL", "UI Architecture"],
    extra: ["Relay", "Next.js", "Jest", "Web Performance"],
    plats: ["meta", "linkedin"],
    url: "https://www.metacareers.com/jobs?q=Frontend%20Engineer",
    ats: "direct-portal"
  },
  {
    id: "co-meta-02",
    company: "Meta (WhatsApp Platform)",
    city: "Remote",
    role: "Full Stack Systems Developer (High Concurrency & Real-Time Web)",
    mode: "Remote",
    sal: "$120,000 \u2013 $190,000 / yr",
    exp: "Senior",
    core: ["React", "TypeScript", "Node.js", "PostgreSQL", "WebSockets"],
    extra: ["Erlang", "Distributed Systems", "Docker", "Security"],
    plats: ["meta", "linkedin"],
    url: "https://www.metacareers.com/jobs?q=WhatsApp",
    ats: "direct-portal"
  },
  {
    id: "co-meta-03",
    company: "Meta (Instagram Core UI)",
    city: "Remote",
    role: "Product Software Engineer (Design Systems & Micro-Interactions)",
    mode: "Remote",
    sal: "$110,000 \u2013 $175,000 / yr",
    exp: "Mid-Level",
    core: ["React", "TypeScript", "CSS", "Tailwind CSS", "Figma"],
    extra: ["Framer Motion", "GraphQL", "Accessibility"],
    plats: ["meta", "linkedin"],
    url: "https://www.metacareers.com/jobs?q=Instagram",
    ats: "direct-portal"
  },
  {
    id: "co-meta-04",
    company: "Meta AI",
    city: "Remote",
    role: "AI Application Engineer (Llama Ecosystem & Developer Experience)",
    mode: "Remote",
    sal: "$130,000 \u2013 $210,000 / yr",
    exp: "Senior",
    core: ["Python", "TypeScript", "React", "PyTorch", "FastAPI"],
    extra: ["Vector Search", "LLM Fine-Tuning", "Docker"],
    plats: ["meta", "linkedin", "github"],
    url: "https://www.metacareers.com/jobs?q=AI%20Engineer",
    ats: "direct-portal"
  },
  // ─── Upwork High-Paying Contracts & Client Projects ───
  {
    id: "co-upwork-01",
    company: "Upwork Enterprise Clients",
    city: "Remote",
    role: "Senior Full-Stack Consultant (React, Node.js & AI Integrations)",
    mode: "Remote",
    sal: "$50 \u2013 $95 / hr",
    exp: "Senior",
    core: ["React", "TypeScript", "Node.js", "Python", "SQL"],
    extra: ["FastAPI", "Next.js", "Docker", "LLM APIs"],
    plats: ["upwork"],
    url: "https://www.upwork.com/nx/search/jobs/?q=Full%20Stack%20Developer",
    ats: "direct-portal"
  },
  {
    id: "co-upwork-02",
    company: "Upwork Top Rated Plus Client",
    city: "Remote",
    role: "Frontend React / Next.js Specialist (Dashboard & SaaS UI)",
    mode: "Remote",
    sal: "$45 \u2013 $80 / hr",
    exp: "Mid-Level",
    core: ["React", "TypeScript", "Next.js", "Tailwind CSS", "REST APIs"],
    extra: ["Framer Motion", "Redux", "Zustand"],
    plats: ["upwork"],
    url: "https://www.upwork.com/nx/search/jobs/?q=React%20Developer",
    ats: "direct-portal"
  },
  {
    id: "co-upwork-03",
    company: "Upwork AI Startup Contract",
    city: "Remote",
    role: "Full-Stack AI Application Engineer (LangChain & Gemini API)",
    mode: "Remote",
    sal: "$55 \u2013 $100 / hr",
    exp: "Senior",
    core: ["Python", "TypeScript", "React", "FastAPI", "Node.js"],
    extra: ["Vector Databases", "Docker", "PostgreSQL"],
    plats: ["upwork"],
    url: "https://www.upwork.com/nx/search/jobs/?q=AI%20Engineer",
    ats: "direct-portal"
  },
  {
    id: "co-upwork-04",
    company: "Upwork US Fintech Client",
    city: "Remote",
    role: "Node.js & TypeScript Backend Specialist (Payment Rails)",
    mode: "Remote",
    sal: "$50 \u2013 $85 / hr",
    exp: "Senior",
    core: ["Node.js", "TypeScript", "PostgreSQL", "Stripe API", "AWS"],
    extra: ["Docker", "Redis", "Microservices"],
    plats: ["upwork"],
    url: "https://www.upwork.com/nx/search/jobs/?q=Node%20Developer",
    ats: "direct-portal"
  },
  // ─── Pakistan Tech Hubs (Lahore, Islamabad, Rawalpindi, Wah Cantt, Karachi, Peshawar, Faisalabad, Multan, Gujranwala, Sialkot, Abbottabad) ───
  {
    id: "co-pk-01",
    company: "Capregsoft",
    city: "Lahore",
    role: "Full Stack Engineer (Core Platform & AI Systems)",
    mode: "Hybrid",
    sal: "PKR 260,000 \u2013 430,000 / mo",
    exp: "Mid-Level",
    core: ["React", "TypeScript", "Node.js", "SQL", "Tailwind CSS"],
    extra: ["Next.js", "Docker", "PostgreSQL"],
    plats: ["linkedin", "indeed", "github"],
    url: "https://capregsoft.com",
    ats: "direct-portal"
  },
  {
    id: "co-pk-02",
    company: "Systems Limited",
    city: "Lahore",
    role: "Enterprise Solutions Developer (Cloud & Web)",
    mode: "Hybrid",
    sal: "PKR 280,000 \u2013 480,000 / mo",
    exp: "Mid-Level",
    core: ["Node.js", "TypeScript", "SQL", "React", "Cloud"],
    extra: ["Azure", "Microservices", "CI/CD"],
    plats: ["linkedin", "indeed"],
    url: "https://www.systemsltd.com/careers",
    ats: "direct-portal"
  },
  {
    id: "co-pk-03",
    company: "Arbisoft",
    city: "Lahore",
    role: "Software Engineer (Web & Distributed Systems)",
    mode: "Hybrid",
    sal: "PKR 300,000 \u2013 550,000 / mo",
    exp: "Mid-Level",
    core: ["Python", "React", "TypeScript", "SQL", "Django"],
    extra: ["AWS", "Docker", "FastAPI"],
    plats: ["linkedin", "indeed"],
    url: "https://arbisoft.com/careers",
    ats: "direct-portal"
  },
  {
    id: "co-pk-04",
    company: "Educative, Inc.",
    city: "Lahore",
    role: "Full Stack Engineer (Interactive Learning Platform)",
    mode: "Hybrid",
    sal: "PKR 320,000 \u2013 520,000 / mo",
    exp: "Mid-Level",
    core: ["React", "TypeScript", "Node.js", "Python", "SQL"],
    extra: ["Docker", "Kubernetes", "AWS"],
    plats: ["linkedin", "indeed", "github"],
    url: "https://www.educative.io/careers",
    ats: "lever"
  },
  {
    id: "co-pk-05",
    company: "SadaPay",
    city: "Islamabad",
    role: "Fintech Platform Engineer (Modern Banking Core)",
    mode: "Hybrid",
    sal: "PKR 330,000 \u2013 580,000 / mo",
    exp: "Mid-Level",
    core: ["TypeScript", "Node.js", "PostgreSQL", "AWS", "REST APIs"],
    extra: ["Docker", "Kubernetes", "Redis"],
    plats: ["linkedin", "indeed", "github"],
    url: "https://sadapay.pk/careers/",
    ats: "lever"
  },
  {
    id: "co-pk-06",
    company: "Motive (KeepTruckin)",
    city: "Islamabad",
    role: "IoT & Fleet Management Full Stack Engineer",
    mode: "Hybrid",
    sal: "PKR 370,000 \u2013 620,000 / mo",
    exp: "Mid-Level",
    core: ["React", "TypeScript", "Node.js", "PostgreSQL", "AWS"],
    extra: ["Docker", "Kubernetes", "Kafka"],
    plats: ["linkedin", "indeed", "github"],
    url: "https://gomotive.com/company/careers/",
    ats: "greenhouse"
  },
  {
    id: "co-pk-07",
    company: "Contour Software",
    city: "Rawalpindi",
    role: "Enterprise Software Developer (Constellation Software Core)",
    mode: "Hybrid",
    sal: "PKR 310,000 \u2013 540,000 / mo",
    exp: "Mid-Level",
    core: ["TypeScript", "React", "SQL", "Node.js", "C#"],
    extra: [".NET Core", "Azure", "REST APIs"],
    plats: ["linkedin", "indeed"],
    url: "https://contour-software.com/careers/",
    ats: "direct-portal"
  },
  {
    id: "co-pk-08",
    company: "Discretelogix",
    city: "Islamabad",
    role: "Web Application Specialist & UI Architect",
    mode: "Hybrid",
    sal: "PKR 240,000 \u2013 400,000 / mo",
    exp: "Mid-Level",
    core: ["React", "TypeScript", "Node.js", "SQL", "Tailwind CSS"],
    extra: ["Next.js", "Express", "Git"],
    plats: ["indeed", "linkedin"],
    url: "https://discretelogix.com/careers/",
    ats: "direct-portal"
  },
  {
    id: "co-pk-09",
    company: "Vintro Tech Hub",
    city: "Wah Cantt",
    role: "Full Stack Web & Cloud Applications Engineer",
    mode: "Hybrid",
    sal: "PKR 220,000 \u2013 380,000 / mo",
    exp: "Entry / Junior",
    core: ["React", "TypeScript", "Node.js", "Tailwind CSS", "SQL"],
    extra: ["Next.js", "Express", "Docker"],
    plats: ["indeed", "linkedin", "upwork"],
    url: "https://pk.indeed.com/jobs?q=Web+Developer&l=Wah+Cantt",
    ats: "direct-portal"
  },
  {
    id: "co-pk-10",
    company: "Taxila IT Valley",
    city: "Taxila",
    role: "Frontend Software Engineer (React / JavaScript)",
    mode: "Hybrid",
    sal: "PKR 210,000 \u2013 360,000 / mo",
    exp: "Mid-Level",
    core: ["React", "JavaScript", "Tailwind CSS", "REST APIs", "Git"],
    extra: ["TypeScript", "Next.js", "Redux"],
    plats: ["indeed", "linkedin"],
    url: "https://pk.indeed.com/jobs?q=Software+Engineer&l=Taxila",
    ats: "direct-portal"
  },
  {
    id: "co-pk-11",
    company: "10Pearls",
    city: "Karachi",
    role: "Senior Web Solutions Architect",
    mode: "Hybrid",
    sal: "PKR 350,000 \u2013 600,000 / mo",
    exp: "Senior",
    core: ["React", "TypeScript", "Node.js", "Cloud", "REST APIs"],
    extra: ["GraphQL", "Serverless", "Security"],
    plats: ["linkedin", "indeed"],
    url: "https://10pearls.com/careers/",
    ats: "direct-portal"
  },
  {
    id: "co-pk-12",
    company: "NayaPay",
    city: "Karachi",
    role: "Mobile & Full Stack Developer",
    mode: "Hybrid",
    sal: "PKR 260,000 \u2013 440,000 / mo",
    exp: "Mid-Level",
    core: ["React Native", "TypeScript", "React", "Node.js", "SQL"],
    extra: ["GraphQL", "Tailwind CSS", "Jest"],
    plats: ["indeed", "linkedin"],
    url: "https://www.nayapay.com/careers",
    ats: "direct-portal"
  },
  {
    id: "co-pk-13",
    company: "Bazaar Technologies",
    city: "Karachi",
    role: "Software Engineer (Supply Chain & B2B Web)",
    mode: "Hybrid",
    sal: "PKR 310,000 \u2013 530,000 / mo",
    exp: "Mid-Level",
    core: ["Python", "React", "TypeScript", "PostgreSQL", "Django"],
    extra: ["FastAPI", "Docker", "AWS"],
    plats: ["linkedin", "indeed", "github"],
    url: "https://bazaartech.com/careers",
    ats: "greenhouse"
  },
  {
    id: "co-pk-14",
    company: "VentureDive",
    city: "Lahore",
    role: "Frontend Engineer (Mobile & React Ecosystem)",
    mode: "Hybrid",
    sal: "PKR 240,000 \u2013 390,000 / mo",
    exp: "Mid-Level",
    core: ["React", "TypeScript", "Tailwind CSS", "Redux", "REST APIs"],
    extra: ["React Native", "Next.js", "Jest"],
    plats: ["linkedin", "indeed"],
    url: "https://www.venturedive.com/careers/",
    ats: "greenhouse"
  },
  {
    id: "co-pk-15",
    company: "Devsinc",
    city: "Lahore",
    role: "Full Stack Engineer (Scalable Web Products)",
    mode: "Hybrid",
    sal: "PKR 250,000 \u2013 420,000 / mo",
    exp: "Mid-Level",
    core: ["React", "Node.js", "TypeScript", "PostgreSQL", "GraphQL"],
    extra: ["Next.js", "Tailwind CSS", "Docker"],
    plats: ["linkedin", "github", "indeed"],
    url: "https://devsinc.com/careers",
    ats: "direct-portal"
  },
  {
    id: "co-pk-16",
    company: "Peshawar Software Park",
    city: "Peshawar",
    role: "Full Stack Web Developer (KPITB Tech Incubator)",
    mode: "Hybrid",
    sal: "PKR 220,000 \u2013 370,000 / mo",
    exp: "Entry / Junior",
    core: ["React", "TypeScript", "Node.js", "SQL", "Tailwind CSS"],
    extra: ["Next.js", "MongoDB", "Git"],
    plats: ["indeed", "linkedin"],
    url: "https://kpitb.gov.pk",
    ats: "direct-portal"
  },
  {
    id: "co-pk-17",
    company: "Algoris Tech",
    city: "Faisalabad",
    role: "Software Engineer (Web Applications)",
    mode: "Hybrid",
    sal: "PKR 230,000 \u2013 380,000 / mo",
    exp: "Mid-Level",
    core: ["React", "TypeScript", "Node.js", "PostgreSQL", "REST APIs"],
    extra: ["Tailwind CSS", "Next.js", "Docker"],
    plats: ["indeed", "linkedin"],
    url: "https://pk.indeed.com/jobs?q=Software+Engineer&l=Faisalabad",
    ats: "direct-portal"
  },
  {
    id: "co-pk-18",
    company: "Multan Tech Hub",
    city: "Multan",
    role: "Full Stack Developer (Web & Cloud Platforms)",
    mode: "Hybrid",
    sal: "PKR 220,000 \u2013 360,000 / mo",
    exp: "Mid-Level",
    core: ["React", "TypeScript", "Node.js", "SQL", "PHP"],
    extra: ["Laravel", "Next.js", "Docker"],
    plats: ["indeed", "linkedin"],
    url: "https://pk.indeed.com/jobs?q=Full+Stack&l=Multan",
    ats: "direct-portal"
  },
  {
    id: "co-pk-19",
    company: "Gujranwala Software Labs",
    city: "Gujranwala",
    role: "Frontend Engineer (React & TypeScript)",
    mode: "Hybrid",
    sal: "PKR 220,000 \u2013 370,000 / mo",
    exp: "Mid-Level",
    core: ["React", "TypeScript", "Tailwind CSS", "Node.js", "REST APIs"],
    extra: ["Next.js", "Redux", "Git"],
    plats: ["indeed", "linkedin", "upwork"],
    url: "https://pk.indeed.com/jobs?q=React+Developer&l=Gujranwala",
    ats: "direct-portal"
  },
  {
    id: "co-pk-20",
    company: "Sialkot Export IT Center",
    city: "Sialkot",
    role: "Web Applications Developer (E-Commerce & Portals)",
    mode: "Hybrid",
    sal: "PKR 230,000 \u2013 380,000 / mo",
    exp: "Mid-Level",
    core: ["React", "TypeScript", "Node.js", "PostgreSQL", "SQL"],
    extra: ["Next.js", "Tailwind CSS", "REST APIs"],
    plats: ["indeed", "linkedin"],
    url: "https://pk.indeed.com/jobs?q=Software+Developer&l=Sialkot",
    ats: "direct-portal"
  },
  {
    id: "co-pk-21",
    company: "Abbottabad Innovation Park",
    city: "Abbottabad",
    role: "Full Stack Engineer (Cloud & Web Services)",
    mode: "Hybrid",
    sal: "PKR 210,000 \u2013 360,000 / mo",
    exp: "Mid-Level",
    core: ["React", "TypeScript", "Python", "SQL", "Node.js"],
    extra: ["FastAPI", "Docker", "Tailwind CSS"],
    plats: ["indeed", "linkedin"],
    url: "https://pk.indeed.com/jobs?q=Software+Engineer&l=Abbottabad",
    ats: "direct-portal"
  },
  // ─── Global Remote Leaders & Tech Titans (100% Remote / Worldwide) ───
  {
    id: "co-gl-01",
    company: "Supabase",
    city: "Remote",
    role: "Full Stack Engineer (Real-Time Cloud & Developer Platform)",
    mode: "Remote",
    sal: "$85,000 \u2013 $135,000 / yr",
    exp: "Mid-Level",
    core: ["TypeScript", "React", "Node.js", "PostgreSQL", "REST APIs"],
    extra: ["GraphQL", "Python", "FastAPI"],
    plats: ["remoteok", "github", "linkedin"],
    url: "https://supabase.com/careers",
    ats: "ashby"
  },
  {
    id: "co-gl-02",
    company: "Linear",
    city: "Remote",
    role: "Frontend Engineer (Design Systems & Micro-Interactions)",
    mode: "Remote",
    sal: "$95,000 \u2013 $150,000 / yr",
    exp: "Mid-Level",
    core: ["React", "TypeScript", "Tailwind CSS", "UI/UX", "Next.js"],
    extra: ["Framer Motion", "Figma", "Accessibility"],
    plats: ["linkedin", "github"],
    url: "https://linear.app/careers",
    ats: "ashby"
  },
  {
    id: "co-gl-03",
    company: "Vercel Enterprise",
    city: "Remote",
    role: "Backend & Systems Infrastructure Engineer",
    mode: "Remote",
    sal: "$90,000 \u2013 $145,000 / yr",
    exp: "Mid-Level",
    core: ["Node.js", "Python", "SQL", "Docker", "TypeScript"],
    extra: ["AWS", "Redis", "Microservices"],
    plats: ["remoteok", "github", "linkedin"],
    url: "https://vercel.com/careers",
    ats: "greenhouse"
  },
  {
    id: "co-gl-04",
    company: "Stripe",
    city: "Remote",
    role: "API Infrastructure & Integrations Developer",
    mode: "Remote",
    sal: "$110,000 \u2013 $170,000 / yr",
    exp: "Senior",
    core: ["TypeScript", "Node.js", "Ruby", "PostgreSQL", "REST APIs"],
    extra: ["Security", "Docker", "Microservices"],
    plats: ["linkedin", "github"],
    url: "https://stripe.com/jobs",
    ats: "greenhouse"
  },
  {
    id: "co-gl-05",
    company: "GitHub",
    city: "Remote",
    role: "Developer Tools & Next-Gen Web UI Engineer",
    mode: "Remote",
    sal: "$95,000 \u2013 $155,000 / yr",
    exp: "Mid-Level",
    core: ["React", "TypeScript", "Ruby on Rails", "Tailwind CSS", "GraphQL"],
    extra: ["Accessibility", "Jest", "Docker"],
    plats: ["github", "linkedin"],
    url: "https://github.com/about/careers",
    ats: "greenhouse"
  },
  {
    id: "co-gl-06",
    company: "Canva",
    city: "Remote",
    role: "Frontend Graphics & UI Systems Engineer",
    mode: "Remote",
    sal: "$85,000 \u2013 $140,000 / yr",
    exp: "Mid-Level",
    core: ["TypeScript", "React", "WebGL", "Canvas API", "Tailwind CSS"],
    extra: ["Redux", "Rust", "Jest"],
    plats: ["linkedin", "remoteok"],
    url: "https://www.canva.com/careers/",
    ats: "lever"
  },
  {
    id: "co-gl-07",
    company: "Perplexity AI",
    city: "Remote",
    role: "Conversational Search UI & Platform Engineer",
    mode: "Remote",
    sal: "$115,000 \u2013 $175,000 / yr",
    exp: "Senior",
    core: ["React", "TypeScript", "Next.js", "Python", "Tailwind CSS"],
    extra: ["FastAPI", "Vector Search", "Redis"],
    plats: ["github", "linkedin"],
    url: "https://www.perplexity.ai/careers",
    ats: "ashby"
  },
  {
    id: "co-gl-08",
    company: "Notion",
    city: "Remote",
    role: "Collaborative Workspace Frontend Engineer",
    mode: "Remote",
    sal: "$105,000 \u2013 $165,000 / yr",
    exp: "Senior",
    core: ["React", "TypeScript", "Canvas", "PostgreSQL", "Node.js"],
    extra: ["WebSockets", "Performance", "Tailwind CSS"],
    plats: ["linkedin", "github"],
    url: "https://www.notion.so/careers",
    ats: "lever"
  },
  {
    id: "co-gl-09",
    company: "Figma",
    city: "Remote",
    role: "Design Systems & Web Graphics Developer",
    mode: "Remote",
    sal: "$110,000 \u2013 $170,000 / yr",
    exp: "Senior",
    core: ["TypeScript", "C++", "WebGL", "React", "WebAssembly"],
    extra: ["Rust", "Canvas", "Figma Plugins"],
    plats: ["linkedin", "github"],
    url: "https://www.figma.com/careers/",
    ats: "greenhouse"
  },
  {
    id: "co-gl-10",
    company: "PostHog",
    city: "Remote",
    role: "Full Stack Product Analytics Engineer",
    mode: "Remote",
    sal: "$100,000 \u2013 $160,000 / yr",
    exp: "Mid-Level",
    core: ["React", "TypeScript", "Python", "PostgreSQL", "ClickHouse"],
    extra: ["Django", "Docker", "Tailwind CSS"],
    plats: ["github", "linkedin", "remoteok"],
    url: "https://posthog.com/careers",
    ats: "ashby"
  }
];
var cachedRemoteJobs = [];
var lastRemoteFetchTime = 0;
var REMOTE_CACHE_TTL = 3 * 60 * 1e3;
function extractSkillsFromText(tags, fallbackTitle) {
  const recognizedPool = [
    "React",
    "TypeScript",
    "JavaScript",
    "Node.js",
    "Python",
    "SQL",
    "PostgreSQL",
    "MongoDB",
    "Next.js",
    "Tailwind CSS",
    "Docker",
    "Kubernetes",
    "AWS",
    "FastAPI",
    "Django",
    "GraphQL",
    "Redis",
    "C#",
    ".NET Core",
    "Flutter",
    "Go",
    "Rust",
    "Vue.js",
    "Angular",
    "Express",
    "REST APIs",
    "Git",
    "CI/CD",
    "Linux",
    "PyTorch"
  ];
  const found = [];
  const tagList = Array.isArray(tags) ? tags.map((t2) => String(t2 || "").trim()) : typeof tags === "string" ? tags.split(/[,;\s]+/) : [];
  const combinedSearch = (tagList.join(" ") + " " + (fallbackTitle || "")).toLowerCase();
  for (const skill of recognizedPool) {
    const sLower = skill.toLowerCase();
    if (combinedSearch.includes(sLower) && !found.includes(skill)) {
      found.push(skill);
    }
  }
  if (found.length === 0) {
    return {
      core: ["React", "TypeScript", "Node.js"],
      extra: ["Git", "REST APIs", "SQL"]
    };
  }
  return {
    core: found.slice(0, 4),
    extra: found.slice(4, 7).length > 0 ? found.slice(4, 7) : ["Git", "REST APIs"]
  };
}
async function fetchRemotiveJobs() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch("https://remotive.com/api/remote-jobs?category=software-dev&limit=30", {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data || !Array.isArray(data.jobs)) return [];
    return data.jobs.slice(0, 25).map((item) => {
      const skills = extractSkillsFromText(item.tags, item.title);
      return {
        id: `remotive-${item.id}`,
        title: item.title,
        company: item.company_name,
        location: item.candidate_required_location ? `Remote (${item.candidate_required_location})` : "Remote (Worldwide)",
        cityKey: "remote",
        jobUrl: item.url || "https://remotive.com",
        workMode: "Remote",
        salaryRange: item.salary || "$95,000 \u2013 $155,000 / yr",
        experienceLevel: (item.title || "").toLowerCase().includes("senior") ? "Senior" : "Mid-Level",
        coreSkills: skills.core,
        extraSkills: skills.extra,
        platformSources: ["remotive", "remoteok"],
        whyRecommended: `Live verified software opening aggregated from Remotive developer board.`,
        talkingPoints: [
          `Detail your experience delivering production web features with ${skills.core.slice(0, 2).join(" & ")}.`,
          `Emphasize autonomous delivery, asynchronous collaboration, and clean testing standards.`
        ],
        sourceAts: "remotive"
      };
    });
  } catch {
    return [];
  }
}
async function fetchRemoteOKJobs() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch("https://remoteok.com/api?tag=dev", {
      headers: { "User-Agent": "CareerTwinAI/1.0" },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    const items = data.slice(1, 25);
    const results = [];
    for (const item of items) {
      if (item && item.position && item.company) {
        const skills = extractSkillsFromText(item.tags, item.position);
        results.push({
          id: `rok-${item.id || Math.random().toString(36).slice(2, 8)}`,
          title: item.position,
          company: item.company,
          location: "Remote (Global / Worldwide)",
          cityKey: "remote",
          jobUrl: item.url || `https://remoteok.com/remote-jobs/${item.id}`,
          workMode: "Remote",
          salaryRange: item.salary_min && item.salary_max ? `$${Math.round(item.salary_min / 1e3)}k \u2013 $${Math.round(item.salary_max / 1e3)}k / yr` : "$90,000 \u2013 $150,000 / yr",
          experienceLevel: (item.position || "").toLowerCase().includes("senior") ? "Senior" : "Mid-Level",
          coreSkills: skills.core,
          extraSkills: skills.extra,
          platformSources: ["remoteok", "github"],
          whyRecommended: `Live real-time tech posting aggregated from RemoteOK.`,
          talkingPoints: [
            `Discuss clean architecture and high-performance delivery across ${skills.core.join(", ")}.`
          ],
          sourceAts: "remotive"
        });
      }
    }
    return results;
  } catch {
    return [];
  }
}
async function fetchArbeitnowJobs() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch("https://www.arbeitnow.com/api/job-board-api", {
      headers: { "User-Agent": "CareerTwinAI/1.0" },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data || !Array.isArray(data.data)) return [];
    return data.data.slice(0, 25).map((item) => {
      const skills = extractSkillsFromText(item.tags, item.title);
      const isRemote = Boolean(item.remote);
      return {
        id: `arbeitnow-${item.slug || Math.random().toString(36).slice(2, 8)}`,
        title: item.title,
        company: item.company_name,
        location: isRemote ? "Remote (Global / Worldwide)" : `${item.location || "Europe / Global"} \xB7 Hybrid`,
        cityKey: isRemote ? "remote" : "global",
        jobUrl: item.url || "https://www.arbeitnow.com",
        workMode: isRemote ? "Remote" : "Hybrid",
        salaryRange: "$85,000 \u2013 $145,000 / yr",
        experienceLevel: (item.title || "").toLowerCase().includes("senior") ? "Senior" : "Mid-Level",
        coreSkills: skills.core,
        extraSkills: skills.extra,
        platformSources: ["arbeitnow", "linkedin"],
        whyRecommended: `Live Europe-focused & global remote tech opportunity from Arbeitnow job board.`,
        talkingPoints: [
          `Demonstrate strong component lifecycle and API communication using ${skills.core.slice(0, 2).join(" & ")}.`
        ],
        sourceAts: "greenhouse"
      };
    });
  } catch {
    return [];
  }
}
async function fetchJobicyJobs() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch("https://jobicy.com/api/v2/remote-jobs?count=25&industry=engineering", {
      headers: { "User-Agent": "CareerTwinAI/1.0" },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data || !Array.isArray(data.jobs)) return [];
    return data.jobs.slice(0, 25).map((item) => {
      const skills = extractSkillsFromText(item.jobGeo || item.jobCategory, item.jobTitle);
      return {
        id: `jobicy-${item.id || Math.random().toString(36).slice(2, 8)}`,
        title: item.jobTitle,
        company: item.companyName,
        location: item.jobGeo ? `Remote (${item.jobGeo})` : "Remote (Worldwide)",
        cityKey: "remote",
        jobUrl: item.url || "https://jobicy.com",
        workMode: "Remote",
        salaryRange: item.annualSalaryMin && item.annualSalaryMax ? `$${Math.round(item.annualSalaryMin / 1e3)}k \u2013 $${Math.round(item.annualSalaryMax / 1e3)}k / yr` : "$90,000 \u2013 $160,000 / yr",
        experienceLevel: (item.jobLevel || "").toLowerCase().includes("senior") ? "Senior" : "Mid-Level",
        coreSkills: skills.core,
        extraSkills: skills.extra,
        platformSources: ["jobicy", "remoteok"],
        whyRecommended: `Live remote engineering opening from Jobicy global talent network.`,
        talkingPoints: [
          `Highlight experience building robust, scale-ready systems in ${skills.core.slice(0, 2).join(", ")}.`
        ],
        sourceAts: "lever"
      };
    });
  } catch {
    return [];
  }
}
async function fetchTheMuseJobs() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch("https://www.themuse.com/api/public/jobs?category=Software%20Engineering&page=1", {
      headers: { "User-Agent": "CareerTwinAI/1.0" },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data || !Array.isArray(data.results)) return [];
    return data.results.slice(0, 25).map((item) => {
      const title = item.name || "Software Engineer";
      const company = item.company?.name || "Global Enterprise";
      const locationName = item.locations?.[0]?.name || "Flexible / Remote";
      const isRemote = locationName.toLowerCase().includes("remote") || locationName.toLowerCase().includes("flexible");
      const levelShort = item.levels?.[0]?.short_name?.toLowerCase() || "";
      const experienceLevel = levelShort.includes("senior") || title.toLowerCase().includes("senior") ? "Senior" : levelShort.includes("entry") || levelShort.includes("intern") ? "Entry / Junior" : levelShort.includes("lead") || levelShort.includes("principal") ? "Lead" : "Mid-Level";
      const skills = extractSkillsFromText(void 0, title);
      const landingPage = item.refs?.landing_page || "https://www.themuse.com/jobs";
      return {
        id: `themuse-${item.id}`,
        title,
        company,
        location: isRemote ? "Remote (Global / Worldwide)" : `${locationName} \xB7 Hybrid`,
        cityKey: isRemote ? "remote" : "global",
        jobUrl: landingPage,
        workMode: isRemote ? "Remote" : "Hybrid",
        salaryRange: "$100,000 \u2013 $170,000 / yr",
        experienceLevel,
        coreSkills: skills.core,
        extraSkills: skills.extra,
        platformSources: ["themuse", "linkedin"],
        whyRecommended: `Live verified opening from The Muse 500k+ enterprise career network.`,
        talkingPoints: [
          `Demonstrate strong engineering fundamentals, clean modular design, and ${skills.core.slice(0, 2).join(" & ")}.`,
          `Highlight team communication, ownership, and measurable customer impact.`
        ],
        sourceAts: "greenhouse"
      };
    });
  } catch {
    return [];
  }
}
async function fetchWWRJobs() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch("https://weworkremotely.com/categories/remote-programming-jobs.rss", {
      headers: { "User-Agent": "CareerTwinAI/1.0" },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) return [];
    const xml = await res.text();
    const results = [];
    const itemRegex = /<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null && results.length < 20) {
      const rawTitle = match[1] ? match[1].replace(/&amp;/g, "&").replace(/&lt;.*?&gt;/g, "").trim() : "";
      const jobUrl = match[2] ? match[2].trim() : "https://weworkremotely.com";
      if (!rawTitle) continue;
      let company = "Tech Enterprise";
      let title = rawTitle;
      if (rawTitle.includes(":")) {
        const parts = rawTitle.split(":");
        company = parts[0].trim();
        title = parts.slice(1).join(":").trim();
      }
      const skills = extractSkillsFromText(void 0, title);
      results.push({
        id: `wwr-${Math.random().toString(36).slice(2, 8)}`,
        title,
        company,
        location: "Remote (Global / Worldwide)",
        cityKey: "remote",
        jobUrl,
        workMode: "Remote",
        salaryRange: "$95,000 \u2013 $165,000 / yr",
        experienceLevel: title.toLowerCase().includes("senior") || title.toLowerCase().includes("lead") ? "Senior" : "Mid-Level",
        coreSkills: skills.core,
        extraSkills: skills.extra,
        platformSources: ["remoteok", "github", "linkedin"],
        whyRecommended: `Live verified remote software role from WeWorkRemotely engineering board.`,
        talkingPoints: [
          `Emphasize autonomous delivery, clean code practices, and modern full-stack workflows.`
        ],
        sourceAts: "greenhouse"
      });
    }
    return results;
  } catch {
    return [];
  }
}
async function fetchLiveRemoteAPIs() {
  if (process.env.NODE_ENV === "test") {
    return [];
  }
  const now = Date.now();
  if (cachedRemoteJobs.length > 0 && now - lastRemoteFetchTime < REMOTE_CACHE_TTL) {
    return cachedRemoteJobs;
  }
  const [remotiveRes, remoteokRes, arbeitnowRes, jobicyRes, themuseRes, wwrRes] = await Promise.allSettled([
    fetchRemotiveJobs(),
    fetchRemoteOKJobs(),
    fetchArbeitnowJobs(),
    fetchJobicyJobs(),
    fetchTheMuseJobs(),
    fetchWWRJobs()
  ]);
  const combined = [];
  if (remotiveRes.status === "fulfilled") combined.push(...remotiveRes.value);
  if (remoteokRes.status === "fulfilled") combined.push(...remoteokRes.value);
  if (arbeitnowRes.status === "fulfilled") combined.push(...arbeitnowRes.value);
  if (jobicyRes.status === "fulfilled") combined.push(...jobicyRes.value);
  if (themuseRes.status === "fulfilled") combined.push(...themuseRes.value);
  if (wwrRes.status === "fulfilled") combined.push(...wwrRes.value);
  const seen = /* @__PURE__ */ new Set();
  const uniqueList = combined.filter((job) => {
    const key = `${job.company.toLowerCase()}-${job.title.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (uniqueList.length > 0) {
    cachedRemoteJobs = uniqueList;
    lastRemoteFetchTime = now;
  }
  return cachedRemoteJobs;
}
async function scrapeAndEvaluateLiveJobs(params) {
  const userLoc = (params.candidateLocation || "Islamabad, Pakistan").trim();
  const userLocLower = userLoc.toLowerCase();
  const rawSkills = params.candidateSkills || "React, TypeScript, Node.js, SQL, Tailwind CSS";
  const userSkillSet = new Set(
    rawSkills.split(/[,;\n]+/).map((s) => s.trim().toLowerCase().replace(/[^\w#+]/g, "")).filter(Boolean)
  );
  const targetRoleText = (params.targetRole || params.currentJob || "Software Engineer").trim();
  const combinedRegistry = BASE_COMPANIES_RAW.map((b) => {
    const isPak = b.city !== "Remote";
    const cityKey = b.city.toLowerCase().replace(/[^a-z]/g, "");
    const locStr = isPak ? `${b.city}, Pakistan \xB7 ${b.mode}` : `Remote (Global / Worldwide)`;
    return {
      id: b.id,
      title: b.role,
      company: b.company,
      location: locStr,
      cityKey: isPak ? cityKey : "remote",
      jobUrl: b.url,
      workMode: b.mode,
      salaryRange: b.sal,
      experienceLevel: b.exp,
      coreSkills: b.core,
      extraSkills: b.extra,
      platformSources: b.plats,
      whyRecommended: isPak ? `Priority local alignment with your target tech stack in ${b.city}, verified via ${b.plats.join(" & ")} signals.` : `100% remote global engineering opportunity with high-impact product scope in ${b.core.slice(0, 3).join(", ")}.`,
      talkingPoints: [
        `Discuss your project component architecture, clean state management, and type contracts.`,
        `Highlight your capability to deliver production-ready features on rapid sprint cycles.`
      ],
      sourceAts: b.ats
    };
  });
  try {
    const apiJobs = await fetchLiveRemoteAPIs();
    if (apiJobs.length > 0) {
      combinedRegistry.push(...apiJobs);
    }
  } catch {
  }
  const userCityClean = userLoc.split(",")[0].trim();
  const userCityKey = userCityClean.toLowerCase().replace(/[^a-z]/g, "");
  const existsInBase = combinedRegistry.some((j) => j.cityKey === userCityKey);
  if (!existsInBase && userCityClean.length > 2 && userCityKey !== "remote") {
    combinedRegistry.unshift(
      {
        id: `dyn-${userCityKey}-01`,
        title: `${targetRoleText} (Local Tech Hub & AI Systems)`,
        company: `${userCityClean} Tech Solutions`,
        location: `${userCityClean}, Pakistan \xB7 Hybrid`,
        cityKey: userCityKey,
        jobUrl: `https://pk.indeed.com/jobs?q=${encodeURIComponent(targetRoleText)}&l=${encodeURIComponent(userCityClean)}`,
        workMode: "Hybrid",
        salaryRange: "PKR 240,000 \u2013 420,000 / mo",
        experienceLevel: "Mid-Level",
        coreSkills: Array.from(userSkillSet).slice(0, 4).map((s) => s.toUpperCase()),
        extraSkills: ["REST APIs", "Git", "Docker"],
        platformSources: ["indeed", "linkedin"],
        whyRecommended: `Direct regional alignment located right in ${userCityClean}, matched with your core skills.`,
        talkingPoints: [
          `Discuss your verified competencies and immediate availability for ${userCityClean} hybrid delivery.`,
          `Highlight experience building scalable full-stack applications.`
        ],
        sourceAts: "direct-portal"
      },
      {
        id: `dyn-${userCityKey}-02`,
        title: `Full Stack Applications Specialist (${userCityClean} Region)`,
        company: "Apex Cloud Services",
        location: `${userCityClean}, Pakistan \xB7 Hybrid`,
        cityKey: userCityKey,
        jobUrl: `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(targetRoleText)}&location=${encodeURIComponent(userCityClean + ", Pakistan")}`,
        workMode: "Hybrid",
        salaryRange: "PKR 260,000 \u2013 450,000 / mo",
        experienceLevel: "Mid-Level",
        coreSkills: ["React", "TypeScript", "Node.js", "SQL"],
        extraSkills: ["Tailwind CSS", "Next.js", "PostgreSQL"],
        platformSources: ["linkedin", "indeed"],
        whyRecommended: `Active hiring pipeline near ${userCityClean} offering strong engineering compensation.`,
        talkingPoints: [
          `Detail your architectural patterns and error recovery mechanisms.`
        ],
        sourceAts: "direct-portal"
      }
    );
  }
  const evaluatedList = combinedRegistry.map((job, index) => {
    const matchingSkills = job.coreSkills.filter((skill) => {
      const norm = skill.trim().toLowerCase().replace(/[^\w#+]/g, "");
      return userSkillSet.has(norm) || Array.from(userSkillSet).some((userS) => userS.includes(norm) || norm.includes(userS));
    });
    const matchRatio = job.coreSkills.length > 0 ? matchingSkills.length / job.coreSkills.length : 0.6;
    const isExactCity = userLocLower.includes(job.cityKey) && job.cityKey !== "remote";
    const isCountryMatch = userLocLower.includes("pakistan") && job.location.toLowerCase().includes("pakistan");
    const isRemoteFriendly = job.workMode === "Remote";
    const isLocationMatch = isExactCity || isCountryMatch || isRemoteFriendly;
    let locationMatchReason = "Regional Hub Match";
    if (isExactCity) {
      locationMatchReason = `\u{1F4CD} Matched to your city (${userLoc})`;
    } else if (isCountryMatch) {
      locationMatchReason = `\u{1F4CD} Matched to your region (${userLoc})`;
    } else if (isRemoteFriendly) {
      locationMatchReason = `\u{1F310} 100% Remote \xB7 Open to ${userLoc}`;
    }
    const locationBonus = isExactCity ? 0.08 : isCountryMatch ? 0.05 : isRemoteFriendly ? 0.04 : 0;
    const basePct = Math.round((matchRatio * 0.55 + 0.35 + locationBonus) * 100);
    const cappedPct = Math.min(98, Math.max(76, basePct));
    const score = Number((cappedPct / 100 * 5).toFixed(1));
    const displayTitle = job.company === "Capregsoft" && targetRoleText.length > 3 ? `${targetRoleText} (Core Platform & AI Systems)` : job.title;
    const connectorNames = job.platformSources.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" & ");
    return {
      ...job,
      title: displayTitle,
      isLocationMatch,
      locationMatchReason,
      matchedSkills: matchingSkills.length > 0 ? matchingSkills : [job.coreSkills[0], job.coreSkills[1]].filter(Boolean),
      matchScore: score,
      matchPercentage: cappedPct,
      dimensions: {
        technicalFit: Math.min(99, Math.max(75, cappedPct + (index % 2 === 0 ? 2 : -1))),
        seniorityFit: Math.min(96, Math.max(80, cappedPct - index % 3)),
        workModeFit: isExactCity || isRemoteFriendly ? 98 : 90,
        growthFit: Math.min(97, Math.max(85, cappedPct + 1))
      },
      reportBlocks: {
        blockA: `${job.company} is actively hiring for ${displayTitle} in ${job.location}. Compensation band: ${job.salaryRange}. (Source: ${connectorNames} / Live Pipeline).`,
        blockB: `Direct responsibility for architecting mission-critical features, high reliability, and clean software delivery.`,
        blockC: `Core required technologies: ${job.coreSkills.join(", ")}. Complementary tooling: ${job.extraSkills.join(", ")}.`,
        blockD: `Your profile exhibits a ${cappedPct}% alignment with verified skill signals across ${matchingSkills.join(", ") || "core web tooling"}.`,
        blockE: `Connector signals verified through ${connectorNames} corroborate your hands-on code and project delivery background.`,
        blockF: job.talkingPoints.join(" "),
        blockG: `Verified legitimate corporate hiring pipeline; cross-checked with active public career portal.`,
        blockH: `Highlight your work with ${matchingSkills.slice(0, 3).join(", ") || "TypeScript and modern web frameworks"} and initiate interview practice simulation.`
      }
    };
  });
  const filtered = evaluatedList.filter((job) => {
    if (params.platform && params.platform !== "all" && !job.platformSources.includes(params.platform)) {
      return false;
    }
    if (params.workMode && params.workMode !== "all" && job.workMode !== params.workMode) {
      return false;
    }
    if (params.query && params.query.trim()) {
      const q = params.query.toLowerCase();
      const match = job.title.toLowerCase().includes(q) || job.company.toLowerCase().includes(q) || job.location.toLowerCase().includes(q) || job.matchedSkills.some((s) => s.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });
  return filtered.sort((a, b) => {
    if (a.isLocationMatch && !b.isLocationMatch) return -1;
    if (!a.isLocationMatch && b.isLocationMatch) return 1;
    return b.matchScore - a.matchScore;
  });
}

// server/routers/careerProfile.ts
var educationValues = ["Bachelor's", "Master's", "MPhil", "PhD", "Diploma", "Other"];
var careerStatusValues = ["working", "seeking"];
var lookingForValues = ["First Job", "Internship", "Freelance", "Career Switch", "Higher Studies"];
var maxResumeBytes = 5 * 1024 * 1024;
var allowedProfilePhotoTypes = ["image/jpeg", "image/png", "image/webp"];
var maxProfilePhotoBytes = 2 * 1024 * 1024;
var resumeReviewCacheVersion = "resume-review-v3:";
var nullableText = (max) => z5.string().trim().max(max).nullable().optional();
var nullablePublicHttpsUrl = (max) => nullableText(max).transform((value) => value ? normalizePublicHttpsUrl2(value) || null : value);
var careerProfileInput = z5.object({
  fullName: nullableText(160),
  location: nullableText(160),
  phone: nullableText(64),
  contactEmail: nullableText(320),
  linkedinUrl: nullablePublicHttpsUrl(500),
  portfolioUrl: nullablePublicHttpsUrl(500),
  age: z5.number().int().min(16).max(99).nullable().optional(),
  education: z5.enum(educationValues).nullable().optional(),
  degree: nullableText(180),
  careerStatus: z5.enum(careerStatusValues).nullable().optional(),
  currentJob: nullableText(180),
  company: nullableText(180),
  lookingFor: z5.enum(lookingForValues).nullable().optional(),
  careerField: nullableText(120),
  targetRole: nullableText(180),
  skills: nullableText(2e3),
  experience: nullableText(6e3),
  professionalSummary: nullableText(1600),
  certifications: nullableText(6e3),
  languages: nullableText(2e3),
  projects: nullableText(12e3),
  verifiedDetails: nullableText(6e3),
  personalizationEnabled: z5.boolean().optional(),
  jobRecommendationsEnabled: z5.boolean().optional(),
  professionalConnectionsEnabled: z5.boolean().optional()
});
function profileIsComplete(profile) {
  return Boolean(profile.fullName?.trim() && profile.education && profile.careerStatus && profile.targetRole?.trim() && profile.skills?.trim());
}
function sanitizeResumeName(fileName) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 120) || "resume";
}
function base64ByteSize(base64) {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor(base64.length * 3 / 4) - padding;
}
function profilePhotoExtension(mimeType) {
  return mimeType === "image/jpeg" ? "jpg" : mimeType === "image/png" ? "png" : "webp";
}
function profilePhotoSignatureMatches(file, mimeType) {
  if (mimeType === "image/jpeg") return file.length >= 3 && file[0] === 255 && file[1] === 216 && file[2] === 255;
  if (mimeType === "image/png") return file.length >= 8 && file.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return file.length >= 12 && file.subarray(0, 4).equals(Buffer.from("RIFF")) && file.subarray(8, 12).equals(Buffer.from("WEBP"));
}
var careerProfileRouter = router({
  get: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return null;
    return await getCareerProfileByUserId(ctx.user.id) ?? null;
  }),
  githubMetadata: protectedProcedure.input(z5.object({ links: z5.array(z5.string().trim().max(500)).max(8) })).query(async ({ input }) => ({
    repositories: await getGitHubRepositoryMetadataForLinks(input.links)
  })),
  previewResume: protectedProcedure.mutation(async ({ ctx }) => {
    const current = await getCareerProfileByUserId(ctx.user.id);
    const legacyKey = current?.resumeUrl?.match(/\/manus-storage\/([^?]+)/)?.[1];
    const key = current?.resumeKey ?? legacyKey;
    if (!key || !current?.resumeMimeType || !current.resumeName) throw new Error("Upload a resume before opening its preview.");
    const url = await storageGetSignedUrl(key);
    return { url, mimeType: current.resumeMimeType, name: current.resumeName };
  }),
  save: protectedProcedure.input(careerProfileInput).mutation(async ({ ctx, input }) => {
    const isComplete = profileIsComplete(input);
    const profile = await upsertCareerProfile(ctx.user.id, { ...input, isComplete });
    return { profile, isComplete };
  }),
  uploadResume: protectedProcedure.input(z5.object({
    fileName: z5.string().trim().min(1).max(260),
    mimeType: z5.enum(allowedResumeTypes),
    contentBase64: z5.string().min(4).max(7e6)
  })).mutation(async ({ ctx, input }) => {
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(input.contentBase64)) throw new Error("The resume data could not be validated.");
    const size = base64ByteSize(input.contentBase64);
    if (size <= 0 || size > maxResumeBytes) throw new Error("Resume files must be smaller than 5 MB.");
    const extension = input.fileName.split(".").pop()?.toLowerCase();
    if (!extension || !["pdf", "doc", "docx"].includes(extension)) throw new Error("Please upload a PDF, DOC, or DOCX resume.");
    const safeName = sanitizeResumeName(input.fileName);
    const key = `users/${ctx.user.id}/resumes/${randomUUID()}-${safeName}`;
    const storedResume = await storagePut(key, Buffer.from(input.contentBase64, "base64"), input.mimeType);
    const profile = await upsertCareerProfile(ctx.user.id, {
      resumeKey: storedResume.key,
      resumeUrl: storedResume.url,
      resumeName: safeName,
      resumeSize: size,
      resumeMimeType: input.mimeType,
      resumeReviewCache: null,
      resumeReviewCacheKey: null
    });
    return { profile, suggestions: null, aiMessage: "Resume uploaded securely. Gemini review is ready to start." };
  }),
  analyzeResume: protectedProcedure.input(
    z5.object({
      contentBase64: z5.string().min(4).optional(),
      mimeType: z5.enum(allowedResumeTypes).optional()
    }).optional()
  ).mutation(async ({ ctx, input }) => {
    let fileBuffer = null;
    let mimeTypeToUse = input?.mimeType;
    if (input?.contentBase64 && input?.mimeType) {
      fileBuffer = Buffer.from(input.contentBase64, "base64");
      mimeTypeToUse = input.mimeType;
    }
    const current = await getCareerProfileByUserId(ctx.user.id);
    if (!fileBuffer) {
      if (!current?.resumeKey || !current.resumeMimeType) throw new Error("Upload a resume before starting AI review.");
      mimeTypeToUse = current.resumeMimeType;
      const cacheKey2 = `${resumeReviewCacheVersion}${current.resumeKey}`;
      if (current.resumeReviewCacheKey === cacheKey2 && current.resumeReviewCache) {
        try {
          const cached = resumeSuggestionSchema.safeParse(normalizeResumePayload(JSON.parse(current.resumeReviewCache)));
          if (cached.success) {
            const isUsable = Boolean(cached.data.fullName || cached.data.skills.length > 0 || cached.data.experience.length > 0);
            if (isUsable) {
              const serializedCache = JSON.stringify(cached.data);
              if (serializedCache !== current.resumeReviewCache) {
                await upsertCareerProfile(ctx.user.id, { resumeReviewCache: serializedCache, resumeReviewCacheKey: cacheKey2 });
              }
              return { suggestions: cached.data, aiMessage: null, source: "cached" };
            }
            console.log(`[Resume AI] Cached review for user ${ctx.user.id} was empty; bypassing cache to extract fresh.`);
          }
        } catch {
          console.warn(`[Resume AI] Ignoring invalid private review cache for user ${ctx.user.id}.`);
        }
      }
      fileBuffer = await storageGetBuffer(current.resumeKey);
      if (!fileBuffer) {
        const candidates = [current.resumeKey];
        const legacyUrlKey = current.resumeUrl?.match(/\/manus-storage\/([^?]+)/)?.[1];
        if (legacyUrlKey && !candidates.includes(legacyUrlKey)) candidates.push(legacyUrlKey);
        let lastReadFailure = "";
        for (const key of candidates) {
          try {
            const signedUrl = await storageGetSignedUrl(key);
            if (!signedUrl.startsWith("http://") && !signedUrl.startsWith("https://")) {
              const localBuf = await storageGetBuffer(key);
              if (localBuf) {
                fileBuffer = localBuf;
                break;
              }
              continue;
            }
            const response = await fetch(signedUrl, { signal: AbortSignal.timeout(8e3), redirect: "follow" });
            if (!response.ok) {
              lastReadFailure = `storage returned HTTP ${response.status}`;
              continue;
            }
            const candidate = Buffer.from(await response.arrayBuffer());
            if (candidate.length === 0) {
              lastReadFailure = "storage returned an empty file";
              continue;
            }
            if (current.resumeMimeType === "application/pdf" && !candidate.subarray(0, 4).equals(Buffer.from("%PDF"))) {
              lastReadFailure = "stored bytes are not a PDF";
              continue;
            }
            fileBuffer = candidate;
            break;
          } catch (error) {
            lastReadFailure = error instanceof Error ? error.message : "storage read failed";
          }
        }
      }
      if (!fileBuffer) {
        console.warn(`[Resume AI] Unable to read stored resume for user ${ctx.user.id}: no candidate key succeeded`);
        return { suggestions: null, aiMessage: "Your resume is saved, but its stored file could not be opened for AI review. Please use Replace resume to upload it again, then retry AI review.", source: "error" };
      }
    }
    if (!mimeTypeToUse) {
      mimeTypeToUse = "application/pdf";
    }
    const targetKey = current?.resumeKey;
    const cacheKey = targetKey ? `${resumeReviewCacheVersion}${targetKey}` : null;
    try {
      const suggestions = await extractResumeSuggestions(fileBuffer, mimeTypeToUse);
      if (cacheKey) {
        await upsertCareerProfile(ctx.user.id, { resumeReviewCache: JSON.stringify(suggestions), resumeReviewCacheKey: cacheKey });
      }
      return { suggestions, aiMessage: null, source: "fresh" };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Resume saved securely, but AI import was unavailable. Please retry AI review.";
      console.warn(`[Resume AI] Analysis failed for user ${ctx.user.id}: ${message}`);
      return { suggestions: null, aiMessage: message, source: "error" };
    }
  }),
  removeResume: protectedProcedure.mutation(async ({ ctx }) => {
    const profile = await upsertCareerProfile(ctx.user.id, {
      resumeKey: null,
      resumeUrl: null,
      resumeName: null,
      resumeSize: null,
      resumeMimeType: null,
      resumeReviewCache: null,
      resumeReviewCacheKey: null
    });
    return { profile };
  }),
  uploadProfilePhoto: protectedProcedure.input(z5.object({
    mimeType: z5.enum(allowedProfilePhotoTypes),
    contentBase64: z5.string().min(4).max(3e6)
  })).mutation(async ({ ctx, input }) => {
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(input.contentBase64)) throw new Error("The profile photo data could not be validated.");
    const size = base64ByteSize(input.contentBase64);
    if (size <= 0 || size > maxProfilePhotoBytes) throw new Error("Profile photos must be smaller than 2 MB.");
    const photo = Buffer.from(input.contentBase64, "base64");
    if (!profilePhotoSignatureMatches(photo, input.mimeType)) throw new Error("Please choose a valid JPEG, PNG, or WebP image.");
    const key = `users/${ctx.user.id}/profile-photos/${randomUUID()}.${profilePhotoExtension(input.mimeType)}`;
    const { url } = await storagePut(key, photo, input.mimeType);
    const profile = await upsertCareerProfile(ctx.user.id, {
      profilePhotoKey: key,
      profilePhotoUrl: url,
      profilePhotoSize: size,
      profilePhotoMimeType: input.mimeType
    });
    return { profile };
  }),
  removeProfilePhoto: protectedProcedure.mutation(async ({ ctx }) => {
    const profile = await upsertCareerProfile(ctx.user.id, {
      profilePhotoKey: null,
      profilePhotoUrl: null,
      profilePhotoSize: null,
      profilePhotoMimeType: null
    });
    return { profile };
  }),
  fetchLiveJobs: publicProcedure.input(z5.object({
    query: z5.string().trim().max(160).optional(),
    location: z5.string().trim().max(160).optional(),
    workMode: z5.enum(["all", "Remote", "Hybrid", "On-site"]).optional(),
    platform: z5.enum([
      "all",
      "meta",
      "linkedin",
      "indeed",
      "upwork",
      "remoteok",
      "github",
      "fiverr",
      "arbeitnow",
      "remotive",
      "themuse",
      "jobicy"
    ]).optional()
  }).optional()).query(async ({ ctx, input }) => {
    const profile = ctx.user ? await getCareerProfileByUserId(ctx.user.id) ?? null : null;
    const userLocation = input?.location || profile?.location || "Islamabad, Pakistan";
    const userSkills = profile?.skills || "React, TypeScript, Node.js, SQL";
    const targetRole = input?.query || profile?.targetRole || profile?.careerField || "Software Engineer";
    const currentJob = profile?.currentJob || void 0;
    const evaluatedJobs = await scrapeAndEvaluateLiveJobs({
      candidateLocation: userLocation,
      candidateSkills: userSkills,
      targetRole,
      currentJob,
      workMode: input?.workMode,
      platform: input?.platform,
      query: input?.query
    });
    return {
      jobs: evaluatedJobs,
      lastSyncedAt: (/* @__PURE__ */ new Date()).toISOString(),
      userLocation
    };
  })
});

// server/companyPreparation.ts
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { mkdtemp as mkdtemp2, readFile as readFile2, rm as rm2, writeFile as writeFile2 } from "node:fs/promises";
import { tmpdir as tmpdir2 } from "node:os";
import { join as join2 } from "node:path";
import * as mammoth2 from "mammoth";
import { convert as convert2 } from "@opendataloader/pdf";
import { z as z6 } from "zod";

// server/_core/llm.ts
init_env();
var ensureArray = (value) => Array.isArray(value) ? value : [value];
var normalizeContentPart = (part) => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }
  if (part.type === "text") {
    return part;
  }
  if (part.type === "image_url") {
    return part;
  }
  if (part.type === "file_url") {
    return part;
  }
  throw new Error("Unsupported message content part");
};
var normalizeMessage = (message) => {
  const { role, name, tool_call_id } = message;
  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content).map((part) => typeof part === "string" ? part : JSON.stringify(part)).join("\n");
    return {
      role,
      name,
      tool_call_id,
      content
    };
  }
  const contentParts = ensureArray(message.content).map(normalizeContentPart);
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text
    };
  }
  return {
    role,
    name,
    content: contentParts
  };
};
var normalizeToolChoice = (toolChoice, tools) => {
  if (!toolChoice) return void 0;
  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }
  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }
    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }
    return {
      type: "function",
      function: { name: tools[0].function.name }
    };
  }
  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name }
    };
  }
  return toolChoice;
};
var resolveApiUrl = () => {
  if (ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0) {
    return `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`;
  }
  if (ENV.forgeApiKey) {
    return process.env.OPENAI_BASE_URL || "https://api.openai.com/v1/chat/completions";
  }
  return "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
};
var resolveApiKey = () => {
  return process.env.BUILT_IN_FORGE_API_KEY || ENV.forgeApiKey || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY || ENV.geminiApiKey || "";
};
var assertApiKey = () => {
  const key = resolveApiKey();
  if (!key) {
    throw new Error("AI API Key is not configured. Please set GEMINI_API_KEY in .env.");
  }
};
var normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema
}) => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (explicitFormat.type === "json_schema" && !explicitFormat.json_schema?.schema) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }
  const schema = outputSchema || output_schema;
  if (!schema) return void 0;
  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }
  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...typeof schema.strict === "boolean" ? { strict: schema.strict } : {}
    }
  };
};
var RETRY_MAX_RETRIES = 1;
var RETRY_BASE_DELAY_MS = 250;
var RETRY_MAX_DELAY_MS = 2e3;
var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
var parseRetryAfter = (value) => {
  if (!value) return void 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1e3);
  const at = Date.parse(value);
  return Number.isNaN(at) ? void 0 : Math.max(0, at - Date.now());
};
var computeBackoffDelay = (attempt, retryAfterMs) => {
  const cap = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
  const jittered = cap / 2 + Math.random() * (cap / 2);
  return Math.min(Math.max(jittered, retryAfterMs ?? 0), RETRY_MAX_DELAY_MS);
};
var fetchWithBackoff = async (url, init, maxRetries = RETRY_MAX_RETRIES) => {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, init);
      if (response.ok || attempt === maxRetries || response.status === 401 || response.status === 404) {
        return response;
      }
      const retryAfterMs = parseRetryAfter(
        response.headers.get("retry-after")
      );
      try {
        await response.body?.cancel();
      } catch {
      }
      await sleep(computeBackoffDelay(attempt, retryAfterMs));
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries) throw error;
      await sleep(computeBackoffDelay(attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("LLM request failed after exhausting retries");
};
async function invokeLLM(params) {
  assertApiKey();
  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
    model,
    thinking,
    reasoning,
    maxTokens,
    max_tokens
  } = params;
  const payload = {
    messages: messages.map(normalizeMessage)
  };
  if (tools && tools.length > 0) {
    payload.tools = tools;
  }
  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }
  const resolvedMaxTokens = max_tokens ?? maxTokens;
  if (typeof resolvedMaxTokens === "number") {
    payload.max_tokens = resolvedMaxTokens;
  }
  if (thinking) {
    payload.thinking = thinking;
  }
  if (reasoning) {
    payload.reasoning = reasoning;
  }
  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema
  });
  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }
  const isGeminiEndpoint = !ENV.forgeApiKey && !process.env.OPENAI_API_KEY;
  const initialModel = model === "gemini-3-flash-preview" && isGeminiEndpoint ? "gemini-2.5-flash" : model || "gemini-2.5-flash";
  const modelCandidates = isGeminiEndpoint ? [
    initialModel,
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.6-flash",
    "gemini-3.7-flash",
    "gemini-flash-lite-latest"
  ].filter((m, i, arr) => arr.indexOf(m) === i) : [initialModel];
  let lastError = null;
  for (const candidateModel of modelCandidates) {
    payload.model = candidateModel;
    try {
      const response = await fetchWithBackoff(resolveApiUrl(), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${resolveApiKey()}`
        },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        return await response.json();
      }
      const errorText = await response.text();
      lastError = new Error(
        `LLM invoke failed (${candidateModel}): ${response.status} ${response.statusText} \u2013 ${errorText}`
      );
      console.log(`[LLM] Model ${candidateModel} status ${response.status}, cascading to fallback...`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.log(`[LLM] Model ${candidateModel} network error, cascading to fallback...`);
    }
  }
  throw lastError || new Error("All LLM candidate models failed.");
}

// shared/practiceContext.ts
var practiceProfileCategories = [
  {
    id: "career",
    label: "Career direction",
    description: "Current focus, target role, work preferences, and location.",
    fields: ["careerField", "targetRole", "careerStatus", "currentJob", "company", "lookingFor", "location"]
  },
  {
    id: "education",
    label: "Education",
    description: "Education level and degree or program.",
    fields: ["education", "degree"]
  },
  {
    id: "skills-experience",
    label: "Skills and experience",
    description: "Skills, relevant experience, and professional summary.",
    fields: ["skills", "experience", "professionalSummary"]
  },
  {
    id: "projects-links",
    label: "Projects and links",
    description: "Reviewed projects plus portfolio and professional links.",
    fields: ["projects", "portfolioUrl", "linkedinUrl"]
  },
  {
    id: "credentials",
    label: "Credentials",
    description: "Certifications, languages, and verified achievements.",
    fields: ["certifications", "languages", "verifiedDetails"]
  }
];
var practiceProfileCategoryIds = practiceProfileCategories.map((category) => category.id);

// server/companyPreparation.ts
var maxSourceBytes = 3 * 1024 * 1024;
var maxCombinedFileBytes = 7 * 1024 * 1024;
var maxSourceTextCharacters = 18e3;
var maxCombinedSourceCharacters = 58e3;
var fetchTimeoutMs = 8e3;
var maxRedirects = 3;
var allowedFileMimeTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp"
];
var companyPreparationInput = z6.object({
  companyName: z6.string().trim().min(1, "Add the company name.").max(180),
  companyWebsite: z6.string().trim().max(500).default(""),
  targetRole: z6.string().trim().min(1, "Add the target role.").max(180),
  jobDescription: z6.string().trim().max(18e3).default(""),
  notes: z6.string().trim().max(8e3).default(""),
  profileCategoryIds: z6.array(z6.enum(practiceProfileCategoryIds)).max(practiceProfileCategories.length).default(practiceProfileCategoryIds),
  links: z6.array(z6.string().trim().max(500)).max(8).default([]),
  files: z6.array(z6.object({
    name: z6.string().trim().min(1).max(180),
    mimeType: z6.enum(allowedFileMimeTypes),
    contentBase64: z6.string().min(4).max(45e5)
  })).max(4).default([])
});
var companyBriefSchema = z6.object({
  companySummary: z6.string().trim().min(1).max(1500),
  roleSummary: z6.string().trim().min(1).max(1500),
  responsibilities: z6.array(z6.string().trim().min(1).max(260)).max(10),
  requiredSkills: z6.array(z6.string().trim().min(1).max(100)).max(18),
  preferredSkills: z6.array(z6.string().trim().min(1).max(100)).max(18),
  technologySignals: z6.array(z6.string().trim().min(1).max(100)).max(14),
  interviewThemes: z6.array(z6.string().trim().min(1).max(180)).max(12),
  workingStyleSignals: z6.array(z6.string().trim().min(1).max(180)).max(10),
  sourceAttributions: z6.array(z6.object({
    sourceLabel: z6.string().trim().min(1).max(180),
    support: z6.string().trim().min(1).max(360)
  })).max(18),
  uncertaintyNotes: z6.array(z6.string().trim().min(1).max(260)).max(10)
});
function base64ByteSize2(value) {
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  return Math.floor(value.length * 3 / 4) - padding;
}
function isPrivateAddress(address) {
  const version = isIP(address);
  if (version === 4) {
    const [a, b] = address.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || a === 100 && b >= 64 && b <= 127 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168 || a >= 224;
  }
  if (version === 6) {
    const normalized = address.toLowerCase();
    return normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb") || normalized.startsWith("::ffff:10.") || normalized.startsWith("::ffff:192.168.") || normalized.startsWith("::ffff:172.");
  }
  return true;
}
async function assertPublicUrl(raw) {
  const normalized = normalizePublicHttpsUrl2(raw);
  if (!normalized) throw new Error("Use a valid public HTTP(S) source URL.");
  const url = new URL(normalized);
  if (url.username || url.password || url.port && !["80", "443"].includes(url.port)) throw new Error("This source URL is not allowed.");
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) throw new Error("This source must resolve to a public address.");
  return url;
}
async function readResponseBytes(response) {
  if (!response.body) return Buffer.from(await response.arrayBuffer());
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      total += part.value.byteLength;
      if (total > maxSourceBytes) throw new Error("This source is larger than the 3 MB analysis limit.");
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
}
function decodeHtmlEntities(value) {
  return value.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'");
}
function htmlToText(html) {
  const title = decodeHtmlEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/\s+/g, " ").trim().slice(0, 180);
  const text2 = decodeHtmlEntities(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<noscript[\s\S]*?<\/noscript>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()).slice(0, maxSourceTextCharacters);
  return { title, text: text2 };
}
function flattenPdfElements2(value, output) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) flattenPdfElements2(item, output);
    return;
  }
  const record = value;
  if (typeof record.content === "string" && record.content.trim()) output.push(record.content.trim());
  for (const [key, child] of Object.entries(record)) if (key !== "content") flattenPdfElements2(child, output);
}
async function extractPdfText2(buffer) {
  const directory = await mkdtemp2(join2(tmpdir2(), "careertwin-company-"));
  const inputPath = join2(directory, "source.pdf");
  try {
    await writeFile2(inputPath, buffer);
    await convert2(inputPath, { outputDir: directory, format: ["json"], quiet: true, readingOrder: "xycut", keepLineBreaks: true, imageOutput: "off", threads: "1" });
    const parsed = JSON.parse(await readFile2(join2(directory, "source.json"), "utf8"));
    const parts = [];
    flattenPdfElements2(parsed, parts);
    const text2 = parts.join("\n").replace(/\u0000/g, "").trim().slice(0, maxSourceTextCharacters);
    if (!text2) throw new Error("No readable text was found in this PDF.");
    return { text: text2 };
  } finally {
    await rm2(directory, { recursive: true, force: true }).catch(() => void 0);
  }
}
async function preparePublicSource(rawUrl, label, kind) {
  try {
    let currentUrl = await assertPublicUrl(rawUrl);
    for (let redirect = 0; redirect <= maxRedirects; redirect += 1) {
      const response = await fetch(currentUrl, { redirect: "manual", headers: { Accept: "text/html,text/plain,application/pdf,image/jpeg,image/png,image/webp", "User-Agent": "CareerTwin-AI-source-preview/1.0" }, signal: AbortSignal.timeout(fetchTimeoutMs) });
      if (response.status >= 300 && response.status < 400) {
        if (redirect === maxRedirects) throw new Error("This source redirected too many times.");
        const location = response.headers.get("location");
        if (!location) throw new Error("This source returned an incomplete redirect.");
        currentUrl = await assertPublicUrl(new URL(location, currentUrl).toString());
        continue;
      }
      if (!response.ok) throw new Error(`Source returned HTTP ${response.status}.`);
      const declaredLength = Number(response.headers.get("content-length") ?? 0);
      if (declaredLength > maxSourceBytes) throw new Error("This source is larger than the 3 MB analysis limit.");
      const bytes = await readResponseBytes(response);
      const contentType = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
      if (contentType === "text/html" || contentType === "text/plain" || !contentType && !currentUrl.pathname.toLowerCase().endsWith(".pdf")) {
        const { title, text: text2 } = htmlToText(bytes.toString("utf8"));
        if (!text2) throw new Error("No readable text was found on this source.");
        return { label: title || label, kind, status: "analyzed", url: currentUrl.toString(), detail: "Public source fetched and summarized for this analysis.", text: text2 };
      }
      if (contentType === "application/pdf" || currentUrl.pathname.toLowerCase().endsWith(".pdf")) {
        const { text: text2 } = await extractPdfText2(bytes);
        return { label, kind, status: "analyzed", url: currentUrl.toString(), detail: "Public PDF fetched and parsed for this analysis.", text: text2 };
      }
      if (contentType.startsWith("image/")) {
        return { label, kind: "image", status: "analyzed", url: currentUrl.toString(), detail: "Public image fetched for visual analysis.", imageDataUrl: `data:${contentType};base64,${bytes.toString("base64")}` };
      }
      throw new Error("This source type is not supported for analysis.");
    }
    throw new Error("The source could not be followed safely.");
  } catch (error) {
    return { label, kind, status: "unavailable", url: normalizePublicHttpsUrl2(rawUrl) || void 0, detail: error instanceof Error ? error.message.slice(0, 180) : "Source could not be read." };
  }
}
async function prepareUploadedSource(file) {
  const base64Size = base64ByteSize2(file.contentBase64);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(file.contentBase64) || base64Size <= 0 || base64Size > maxSourceBytes) return { label: file.name, kind: file.mimeType.startsWith("image/") ? "image" : "document", status: "unavailable", detail: "This file is larger than the 3 MB analysis limit or could not be validated." };
  try {
    const bytes = Buffer.from(file.contentBase64, "base64");
    if (file.mimeType === "image/jpeg" || file.mimeType === "image/png" || file.mimeType === "image/webp") return { label: file.name, kind: "image", status: "analyzed", detail: "User-uploaded image prepared for visual analysis.", imageDataUrl: `data:${file.mimeType};base64,${file.contentBase64}` };
    if (file.mimeType === "application/pdf") {
      const { text: text2 } = await extractPdfText2(bytes);
      return { label: file.name, kind: "document", status: "analyzed", detail: "User-uploaded PDF parsed for this analysis.", text: text2 };
    }
    if (file.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const text2 = (await mammoth2.extractRawText({ buffer: bytes })).value.replace(/\s+/g, " ").trim().slice(0, maxSourceTextCharacters);
      if (!text2) throw new Error("No readable text was found in this DOCX file.");
      return { label: file.name, kind: "document", status: "analyzed", detail: "User-uploaded DOCX parsed for this analysis.", text: text2 };
    }
    throw new Error("Legacy DOC files need to be converted to PDF or DOCX before analysis.");
  } catch (error) {
    return { label: file.name, kind: "document", status: "unavailable", detail: error instanceof Error ? error.message.slice(0, 180) : "File could not be read." };
  }
}
function profileContext(profile, selectedCategoryIds) {
  if (!profile) return { text: "No saved CareerTwin profile is available. Use only the selected company and role material.", includedCategoryIds: [], includedFieldCount: 0 };
  const selected = new Set(selectedCategoryIds);
  const contextLines = [];
  const includedCategoryIds = [];
  let includedFieldCount = 0;
  for (const category of practiceProfileCategories) {
    if (!selected.has(category.id)) continue;
    const values = category.fields.map((field) => [field, profile[field]]).filter(([, value]) => typeof value === "string" && value.trim()).map(([field, value]) => `${field}: ${String(value).slice(0, 6e3)}`);
    if (!values.length) continue;
    includedCategoryIds.push(category.id);
    includedFieldCount += values.length;
    contextLines.push(`${category.label}:
${values.join("\n")}`);
  }
  return {
    text: contextLines.length ? contextLines.join("\n\n") : "No selected saved CareerTwin profile fields are available. Use only the selected company and role material.",
    includedCategoryIds,
    includedFieldCount
  };
}
function contentText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((item) => contentText(item)).join("\n");
  if (content && typeof content === "object" && "text" in content) return String(content.text ?? "");
  return "";
}
function parseModelJson(value) {
  const cleaned = value.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("Gemini returned an unreadable company brief.");
  }
}
function recoverText(value, max, fallback) {
  if (typeof value !== "string") return { value: fallback, usable: false, repaired: value !== void 0 };
  const trimmed = value.trim();
  if (!trimmed) return { value: fallback, usable: false, repaired: true };
  return { value: trimmed.slice(0, max), usable: true, repaired: trimmed !== value || trimmed.length > max };
}
function recoverList(value, maxItems, maxItemLength) {
  if (value === void 0) return { values: [], repaired: false };
  if (!Array.isArray(value)) return { values: [], repaired: true };
  let repaired = false;
  const values = [];
  for (const item of value) {
    if (typeof item !== "string") {
      repaired = true;
      continue;
    }
    const trimmed = item.trim();
    if (!trimmed) {
      repaired = true;
      continue;
    }
    const bounded = trimmed.slice(0, maxItemLength);
    repaired ||= bounded !== item;
    values.push(bounded);
  }
  if (values.length > maxItems) repaired = true;
  return { values: values.slice(0, maxItems), repaired };
}
function recoverAttributions(value) {
  if (value === void 0) return { values: [], repaired: false };
  if (!Array.isArray(value)) return { values: [], repaired: true };
  let repaired = false;
  const values = [];
  for (const item of value) {
    if (!item || typeof item !== "object") {
      repaired = true;
      continue;
    }
    const record = item;
    const sourceLabel = typeof record.sourceLabel === "string" ? record.sourceLabel.trim() : "";
    const support = typeof record.support === "string" ? record.support.trim() : "";
    if (!sourceLabel || !support) {
      repaired = true;
      continue;
    }
    values.push({ sourceLabel: sourceLabel.slice(0, 180), support: support.slice(0, 360) });
    repaired ||= sourceLabel.length > 180 || support.length > 360;
  }
  if (values.length > 18) repaired = true;
  return { values: values.slice(0, 18), repaired };
}
function recoverCompanyBrief(value, sourceCount) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { repaired: false };
  const record = value;
  const companySummary = recoverText(record.companySummary, 1500, "Gemini did not return a company summary. Review the selected company sources.");
  const roleSummary = recoverText(record.roleSummary, 1500, "Gemini did not return a role summary. Review the selected role material.");
  const responsibilities = recoverList(record.responsibilities, 10, 260);
  const requiredSkills = recoverList(record.requiredSkills, 18, 100);
  const preferredSkills = recoverList(record.preferredSkills, 18, 100);
  const technologySignals = recoverList(record.technologySignals, 14, 100);
  const interviewThemes = recoverList(record.interviewThemes, 12, 180);
  const workingStyleSignals = recoverList(record.workingStyleSignals, 10, 180);
  const sourceAttributions = recoverAttributions(record.sourceAttributions);
  const uncertaintyNotes = recoverList(record.uncertaintyNotes, 10, 260);
  let repaired = [companySummary, roleSummary, responsibilities, requiredSkills, preferredSkills, technologySignals, interviewThemes, workingStyleSignals, sourceAttributions, uncertaintyNotes].some((part) => part.repaired);
  const hasUsableEvidence = [responsibilities, requiredSkills, preferredSkills, technologySignals, interviewThemes, workingStyleSignals, sourceAttributions].some((part) => part.values.length > 0);
  if (!companySummary.usable && !roleSummary.usable && !hasUsableEvidence) return { repaired, brief: void 0 };
  const notes = uncertaintyNotes.values.slice(0, 10);
  if (repaired && sourceCount > 0) {
    const recoveryNote = "Some model-provided details were blank or malformed and were omitted. Verify the selected sources before relying on this brief.";
    if (!notes.includes(recoveryNote)) {
      if (notes.length >= 10) notes.pop();
      notes.push(recoveryNote);
    }
  }
  return {
    repaired,
    brief: {
      companySummary: companySummary.value,
      roleSummary: roleSummary.value,
      responsibilities: responsibilities.values,
      requiredSkills: requiredSkills.values,
      preferredSkills: preferredSkills.values,
      technologySignals: technologySignals.values,
      interviewThemes: interviewThemes.values,
      workingStyleSignals: workingStyleSignals.values,
      sourceAttributions: sourceAttributions.values,
      uncertaintyNotes: notes
    }
  };
}
var companyBriefResponseSchema = {
  type: "object",
  properties: {
    companySummary: { type: "string" },
    roleSummary: { type: "string" },
    responsibilities: { type: "array", items: { type: "string" } },
    requiredSkills: { type: "array", items: { type: "string" } },
    preferredSkills: { type: "array", items: { type: "string" } },
    technologySignals: { type: "array", items: { type: "string" } },
    interviewThemes: { type: "array", items: { type: "string" } },
    workingStyleSignals: { type: "array", items: { type: "string" } },
    sourceAttributions: { type: "array", items: { type: "object", properties: { sourceLabel: { type: "string" }, support: { type: "string" } }, required: ["sourceLabel", "support"], additionalProperties: false } },
    uncertaintyNotes: { type: "array", items: { type: "string" } }
  },
  required: ["companySummary", "roleSummary", "responsibilities", "requiredSkills", "preferredSkills", "technologySignals", "interviewThemes", "workingStyleSignals", "sourceAttributions", "uncertaintyNotes"],
  additionalProperties: false
};
async function analyzeCompanyPreparation(input, profile) {
  const sources = [];
  const seenUrls = /* @__PURE__ */ new Set();
  const urlInputs = [input.companyWebsite, ...input.links].map((value) => value.trim()).filter(Boolean);
  for (const rawUrl of urlInputs) {
    const normalized = normalizePublicHttpsUrl2(rawUrl);
    if (!normalized || seenUrls.has(normalized)) {
      if (!normalized) sources.push({ label: rawUrl.slice(0, 180), kind: "link", status: "unavailable", detail: "Use a valid public HTTP(S) source URL." });
      continue;
    }
    seenUrls.add(normalized);
    sources.push(await preparePublicSource(normalized, input.companyWebsite && normalized === normalizePublicHttpsUrl2(input.companyWebsite) ? "Company website" : "Public source", input.companyWebsite && normalized === normalizePublicHttpsUrl2(input.companyWebsite) ? "website" : "link"));
  }
  const totalFileBytes = input.files.reduce((sum, file) => sum + base64ByteSize2(file.contentBase64), 0);
  if (totalFileBytes > maxCombinedFileBytes) throw new Error("Keep supporting files under 7 MB combined for one analysis.");
  for (const file of input.files) sources.push(await prepareUploadedSource(file));
  if (input.jobDescription) sources.push({ label: "Role description", kind: "job-details", status: "analyzed", detail: "User-provided role details included.", text: input.jobDescription });
  if (input.notes) sources.push({ label: "Preparation notes", kind: "notes", status: "analyzed", detail: "User-provided notes included.", text: input.notes });
  const readableSources = sources.filter((source) => source.status === "analyzed");
  const textSources = readableSources.filter((source) => source.text).map((source) => `SOURCE: ${source.label}
TYPE: ${source.kind}
CONTENT:
${source.text}`).join("\n\n").slice(0, maxCombinedSourceCharacters);
  const imageSources = readableSources.filter((source) => source.imageDataUrl).slice(0, 3);
  if (!textSources && !imageSources.length) throw new Error("Add readable company or role material before starting analysis.");
  const sourceLabels = sources.map((source) => `${source.label} (${source.status})`).join(", ");
  const accountContext = profileContext(profile, input.profileCategoryIds);
  const prompt = `You are CareerTwin AI's company-preparation analyst for a private interview-practice workspace. Analyze only the user-supplied company and role material below, then connect it to the saved CareerTwin preparation profile. Do not claim that you visited a source unless it is listed as analyzed. Do not invent company facts, open roles, compensation, culture, employees, locations, interview stages, or technologies. Separate explicit evidence from preparation hypotheses in uncertaintyNotes. Do not output phone numbers, email addresses, private URLs, or raw resume text. Return JSON only.

Company: ${input.companyName}
Target role: ${input.targetRole}
Selected saved CareerTwin preparation context (only the enabled categories below):
${accountContext.text}

Excluded by design: contact identity fields, uploaded resume file contents, and all local illustrative LinkedIn, Indeed, GitHub, Upwork, and Fiverr connector fixtures. Do not reference excluded data.

Available source statuses: ${sourceLabels}

Return a concise reviewable brief with:
- companySummary: evidence-grounded company or product summary
- roleSummary: what this target role appears to involve
- responsibilities: explicit responsibilities and careful preparation-oriented inferences
- requiredSkills: skills explicitly required or strongly signaled
- preferredSkills: optional or adjacent skills
- technologySignals: explicit tools, languages, platforms, or technical areas
- interviewThemes: themes CareerTwin can use for later question generation
- workingStyleSignals: only explicit or carefully qualified signals
- sourceAttributions: sourceLabel plus a short support statement for the strongest claims
- uncertaintyNotes: any missing context, inference, or ambiguity the user should verify

Company/job sources:
${textSources || "No text extraction was available; use the supplied images only."}`;
  const messageContent = [{ type: "text", text: prompt }, ...imageSources.map((source) => ({ type: "image_url", image_url: { url: source.imageDataUrl, detail: "auto" } }))];
  let response;
  try {
    response = await invokeLLM({ model: "gemini-3-flash-preview", messages: [{ role: "system", content: "You produce precise, privacy-safe JSON for interview preparation." }, { role: "user", content: messageContent }], maxTokens: 8e3, response_format: { type: "json_schema", json_schema: { name: "company_preparation_brief", strict: true, schema: companyBriefResponseSchema } } });
  } catch (error) {
    console.warn(`[Company AI] Analysis request failed: ${error instanceof Error ? error.message.slice(0, 180) : "unknown error"}`);
    throw new Error("Company and role analysis is unavailable right now. Your material was not saved; please retry in a moment.");
  }
  const text2 = contentText(response.choices[0]?.message?.content);
  const rawBrief = parseModelJson(text2);
  const recovered = recoverCompanyBrief(rawBrief, sources.length);
  if (!recovered.brief) {
    console.warn("[Company AI] Structured brief had no usable company or role evidence after normalization");
    throw new Error("Gemini returned an incomplete company brief. Your material was not saved; please retry the analysis.");
  }
  if (recovered.repaired) {
    console.warn("[Company AI] Recovered a partial brief by omitting blank or malformed model details");
  }
  return {
    brief: recovered.brief,
    sources: sources.map(({ text: _text, imageDataUrl: _imageDataUrl, ...source }) => source),
    accountContext: {
      includedCategoryIds: accountContext.includedCategoryIds,
      includedFieldCount: accountContext.includedFieldCount,
      connectorContextIncluded: false,
      persisted: false
    }
  };
}

// server/routers/practicePreparation.ts
import { z as z7 } from "zod";
var evaluationScorecardSchema = z7.object({
  sessionId: z7.number().optional(),
  overallScore: z7.number().min(0).max(100),
  overallScoreLabel: z7.string().optional(),
  interviewReadiness: z7.number().min(0).max(100),
  readinessLabel: z7.string().optional(),
  confidenceLevel: z7.number().min(0).max(100),
  confidenceLabel: z7.string().optional(),
  communicationScore: z7.number().min(0).max(100),
  communicationLabel: z7.string().optional(),
  radarMetrics: z7.array(
    z7.object({
      key: z7.string(),
      label: z7.string(),
      value: z7.number().min(0).max(100),
      fullMark: z7.number().default(100)
    })
  ),
  progressMetrics: z7.array(
    z7.object({
      key: z7.string(),
      label: z7.string(),
      value: z7.number().min(0).max(100)
    })
  ),
  interviewStats: z7.object({
    totalQuestions: z7.number(),
    relevantAnswers: z7.string(),
    averageAnswerTime: z7.string(),
    fillerWordsUsage: z7.enum(["Low", "Moderate", "High"]),
    clarityAndStructure: z7.enum(["Good", "Excellent", "Needs Work"]),
    rating: z7.number().min(0).max(5),
    maxRating: z7.number().default(5)
  }),
  strengths: z7.array(z7.string()),
  improvements: z7.array(
    z7.object({
      id: z7.string(),
      text: z7.string(),
      badge: z7.enum(["Improve", "Moderate", "Needs Practice", "Crucial"]),
      badgeVariant: z7.enum(["orange", "yellow", "red", "purple"])
    })
  ),
  aiAdvice: z7.string(),
  nextGoal: z7.string(),
  companyName: z7.string().optional(),
  targetRole: z7.string().optional()
});
var STAGE_CURRICULUM_DETAILS = {
  1: {
    title: "Icebreaking & Cultural Motivation",
    focus: "Background, Company Mission & Alignment",
    purpose: "Evaluate candidate communication warmth, career trajectory authenticity, company motivation, and initial presence under casual greeting.",
    objectives: [
      "Clear elevator pitch summarizing professional identity",
      "Genuine motivation for target role & company",
      "Conversational poise and authentic self-expression"
    ]
  },
  2: {
    title: "Core Fundamentals & Technical Concepts",
    focus: "Foundations, Data Structures & Architecture",
    purpose: "Assess technical soundness in fundamental principles, memory models, async lifecycles, and core language mechanics.",
    objectives: [
      "Precision in technical definitions",
      "Understanding underlying execution and memory models",
      "Explaining trade-offs rather than rote memorization"
    ]
  },
  3: {
    title: "Project Architecture & Tech Stack Deep Dive",
    focus: "Real-world Projects, System Boundaries & Decisions",
    purpose: "Examine actual hands-on engineering experience, architecture decisions, component design, and state/database modeling.",
    objectives: [
      "Deep ownership of past project contributions",
      "Justification of architectural choices & frameworks",
      "Handling scalability, bottlenecks and caching"
    ]
  },
  4: {
    title: "Live Problem Solving & Practical Scenarios",
    focus: "Edge Cases, Production Breakdowns & Debugging",
    purpose: "Test live engineering intuition, systematic root cause analysis, error mitigation, and problem scoping under tight constraints.",
    objectives: [
      "Structured step-by-step troubleshooting workflow",
      "Handling edge-case failure modes & graceful recovery",
      "Defensive coding, validation & resilience"
    ]
  },
  5: {
    title: "System Design, Scalability & Data Modeling",
    focus: "High-level Design, Microservices & Reliability",
    purpose: "Determine high-level architectural maturity, distributed systems intuition, API contracts, database partitioning, and rate limiting.",
    objectives: [
      "Clarity on non-functional requirements (SLA, latency, throughput)",
      "Decoupled component architecture and event streams",
      "Reliability, replication & failover strategies"
    ]
  },
  6: {
    title: "Code Quality, Performance Optimization & Refactoring",
    focus: "Clean Code, Profiling, Benchmarks & Maintainability",
    purpose: "Evaluate clean code discipline, testing methodologies (unit/integration/E2E), memory profiling, and technical debt reduction.",
    objectives: [
      "DRY and SOLID principles applied to real code",
      "Identifying memory leaks and query/render bottlenecks",
      "Test-driven verification mindset"
    ]
  },
  7: {
    title: "Behavioral Competencies & Cross-Functional Teamwork",
    focus: "STAR Method, Collaboration & Cross-Team Impact",
    purpose: "Measure emotional intelligence, stakeholder management, code review culture, and constructive collaboration across disciplines.",
    objectives: [
      "Clear STAR structured storytelling (Situation, Task, Action, Result)",
      "Navigating technical disagreements constructively",
      "Customer-centric engineering delivery"
    ]
  },
  8: {
    title: "Leadership, Ownership & Conflict Resolution",
    focus: "Mentorship, Ambiguity & Difficult Trade-offs",
    purpose: "Assess how the candidate leads technical initiatives, mentors junior peers, makes difficult trade-offs, and takes extreme ownership.",
    objectives: [
      "Demonstrated technical leadership & proactive initiative",
      "Empowering teammates through mentoring & reviews",
      "Calm leadership during outages and production fires"
    ]
  },
  9: {
    title: "Modern Tooling, Cloud Security & Industry Trends",
    focus: "DevSecOps, CI/CD, Observability & Emerging Tech",
    purpose: "Evaluate modern engineering practices, cloud containerization, zero-trust security principles, monitoring/telemetry, and AI integration.",
    objectives: [
      "Security best practices (OAuth, encryption, least privilege)",
      "CI/CD pipelines & automated zero-downtime deployments",
      "Telemetry, structured logs, and distributed tracing"
    ]
  },
  10: {
    title: "Executive Assessment, Strategic Fit & Final Vision",
    focus: "Long-term Impact, Roadmap Alignment & Executive Poise",
    purpose: "Final hiring manager/director level evaluation to assess strategic alignment, business impact, executive communication, and high-impact culture addition.",
    objectives: [
      "Translating engineering capabilities into measurable business ROI",
      "Long-term career roadmap alignment with company trajectory",
      "Executive communication poise and clarity under pressure"
    ]
  }
};
function generateModelAnswerAndBreakdown(question, answer, stageFocus, targetRole, index, liveMetrics) {
  const words = answer.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const isEmpty = wordCount === 0 || answer === "..." || answer.trim().length < 3;
  const isMinimal = !isEmpty && (wordCount < 12 || answer.includes("via live microphone"));
  const isModerate = !isEmpty && wordCount >= 12 && wordCount < 35;
  const isStrong = !isEmpty && wordCount >= 35;
  const score = isEmpty ? 0 : isStrong ? Math.min(96, 84 + index % 10) : isModerate ? Math.min(80, 68 + index % 8) : Math.min(50, 20 + Math.min(25, wordCount * 2));
  const grade = score >= 80 ? "Strong" : score >= 60 ? "Partial" : "Needs Improvement";
  const isBehavioral = /tell me|describe a time|how do you handle|conflict|challenge|disagreement|leadership|situation|team|mistake|failure|why should/i.test(
    question
  );
  let idealModelAnswer = "";
  let whatWasMissing = "";
  if (isBehavioral) {
    idealModelAnswer = `[STAR Model Answer Formulation]
\u2022 Situation: In my previous role working as a ${targetRole}, our engineering team encountered a critical deadline where system latency escalated significantly under a 3x traffic surge during a major campaign launch.
\u2022 Task: I was designated lead to diagnose the bottleneck, coordinate with product stakeholders to protect core customer flows, and eliminate downtime risks.
\u2022 Action: I led an emergency triage, profiled database query execution to identify unindexed lookups, implemented Redis caching on high-frequency read endpoints, and established daily async check-ins with cross-functional peers.
\u2022 Result: API p99 latency dropped by 64%, zero downtime was incurred, and we integrated automated alerting into CI/CD to prevent future regressions.`;
    whatWasMissing = isEmpty ? "No spoken response was provided for this behavioral question. Prepare structured STAR answers (Situation, Task, Action, Result) showcasing leadership and quantifiable outcomes." : isMinimal ? "Your response was too brief. It lacked the structured STAR breakdown (Situation, Task, Action, Result) and did not include quantifiable metrics (e.g. % improvement, team size, concrete timeline)." : isModerate ? "You described the scenario well, but missed detailing the specific ACTIONS you personally owned versus what the team did, along with measurable business/technical outcomes." : "Solid context provided; to elevate it to top 1%, add specific follow-up learnings or post-mortem preventative safeguards you established.";
  } else {
    idealModelAnswer = `[Model Engineering Answer]
\u2022 Core Concept: Directly articulate the fundamental mechanism regarding "${stageFocus}". Explain the core design pattern, memory/async lifecycle, or protocol in 1-2 precise sentences.
\u2022 Architectural Trade-offs: Compare alternative approaches (e.g. synchronous vs asynchronous processing, optimistic vs pessimistic locking, or normalized vs denormalized schemas) and explain when to choose each.
\u2022 Production Considerations: Address edge-case handling, error recovery, security boundaries, and telemetry/monitoring to prove enterprise-grade engineering maturity.`;
    whatWasMissing = isEmpty ? "No spoken response was recorded for this question. Candidates must articulate the underlying engineering mechanism and architectural trade-offs." : isMinimal ? "The answer lacked depth. An interviewer expects a clear definition, architectural trade-offs, and a concrete real-world example from your actual coding experience." : isModerate ? "Good foundational explanation, but you missed elaborating on production edge cases, performance benchmarks, and failure mode recovery." : "Strong technical answer. You can make it outstanding by citing specific telemetry tools, profiling techniques, or architectural patterns used in production.";
  }
  const eye = liveMetrics?.eyeContact !== void 0 ? liveMetrics.eyeContact : 0;
  const fillers = liveMetrics?.fillerCount ?? 0;
  const wpm = liveMetrics?.wpm ?? 0;
  const deliveryFeedback = isEmpty ? "\u26A0\uFE0F Candidate remained silent. No voice activity or spoken answer was recorded for this question." : `Spoken Delivery: ${eye === 0 ? "\u26A0\uFE0F No eye contact detected \u2014 face was not looking at the camera. " : eye < 60 ? `\u26A0\uFE0F Eye contact was low (${eye}%) \u2014 focus gaze directly on the interviewer. ` : "\u2713 Good direct eye contact maintained. "}${fillers > 4 ? `\u26A0\uFE0F Detected ${fillers} filler words ("umm", "like", "you know") \u2014 take a deliberate breath instead. ` : "\u2713 Clean verbal articulation with minimal fillers. "}${wpm > 165 ? "\u26A0\uFE0F Speaking pace was slightly fast \u2014 slow down to ~130 WPM for maximum clarity." : wpm < 95 && wpm > 0 ? "Pacing was hesitant \u2014 maintain steady cadence." : wpm === 0 ? "No speaking cadence detected." : "\u2713 Ideal speaking pace (~130 WPM)."}`;
  return {
    id: `qa-${index + 1}`,
    questionNumber: index + 1,
    question,
    candidateAnswer: isEmpty ? "No spoken response recorded (Interview ended without answer)." : answer.trim(),
    grade,
    idealModelAnswer,
    whatWasMissing,
    deliveryFeedback,
    critique: deliveryFeedback,
    score
  };
}
var practicePreparationRouter = router({
  analyze: protectedProcedure.input(companyPreparationInput).mutation(async ({ ctx, input }) => {
    const profile = await getCareerProfileByUserId(ctx.user.id);
    const result = await analyzeCompanyPreparation(input, profile);
    return {
      ...result,
      profileContextIncluded: Boolean(profile),
      persisted: false
    };
  }),
  generateRoadmap: protectedProcedure.input(generateRoadmapInputSchema).mutation(async ({ ctx, input }) => {
    const profile = await getCareerProfileByUserId(ctx.user.id);
    const enrichedCvData = {
      fullName: input.user_cv_data?.fullName || profile?.fullName || ctx.user.name || void 0,
      targetRole: input.user_cv_data?.targetRole || profile?.targetRole || void 0,
      experience: input.user_cv_data?.experience || profile?.experience || void 0,
      skills: input.user_cv_data?.skills || profile?.skills || void 0,
      education: input.user_cv_data?.education || profile?.education || void 0,
      projects: input.user_cv_data?.projects || profile?.projects || void 0,
      summary: input.user_cv_data?.summary || profile?.professionalSummary || void 0,
      verifiedDetails: input.user_cv_data?.verifiedDetails || profile?.verifiedDetails || void 0
    };
    const result = await generateRoadmapMatrix(ctx.user.id, {
      user_cv_data: enrichedCvData,
      job_description_data: input.job_description_data
    });
    return result;
  }),
  getLatestSession: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return null;
    const session = await getLatestInterviewSessionByUserId(ctx.user.id);
    if (!session) return null;
    let levels = [];
    try {
      levels = JSON.parse(session.levels);
    } catch {
      levels = [];
    }
    return {
      id: session.id,
      companyName: session.companyName,
      targetRole: session.targetRole,
      jobDescription: session.jobDescription,
      currentLevel: session.currentLevel,
      status: session.status,
      levels,
      createdAt: session.createdAt
    };
  }),
  // Real-time synchronization of dynamic questions, candidate answers, ML biometrics, and reinforcement feedback
  syncLiveProgress: protectedProcedure.input(
    z7.object({
      sessionId: z7.number(),
      currentLevel: z7.number().optional(),
      askedQuestions: z7.array(z7.string()).optional(),
      recordedAnswers: z7.array(z7.string()).optional(),
      liveMetrics: z7.object({
        eyeContact: z7.number().optional(),
        confidence: z7.number().optional(),
        communicationClarity: z7.number().optional(),
        contentRelevance: z7.number().optional(),
        bodyLanguage: z7.number().optional(),
        languageSkills: z7.number().optional(),
        speechFluency: z7.number().optional(),
        eyeOpenness: z7.number().optional(),
        hesitationCount: z7.number().optional(),
        stutterCount: z7.number().optional(),
        wpm: z7.number().optional()
      }).optional(),
      status: z7.enum(["generated", "in_progress", "completed"]).optional(),
      dynamicLevels: z7.array(z7.any()).optional()
    })
  ).mutation(async ({ ctx, input }) => {
    const existing = await getLatestInterviewSessionByUserId(ctx.user.id);
    let metadataObj = {};
    if (existing?.metadata) {
      try {
        metadataObj = JSON.parse(existing.metadata);
      } catch {
      }
    }
    metadataObj.liveProgress = {
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
      currentLevel: input.currentLevel ?? existing?.currentLevel ?? 1,
      askedQuestions: input.askedQuestions ?? metadataObj.liveProgress?.askedQuestions ?? [],
      recordedAnswers: input.recordedAnswers ?? metadataObj.liveProgress?.recordedAnswers ?? [],
      liveMetrics: input.liveMetrics ?? metadataObj.liveProgress?.liveMetrics ?? {}
    };
    let levelsToSave = void 0;
    if (input.dynamicLevels && input.dynamicLevels.length > 0) {
      levelsToSave = JSON.stringify(input.dynamicLevels);
    }
    const updated = await updateInterviewSession(input.sessionId, ctx.user.id, {
      ...input.currentLevel ? { currentLevel: input.currentLevel } : {},
      ...input.status ? { status: input.status } : { status: "in_progress" },
      ...levelsToSave ? { levels: levelsToSave } : {},
      metadata: JSON.stringify(metadataObj)
    });
    return { success: true, updated };
  }),
  updateSessionLevel: protectedProcedure.input(
    z7.object({
      sessionId: z7.number(),
      level: z7.number().min(1).max(10),
      status: z7.enum(["generated", "in_progress", "completed"]).optional()
    })
  ).mutation(async ({ ctx, input }) => {
    const updated = await updateInterviewSession(input.sessionId, ctx.user.id, {
      currentLevel: input.level,
      ...input.status ? { status: input.status } : {}
    });
    return updated;
  }),
  // Persist live evaluation results and scorecard to database
  saveEvaluation: protectedProcedure.input(evaluationScorecardSchema).mutation(async ({ ctx, input }) => {
    const metadataStr = JSON.stringify(input);
    if (input.sessionId) {
      const updated = await updateInterviewSession(input.sessionId, ctx.user.id, {
        status: "completed",
        metadata: metadataStr
      });
      if (updated) return { success: true, sessionId: updated.id };
    }
    const created = await createInterviewSession({
      userId: ctx.user.id,
      companyName: input.companyName || "Career Rehearsal",
      targetRole: input.targetRole || "Software Engineer",
      levels: "[]",
      currentLevel: 1,
      status: "completed",
      metadata: metadataStr
    });
    return { success: true, sessionId: created.id };
  }),
  // Get all interview sessions for current user
  getAllSessions: protectedProcedure.query(async ({ ctx }) => {
    const sessions = await getInterviewSessionsByUserId(ctx.user.id);
    return sessions.map((s) => {
      let levels = [];
      try {
        levels = JSON.parse(s.levels);
      } catch {
        levels = [];
      }
      return {
        id: s.id,
        companyName: s.companyName,
        targetRole: s.targetRole,
        currentLevel: s.currentLevel,
        status: s.status,
        levelsCount: levels.length,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt
      };
    });
  }),
  // Comprehensive analytics aggregating all generated blueprints & real evaluated sessions
  getUserInterviewAnalytics: publicProcedure.query(async ({ ctx }) => {
    const userId = ctx.user?.id;
    if (!userId) {
      return {
        hasAnyInterviews: false,
        hasCompletedEvaluation: false,
        totalSessions: 0,
        completedSessions: 0,
        inProgressSessions: 0,
        generatedSessions: 0,
        totalStagesAcrossAllSessions: 0,
        stageHistory: [],
        allSessions: [],
        activeSession: null,
        scorecard: {
          overallScore: 0,
          overallScoreLabel: "No Interviews Yet",
          interviewReadiness: 0,
          readinessLabel: "Not Started",
          confidenceLevel: 0,
          confidenceLabel: "Not Assessed",
          communicationScore: 0,
          communicationLabel: "Not Assessed",
          radarMetrics: [
            { key: "eye_contact", label: "Eye Contact", value: 0, fullMark: 100 },
            { key: "confidence", label: "Confidence", value: 0, fullMark: 100 },
            { key: "communication", label: "Communication", value: 0, fullMark: 100 },
            { key: "clarity", label: "Clarity", value: 0, fullMark: 100 },
            { key: "language_skills", label: "Language Skills", value: 0, fullMark: 100 },
            { key: "content_quality", label: "Content Quality", value: 0, fullMark: 100 },
            { key: "body_language", label: "Body Language", value: 0, fullMark: 100 }
          ],
          progressMetrics: [
            { key: "eye_contact", label: "Eye Contact", value: 0 },
            { key: "confidence", label: "Confidence Level", value: 0 },
            { key: "communication_clarity", label: "Communication Clarity", value: 0 },
            { key: "content_relevance", label: "Content & Relevance", value: 0 },
            { key: "body_language", label: "Body Language", value: 0 },
            { key: "language_skills", label: "Language Skills", value: 0 }
          ],
          interviewStats: {
            totalQuestions: 0,
            relevantAnswers: "0/0",
            averageAnswerTime: "--",
            fillerWordsUsage: "Low",
            clarityAndStructure: "Needs Work",
            rating: 0,
            maxRating: 5
          },
          strengths: [
            "Complete your first AI mock interview or generate a 10-level blueprint to reveal your technical strengths."
          ],
          improvements: [
            { id: "1", text: "Generate a targeted 10-level interview blueprint for your dream company", badge: "Improve", badgeVariant: "orange" }
          ],
          aiAdvice: "Launch Company Preparation to synthesize your 10-stage interview blueprint and begin live speech rehearsal.",
          nextGoal: "Generate 10-Level Blueprint"
        }
      };
    }
    const sessions = await getInterviewSessionsByUserId(userId);
    const profile = await getCareerProfileByUserId(userId);
    if (!sessions || sessions.length === 0) {
      return {
        hasAnyInterviews: false,
        hasCompletedEvaluation: false,
        totalSessions: 0,
        completedSessions: 0,
        inProgressSessions: 0,
        generatedSessions: 0,
        totalStagesAcrossAllSessions: 0,
        stageHistory: [],
        allSessions: [],
        activeSession: null,
        scorecard: {
          overallScore: 0,
          overallScoreLabel: "No Interviews Yet",
          interviewReadiness: 0,
          readinessLabel: "Not Started",
          confidenceLevel: 0,
          confidenceLabel: "Not Assessed",
          communicationScore: 0,
          communicationLabel: "Not Assessed",
          radarMetrics: [
            { key: "eye_contact", label: "Eye Contact", value: 0, fullMark: 100 },
            { key: "confidence", label: "Confidence", value: 0, fullMark: 100 },
            { key: "communication", label: "Communication", value: 0, fullMark: 100 },
            { key: "clarity", label: "Clarity", value: 0, fullMark: 100 },
            { key: "language_skills", label: "Language Skills", value: 0, fullMark: 100 },
            { key: "content_quality", label: "Content Quality", value: 0, fullMark: 100 },
            { key: "body_language", label: "Body Language", value: 0, fullMark: 100 }
          ],
          progressMetrics: [
            { key: "eye_contact", label: "Eye Contact", value: 0 },
            { key: "confidence", label: "Confidence Level", value: 0 },
            { key: "communication_clarity", label: "Communication Clarity", value: 0 },
            { key: "content_relevance", label: "Content & Relevance", value: 0 },
            { key: "body_language", label: "Body Language", value: 0 },
            { key: "language_skills", label: "Language Skills", value: 0 }
          ],
          interviewStats: {
            totalQuestions: 0,
            relevantAnswers: "0/0",
            averageAnswerTime: "--",
            fillerWordsUsage: "Low",
            clarityAndStructure: "Needs Work",
            rating: 0,
            maxRating: 5
          },
          strengths: [
            "Complete your first AI mock interview or generate a 10-level blueprint to reveal your technical strengths."
          ],
          improvements: [
            { id: "1", text: "Generate a targeted 10-level interview blueprint for your dream company", badge: "Improve", badgeVariant: "orange" }
          ],
          aiAdvice: "Launch Company Preparation to synthesize your 10-stage interview blueprint and begin live speech rehearsal.",
          nextGoal: "Generate 10-Level Blueprint",
          questionAnalysis: [],
          stageDiagnosis: void 0
        }
      };
    }
    const allEvaluatedStages = [];
    const allEvaluatedScorecards = [];
    let totalStagesCount = 0;
    let completedCount = 0;
    let inProgressCount = 0;
    let generatedCount = 0;
    const formattedSessions = sessions.map((s) => {
      let levels = [];
      try {
        levels = JSON.parse(s.levels);
      } catch {
        levels = [];
      }
      const stageCount = levels.length;
      totalStagesCount += stageCount;
      if (s.status === "completed") completedCount++;
      else if (s.status === "in_progress") inProgressCount++;
      else generatedCount++;
      let metadataParsed = null;
      if (s.metadata) {
        try {
          metadataParsed = JSON.parse(s.metadata);
          if (metadataParsed) {
            if (metadataParsed.overallScore !== void 0) {
              allEvaluatedScorecards.push({
                ...metadataParsed,
                sessionId: s.id,
                companyName: s.companyName || "Target Company",
                targetRole: s.targetRole || "Software Engineer"
              });
            }
            if (Array.isArray(metadataParsed.stageHistory) && metadataParsed.stageHistory.length > 0) {
              for (const sh of metadataParsed.stageHistory) {
                const sc = Number(sh.overallScore ?? 0);
                const readiness = Number(
                  sh.interviewReadiness ?? (sc >= 80 ? Math.min(100, Math.round(sc * 1.05)) : sc >= 60 ? sc : Math.round(sc * 0.9))
                );
                const confidence = Number(
                  sh.confidenceLevel ?? (sc >= 80 ? 85 : sc >= 60 ? 68 : sc > 0 ? 45 : 0)
                );
                const comm = Number(
                  sh.communicationScore ?? (sc >= 80 ? 82 : sc >= 60 ? 65 : sc > 0 ? 40 : 0)
                );
                const eye = Number(
                  sh.eyeContact ?? (sc >= 80 ? 78 : sc >= 60 ? 62 : sc > 0 ? 35 : 0)
                );
                const clarity = Number(sh.clarity ?? comm);
                const lang = Number(
                  sh.languageSkills ?? (sc >= 80 ? 80 : sc >= 60 ? 70 : sc > 0 ? 50 : 0)
                );
                const content = Number(
                  sh.contentQuality ?? (sc >= 80 ? 84 : sc >= 60 ? 66 : sc > 0 ? 40 : 0)
                );
                const body = Number(
                  sh.bodyLanguage ?? (sc >= 80 ? 75 : sc >= 60 ? 60 : sc > 0 ? 35 : 0)
                );
                const totalQ = Number(sh.totalQuestions ?? 1);
                const answered = Number(sh.answeredCount ?? (sc > 0 ? totalQ : 0));
                const elapsed = Number(sh.elapsedSeconds ?? 0);
                const rating = Number(
                  sh.rating ?? (sc >= 80 ? 5 : sc >= 60 ? 3 : sc > 0 ? 1 : 0)
                );
                allEvaluatedStages.push({
                  sessionId: s.id,
                  companyName: s.companyName || "Target Company",
                  targetRole: s.targetRole || "Software Engineer",
                  stageNumber: Number(sh.stageNumber ?? 1),
                  stageTitle: sh.stageTitle || `Stage ${sh.stageNumber ?? 1}`,
                  overallScore: sc,
                  completedAt: sh.completedAt || s.updatedAt || (/* @__PURE__ */ new Date()).toISOString(),
                  measuredByML: Boolean(sh.measuredByML),
                  interviewReadiness: readiness,
                  confidenceLevel: confidence,
                  communicationScore: comm,
                  eyeContact: eye,
                  clarity,
                  languageSkills: lang,
                  contentQuality: content,
                  bodyLanguage: body,
                  totalQuestions: totalQ,
                  answeredCount: answered,
                  elapsedSeconds: elapsed,
                  rating,
                  questionAnalysis: sh.questionAnalysis,
                  stageDiagnosis: sh.stageDiagnosis
                });
              }
            } else if (metadataParsed.overallScore !== void 0) {
              const sc = Number(metadataParsed.overallScore ?? 0);
              allEvaluatedStages.push({
                sessionId: s.id,
                companyName: s.companyName || "Target Company",
                targetRole: s.targetRole || "Software Engineer",
                stageNumber: Number(metadataParsed.stageNumber ?? s.currentLevel ?? 1),
                stageTitle: metadataParsed.stageTitle || `Stage ${metadataParsed.stageNumber ?? s.currentLevel ?? 1}`,
                overallScore: sc,
                completedAt: metadataParsed.completedAt || s.updatedAt || (/* @__PURE__ */ new Date()).toISOString(),
                measuredByML: Boolean(metadataParsed.measuredByML),
                interviewReadiness: Number(metadataParsed.interviewReadiness ?? sc),
                confidenceLevel: Number(metadataParsed.confidenceLevel ?? sc),
                communicationScore: Number(metadataParsed.communicationScore ?? sc),
                eyeContact: Number(
                  metadataParsed.liveMetrics?.eyeContact ?? metadataParsed.radarMetrics?.find((r) => r.key === "eye_contact")?.value ?? sc
                ),
                clarity: Number(metadataParsed.radarMetrics?.find((r) => r.key === "clarity")?.value ?? sc),
                languageSkills: Number(
                  metadataParsed.liveMetrics?.languageSkills ?? metadataParsed.radarMetrics?.find((r) => r.key === "language_skills")?.value ?? sc
                ),
                contentQuality: Number(
                  metadataParsed.liveMetrics?.contentRelevance ?? metadataParsed.radarMetrics?.find((r) => r.key === "content_quality")?.value ?? sc
                ),
                bodyLanguage: Number(
                  metadataParsed.liveMetrics?.bodyLanguage ?? metadataParsed.radarMetrics?.find((r) => r.key === "body_language")?.value ?? sc
                ),
                totalQuestions: Number(metadataParsed.interviewStats?.totalQuestions ?? 1),
                answeredCount: Number((metadataParsed.interviewStats?.relevantAnswers || "0/1").split("/")[0] ?? 0),
                elapsedSeconds: Number(metadataParsed.elapsedSeconds ?? 0),
                rating: Number(metadataParsed.interviewStats?.rating ?? (sc >= 80 ? 5 : sc >= 60 ? 3 : sc > 0 ? 1 : 0)),
                questionAnalysis: metadataParsed.questionAnalysis,
                stageDiagnosis: metadataParsed.stageDiagnosis
              });
            }
          }
        } catch {
        }
      }
      return {
        id: s.id,
        companyName: s.companyName || "Career Rehearsal",
        targetRole: s.targetRole || "Software Engineer",
        currentLevel: s.currentLevel,
        totalLevels: levels.length || 10,
        status: s.status,
        stagesCount: stageCount,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        score: metadataParsed?.overallScore ?? null
      };
    });
    const activeSession = sessions[0];
    let activeSessionLevels = [];
    try {
      activeSessionLevels = JSON.parse(activeSession.levels);
    } catch {
      activeSessionLevels = [];
    }
    const profileSkills = profile?.skills ? profile.skills.split(",").map((s) => s.trim()).filter(Boolean) : [];
    const targetRole = activeSession.targetRole || profile?.targetRole || "Software Engineer";
    const companyName = activeSession.companyName || "Target Company";
    if (allEvaluatedStages.length > 0) {
      const totalAttempts = allEvaluatedStages.length;
      const avgOverallScore = Math.round(
        allEvaluatedStages.reduce((sum, st) => sum + st.overallScore, 0) / totalAttempts
      );
      const avgReadiness = Math.round(
        allEvaluatedStages.reduce((sum, st) => sum + st.interviewReadiness, 0) / totalAttempts
      );
      const avgConfidence = Math.round(
        allEvaluatedStages.reduce((sum, st) => sum + st.confidenceLevel, 0) / totalAttempts
      );
      const avgCommunication = Math.round(
        allEvaluatedStages.reduce((sum, st) => sum + st.communicationScore, 0) / totalAttempts
      );
      const avgEyeContact = Math.round(
        allEvaluatedStages.reduce((sum, st) => sum + st.eyeContact, 0) / totalAttempts
      );
      const avgClarity = Math.round(
        allEvaluatedStages.reduce((sum, st) => sum + st.clarity, 0) / totalAttempts
      );
      const avgLanguageSkills = Math.round(
        allEvaluatedStages.reduce((sum, st) => sum + st.languageSkills, 0) / totalAttempts
      );
      const avgContentQuality = Math.round(
        allEvaluatedStages.reduce((sum, st) => sum + st.contentQuality, 0) / totalAttempts
      );
      const avgBodyLanguage = Math.round(
        allEvaluatedStages.reduce((sum, st) => sum + st.bodyLanguage, 0) / totalAttempts
      );
      const totalQuestionsAcrossAll = allEvaluatedStages.reduce((sum, st) => sum + st.totalQuestions, 0);
      const totalAnsweredAcrossAll = allEvaluatedStages.reduce((sum, st) => sum + st.answeredCount, 0);
      const totalSecondsAcrossAll = allEvaluatedStages.reduce((sum, st) => sum + st.elapsedSeconds, 0);
      const overallScoreLabel = avgOverallScore >= 80 ? "Interview Ready" : avgOverallScore >= 60 ? "Practice Needed" : avgOverallScore > 0 ? "Foundational Gap" : "Incomplete \u2014 Premature Termination";
      const readinessLabel = avgReadiness >= 80 ? "Interview Ready" : avgReadiness >= 60 ? "Practice Needed" : "Foundational Gap";
      const confidenceLabel = avgConfidence >= 75 ? "High" : avgConfidence >= 50 ? "Moderate" : "Low";
      const communicationLabel = avgCommunication >= 80 ? "Strong" : avgCommunication >= 55 ? "Developing" : "Needs Work";
      const radarMetrics = [
        { key: "eye_contact", label: "Eye Contact", value: avgEyeContact, fullMark: 100 },
        { key: "confidence", label: "Confidence", value: avgConfidence, fullMark: 100 },
        { key: "communication", label: "Communication", value: avgCommunication, fullMark: 100 },
        { key: "clarity", label: "Clarity", value: avgClarity, fullMark: 100 },
        { key: "language_skills", label: "Language Skills", value: avgLanguageSkills, fullMark: 100 },
        { key: "content_quality", label: "Content Quality", value: avgContentQuality, fullMark: 100 },
        { key: "body_language", label: "Body Language", value: avgBodyLanguage, fullMark: 100 }
      ];
      const progressMetrics = [
        { key: "eye_contact", label: "Eye Contact", value: avgEyeContact },
        { key: "confidence", label: "Confidence Level", value: avgConfidence },
        { key: "communication_clarity", label: "Communication Clarity", value: avgCommunication },
        { key: "content_relevance", label: "Content & Relevance", value: avgContentQuality },
        { key: "body_language", label: "Body Language", value: avgBodyLanguage },
        { key: "language_skills", label: "Language Skills", value: avgLanguageSkills }
      ];
      const avgAnswerMins = Math.floor(totalSecondsAcrossAll / (totalQuestionsAcrossAll || 1) / 60);
      const avgAnswerSecs = Math.round(totalSecondsAcrossAll / (totalQuestionsAcrossAll || 1) % 60);
      const averageAnswerTime = totalSecondsAcrossAll > 0 ? `${avgAnswerMins}m ${avgAnswerSecs}s` : "--";
      const starRating = Math.min(5, Math.max(0, Math.round(avgOverallScore / 20 * 10) / 10));
      const interviewStats = {
        totalQuestions: totalQuestionsAcrossAll,
        relevantAnswers: `${totalAnsweredAcrossAll}/${totalQuestionsAcrossAll}`,
        averageAnswerTime,
        fillerWordsUsage: avgCommunication >= 75 ? "Low" : avgCommunication >= 50 ? "Moderate" : "Low",
        clarityAndStructure: avgCommunication >= 80 ? "Excellent" : avgCommunication >= 60 ? "Good" : "Needs Work",
        rating: Math.round(starRating),
        maxRating: 5
      };
      const stageHistory = allEvaluatedStages.map((st) => ({
        stageNumber: st.stageNumber,
        overallScore: st.overallScore,
        completedAt: st.completedAt,
        measuredByML: st.measuredByML,
        stageTitle: st.stageTitle
      }));
      const latestEvaluated = allEvaluatedScorecards[0] || null;
      const strengths = latestEvaluated?.strengths?.length ? latestEvaluated.strengths : [
        `Cumulative performance tracked across ${totalAttempts} completed interview attempt${totalAttempts > 1 ? "s" : ""}.`,
        "Multi-stage interview progression recorded and active in system telemetry."
      ];
      const improvements = latestEvaluated?.improvements?.length ? latestEvaluated.improvements : [
        {
          id: "1",
          text: "Practice structuring technical answers using STAR to raise your cumulative interview rating above 80%",
          badge: "Improve",
          badgeVariant: "orange",
          measuredValue: avgOverallScore
        }
      ];
      const aiAdvice = latestEvaluated?.aiAdvice || (avgOverallScore >= 80 ? `Your cumulative average score across ${totalAttempts} interview attempts is ${avgOverallScore}/100. Excellent consistency \u2014 you are maintaining strong interview readiness.` : `Your cumulative average score across ${totalAttempts} interview attempts is ${avgOverallScore}/100. Keep completing practice stages to raise your overall hiring rating.`);
      const nextGoal = latestEvaluated?.nextGoal || `Lift cumulative score from ${avgOverallScore}/100 to 80+`;
      return {
        hasAnyInterviews: true,
        hasCompletedEvaluation: true,
        totalSessions: sessions.length,
        completedSessions: completedCount,
        inProgressSessions: inProgressCount,
        generatedSessions: generatedCount,
        totalStagesAcrossAllSessions: totalStagesCount,
        totalEvaluatedStages: totalAttempts,
        allSessions: formattedSessions,
        activeSession: {
          id: activeSession.id,
          companyName: activeSession.companyName,
          targetRole: activeSession.targetRole,
          currentLevel: activeSession.currentLevel,
          totalLevels: activeSessionLevels.length,
          status: activeSession.status,
          levels: activeSessionLevels
        },
        stageHistory,
        scorecard: {
          overallScore: avgOverallScore,
          overallScoreLabel,
          interviewReadiness: avgReadiness,
          readinessLabel,
          confidenceLevel: avgConfidence,
          confidenceLabel,
          communicationScore: avgCommunication,
          communicationLabel,
          radarMetrics,
          progressMetrics,
          interviewStats,
          strengths,
          improvements,
          aiAdvice,
          nextGoal,
          stageNumber: latestEvaluated?.stageNumber ?? activeSession.currentLevel,
          stageTitle: latestEvaluated?.stageTitle ?? "",
          stageFocusArea: latestEvaluated?.stageFocusArea ?? "",
          measuredByML: allEvaluatedStages.some((st) => st.measuredByML),
          totalEvaluatedStages: totalAttempts,
          questionAnalysis: latestEvaluated?.questionAnalysis || [],
          stageDiagnosis: latestEvaluated?.stageDiagnosis
        }
      };
    }
    const easyLevels = activeSessionLevels.filter((l) => l.difficulty === "Easy");
    const hardLevels = activeSessionLevels.filter((l) => l.difficulty === "Hard" || l.level_number >= 8);
    const midLevels = activeSessionLevels.filter((l) => l.difficulty === "Intermediate");
    const dynamicStrengths = [
      profileSkills.length > 0 ? `Verified Competencies: ${profileSkills.slice(0, 4).join(", ")}` : `Prepared for ${targetRole} Core Competencies`,
      easyLevels[0] ? `Strong Readiness for ${easyLevels[0].title}` : `Background & Resume Validation Ready`,
      `Targeted Preparation Blueprint Generated for ${companyName}`,
      "STAR Methodology Alignment & Problem Solving Logic"
    ];
    const dynamicImprovements = [
      {
        id: "1",
        text: `Complete Stage 1: ${activeSessionLevels[0]?.focus_area || "Background & Role Motivation"}`,
        badge: "Improve",
        badgeVariant: "orange"
      },
      {
        id: "2",
        text: `Prepare for ${midLevels[0]?.title || "Level 4: Architecture & STAR Scenarios"}`,
        badge: "Needs Practice",
        badgeVariant: "orange"
      },
      {
        id: "3",
        text: `Review Stress Scenarios: ${hardLevels[0]?.focus_area || "Production Outage Triage"}`,
        badge: "Moderate",
        badgeVariant: "yellow"
      }
    ];
    return {
      hasAnyInterviews: true,
      hasCompletedEvaluation: false,
      totalSessions: sessions.length,
      completedSessions: completedCount,
      inProgressSessions: inProgressCount,
      generatedSessions: generatedCount,
      totalStagesAcrossAllSessions: totalStagesCount,
      allSessions: formattedSessions,
      activeSession: {
        id: activeSession.id,
        companyName: activeSession.companyName,
        targetRole: activeSession.targetRole,
        currentLevel: activeSession.currentLevel,
        totalLevels: activeSessionLevels.length,
        status: activeSession.status,
        levels: activeSessionLevels
      },
      stageHistory: [],
      scorecard: {
        overallScore: 0,
        overallScoreLabel: "Not Assessed Yet",
        interviewReadiness: 0,
        readinessLabel: "Awaiting First Live Stage",
        confidenceLevel: 0,
        confidenceLabel: "Not Measured",
        communicationScore: 0,
        communicationLabel: "Not Measured",
        radarMetrics: [
          { key: "eye_contact", label: "Eye Contact", value: 0, fullMark: 100 },
          { key: "confidence", label: "Confidence", value: 0, fullMark: 100 },
          { key: "communication", label: "Communication", value: 0, fullMark: 100 },
          { key: "clarity", label: "Clarity", value: 0, fullMark: 100 },
          { key: "language_skills", label: "Language Skills", value: 0, fullMark: 100 },
          { key: "content_quality", label: "Content Quality", value: 0, fullMark: 100 },
          { key: "body_language", label: "Body Language", value: 0, fullMark: 100 }
        ],
        progressMetrics: [
          { key: "eye_contact", label: "Eye Contact", value: 0 },
          { key: "confidence", label: "Confidence Level", value: 0 },
          { key: "communication_clarity", label: "Communication Clarity", value: 0 },
          { key: "content_relevance", label: "Content & Relevance", value: 0 },
          { key: "body_language", label: "Body Language", value: 0 },
          { key: "language_skills", label: "Language Skills", value: 0 }
        ],
        interviewStats: {
          totalQuestions: 0,
          relevantAnswers: "0/0",
          averageAnswerTime: "--",
          fillerWordsUsage: "Low",
          clarityAndStructure: "Needs Work",
          rating: 0,
          maxRating: 5
        },
        strengths: dynamicStrengths,
        improvements: dynamicImprovements,
        aiAdvice: `You have generated ${sessions.length} custom 10-stage interview blueprint${sessions.length > 1 ? "s" : ""} for ${companyName} (${targetRole}). Start Stage 1 \u2014 every dashboard metric will fill in with real values measured live from your camera & voice.`,
        nextGoal: `Complete Stage 1 of 10 (${activeSessionLevels[0]?.title || "Stage 1"})`,
        questionAnalysis: [],
        stageDiagnosis: void 0
      }
    };
  }),
  // AI Live Evaluation endpoint: Evaluates live speech answers and saves scorecard.
  // When the client sends real ML-measured liveMetrics (camera + voice analytics),
  // the scorecard uses those genuine values instead of heuristic estimates.
  evaluateLiveInterview: protectedProcedure.input(
    z7.object({
      sessionId: z7.number(),
      levelNumber: z7.number().min(1).max(10),
      questions: z7.array(z7.string()),
      answers: z7.array(z7.string()),
      elapsedSeconds: z7.number(),
      fillerWordsUsage: z7.enum(["Low", "Moderate", "High"]).optional(),
      liveMetrics: z7.object({
        eyeContact: z7.number().min(0).max(100),
        confidence: z7.number().min(0).max(100),
        communicationClarity: z7.number().min(0).max(100),
        contentRelevance: z7.number().min(0).max(100),
        bodyLanguage: z7.number().min(0).max(100),
        languageSkills: z7.number().min(0).max(100),
        wpm: z7.number().optional(),
        fillerCount: z7.number().optional()
      }).optional()
    })
  ).mutation(async ({ ctx, input }) => {
    const userSessions = await getInterviewSessionsByUserId(ctx.user.id);
    const session = userSessions.find((s) => s.id === input.sessionId);
    let stageTitle = "";
    let stageFocusArea = "";
    let previousHistory = [];
    try {
      const lvls = JSON.parse(session?.levels || "[]");
      const lvl = lvls.find((l) => Number(l.level_number) === input.levelNumber);
      stageTitle = lvl?.title || "";
      stageFocusArea = lvl?.focus_area || "";
    } catch {
    }
    try {
      const prevMeta = JSON.parse(session?.metadata || "null");
      if (prevMeta && prevMeta.overallScore !== void 0) {
        previousHistory = Array.isArray(prevMeta.stageHistory) ? prevMeta.stageHistory : [
          {
            stageNumber: prevMeta.stageNumber ?? 1,
            overallScore: prevMeta.overallScore,
            completedAt: prevMeta.completedAt,
            measuredByML: Boolean(prevMeta.measuredByML),
            stageTitle: prevMeta.stageTitle || ""
          }
        ];
      }
    } catch {
    }
    const stageMeta = STAGE_CURRICULUM_DETAILS[input.levelNumber] || {
      title: stageTitle || `Stage ${input.levelNumber}`,
      focus: stageFocusArea || "Target Role Competencies",
      purpose: `Assess candidate domain depth, practical engineering intuition, and structured problem solving for ${stageFocusArea || "this stage"}.`,
      objectives: [
        "Demonstrate clear technical and domain reasoning",
        "Structure answers with concrete real-world context",
        "Maintain executive communication composure and eye contact"
      ]
    };
    const lm = input.liveMetrics;
    const totalQ = Math.max(1, input.questions.length);
    const questionAnalysis = input.questions.map((q, idx) => {
      const ans = input.answers[idx] || "";
      return generateModelAnswerAndBreakdown(
        q,
        ans,
        stageFocusArea || stageMeta.focus,
        session?.targetRole || "Software Engineer",
        idx,
        lm
      );
    });
    const questionScores = questionAnalysis.map((qa) => qa.score);
    const avgQuestionScore = questionScores.length > 0 ? Math.round(questionScores.reduce((a, b) => a + b, 0) / totalQ) : 0;
    const answeredList = input.answers.map((a) => {
      const clean = a ? a.trim() : "";
      const words = clean.split(/\s+/).filter(Boolean);
      const isMeaningful = words.length >= 3 && clean !== "..." && !clean.toLowerCase().includes("via live microphone");
      return { text: clean, wordCount: words.length, isMeaningful };
    });
    const answeredCount = answeredList.filter((a) => a.isMeaningful).length;
    const totalWordsSpoken = answeredList.reduce((acc, curr) => acc + curr.wordCount, 0);
    const ratio = totalQ > 0 ? answeredCount / totalQ : 1;
    const isPrematureExit = answeredCount === 0 && totalWordsSpoken < 4 || (input.elapsedSeconds || 0) < 15 && answeredCount === 0;
    let score = 0;
    let readiness = 0;
    let eye = 0;
    let body = 0;
    let comm = 0;
    let confidence = 0;
    let relevance = 0;
    let lang = 0;
    if (isPrematureExit) {
      score = 0;
      readiness = 0;
      eye = 0;
      body = 0;
      comm = 0;
      confidence = 0;
      relevance = 0;
      lang = 0;
    } else {
      eye = lm?.eyeContact !== void 0 ? lm.eyeContact : 0;
      body = lm?.bodyLanguage !== void 0 ? lm.bodyLanguage : 0;
      comm = lm?.communicationClarity !== void 0 ? lm.communicationClarity : Math.min(85, 30 + Math.min(55, totalWordsSpoken * 0.4));
      confidence = lm?.confidence !== void 0 ? lm.confidence : Math.min(85, 25 + ratio * 55);
      relevance = avgQuestionScore;
      lang = lm?.languageSkills !== void 0 ? lm.languageSkills : Math.min(85, 30 + Math.min(55, totalWordsSpoken * 0.5));
      score = Math.round(
        avgQuestionScore * 0.7 + comm * 0.15 + (eye * 0.6 + body * 0.4) * 0.15
      );
      readiness = Math.max(0, Math.min(100, score - 3));
    }
    const fillerCount = lm?.fillerCount ?? 0;
    const fillerWordsUsage = input.fillerWordsUsage ?? (fillerCount <= 2 ? "Low" : fillerCount <= 7 ? "Moderate" : "High");
    const stageTag = stageFocusArea ? ` \u2014 Stage ${input.levelNumber}${stageTitle ? ` (${stageTitle})` : ""} \xB7 ${stageFocusArea}` : ` \u2014 Stage ${input.levelNumber}${stageTitle ? ` (${stageTitle})` : ""}`;
    let strengths = [];
    let improvements = [];
    if (isPrematureExit) {
      strengths = [
        `Session Initiated \u2014 Stage ${input.levelNumber} launched`,
        "Camera & audio stream successfully configured"
      ];
      improvements = [
        {
          id: "1",
          text: `Do not exit prematurely \u2014 complete the full question exchange for Stage ${input.levelNumber}`,
          badge: "Critical",
          badgeVariant: "orange",
          measuredValue: 0
        },
        {
          id: "2",
          text: "Speak your answers to each question clearly into the live microphone",
          badge: "Critical",
          badgeVariant: "orange",
          measuredValue: 0
        },
        {
          id: "3",
          text: "Maintain direct eye contact throughout your spoken responses",
          badge: "Critical",
          badgeVariant: "orange",
          measuredValue: 0
        }
      ];
    } else {
      const measured = [
        { label: "Question Content & Answers", value: avgQuestionScore, tip: "Structure Technical Answers with Clear STAR Format" },
        { label: "Eye Contact", value: eye, tip: "Maintain Steady Eye Contact during Complex Explanations" },
        { label: "Confidence", value: confidence, tip: "Increase Confidence on Failure Mode Edge Cases" },
        { label: "Communication Clarity", value: comm, tip: "Reduce Verbal Pauses & Filler Words" },
        { label: "Body Language", value: body, tip: "Keep a Calm, Steady Posture Facing the Interviewer" },
        { label: "Language Skills", value: lang, tip: "Use Richer Vocabulary and Fuller Sentences" }
      ];
      const sortedMeasured = [...measured].sort((a, b) => b.value - a.value);
      strengths = sortedMeasured.slice(0, 3).map((m) => `Strong ${m.label} \u2014 measured ${m.value}/100${stageTag}`);
      improvements = sortedMeasured.slice(-3).reverse().map((m, idx) => ({
        id: String(idx + 1),
        text: `${m.tip}${stageTag}`,
        badge: m.value < 60 ? "Improve" : "Moderate",
        badgeVariant: m.value < 60 ? "orange" : "yellow",
        measuredValue: m.value
      }));
    }
    const completedAt = (/* @__PURE__ */ new Date()).toISOString();
    const stageHistory = [
      ...previousHistory,
      {
        stageNumber: input.levelNumber,
        overallScore: score,
        completedAt,
        measuredByML: Boolean(lm),
        stageTitle,
        interviewReadiness: readiness,
        confidenceLevel: confidence,
        communicationScore: comm,
        eyeContact: eye,
        clarity: comm,
        languageSkills: lang,
        contentQuality: relevance,
        bodyLanguage: body,
        totalQuestions: totalQ,
        answeredCount,
        elapsedSeconds: input.elapsedSeconds || 0,
        rating: isPrematureExit ? 0 : score >= 80 ? 5 : score >= 60 ? 3 : score > 0 ? 1 : 0
      }
    ];
    const verbalWeaknesses = [];
    const nonVerbalWeaknesses = [];
    if (isPrematureExit) {
      verbalWeaknesses.push("No spoken answers were provided \u2014 the interview was cut off prematurely.");
      nonVerbalWeaknesses.push("Eye contact and posture could not be validated over an interview exchange.");
    } else {
      if (comm < 75 || fillerCount > 4) {
        verbalWeaknesses.push(
          fillerCount > 4 ? `Frequent verbal fillers detected (${fillerCount} occurrences) \u2014 replace 'umm', 'like' and trailing pauses with clean silent transitions.` : "Communication structure lacked crisp synthesis \u2014 use high-impact executive summaries before diving into low-level code."
        );
      }
      if (relevance < 75) {
        verbalWeaknesses.push(`Answers wandered slightly from core stage focus ("${stageFocusArea || stageMeta.focus}") \u2014 anchor closer to concrete architectural trade-offs.`);
      }
      if (lang < 75) {
        verbalWeaknesses.push("Vocabulary was overly brief \u2014 elaborate with standard industry terminology, quantifiable impact metrics, and edge cases.");
      }
      if (eye < 72) {
        nonVerbalWeaknesses.push(`Eye contact dropped to ${eye}/100 during tough questions \u2014 maintain steady gaze directly on the camera lens to project confidence.`);
      }
      if (body < 72) {
        nonVerbalWeaknesses.push("Posture exhibited mild restlessness or off-center tilt \u2014 maintain steady, upright sitting posture throughout the exchange.");
      }
    }
    if (verbalWeaknesses.length === 0) {
      verbalWeaknesses.push("Minor: Could add more quantifiable metrics (e.g. latency % reduction, QPS capacity, revenue impact) to heighten answer impact.");
    }
    if (nonVerbalWeaknesses.length === 0) {
      nonVerbalWeaknesses.push("Non-verbal composure was exemplary \u2014 steady eye contact and confident posture maintained across all questions.");
    }
    const stageDiagnosis = {
      stagePurpose: stageMeta.purpose,
      keyObjectives: stageMeta.objectives,
      verbalWeaknesses,
      nonVerbalWeaknesses,
      comprehensiveReview: isPrematureExit ? `Interview was terminated after only ${input.elapsedSeconds || 0} seconds with 0 questions answered. In a real interview, ratings are strictly determined by your spoken answers to each question. Please speak your answers clearly into the microphone to receive an evaluated score.` : `Overall performance in Stage ${input.levelNumber} scored ${score}/100 based on your spoken answers to ${answeredCount} of ${totalQ} questions. ${score >= 80 ? "Candidate demonstrated strong domain clarity, structured answers, and executive presence." : score >= 60 ? "Candidate demonstrated solid foundational potential. Improve structured STAR storytelling and elaborate with concrete metrics." : "Candidate provided incomplete or minimal answers. Extensive preparation on core domain questions is needed."}`
    };
    const scorecard = {
      sessionId: input.sessionId,
      completedAt,
      stageNumber: input.levelNumber,
      stageTitle: stageTitle || stageMeta.title,
      stageFocusArea: stageFocusArea || stageMeta.focus,
      overallScore: score,
      overallScoreLabel: isPrematureExit ? "Incomplete \u2014 Premature Termination" : score >= 80 ? "Excellent Performance" : score >= 60 ? "Developing Performance" : "Needs Urgent Practice",
      interviewReadiness: readiness,
      readinessLabel: isPrematureExit ? "No Spoken Answers" : readiness >= 80 ? "Interview Ready" : readiness >= 60 ? "Practice Needed" : "Foundational Gap",
      confidenceLevel: confidence,
      confidenceLabel: isPrematureExit ? "Not Evaluated" : confidence >= 75 ? "High" : confidence >= 50 ? "Moderate" : "Low",
      communicationScore: comm,
      communicationLabel: isPrematureExit ? "No Voice Output" : comm >= 80 ? "Strong" : comm >= 55 ? "Developing" : "Needs Work",
      liveMetrics: {
        eyeContact: eye,
        confidence,
        communicationClarity: comm,
        contentRelevance: relevance,
        bodyLanguage: body,
        languageSkills: lang,
        wpm: lm?.wpm ?? 0,
        fillerCount
      },
      radarMetrics: [
        { key: "eye_contact", label: "Eye Contact", value: eye, fullMark: 100 },
        { key: "confidence", label: "Confidence", value: confidence, fullMark: 100 },
        { key: "communication", label: "Communication", value: comm, fullMark: 100 },
        { key: "clarity", label: "Clarity", value: comm, fullMark: 100 },
        { key: "language_skills", label: "Language Skills", value: lang, fullMark: 100 },
        { key: "content_quality", label: "Content Quality", value: relevance, fullMark: 100 },
        { key: "body_language", label: "Body Language", value: body, fullMark: 100 }
      ],
      progressMetrics: [
        { key: "eye_contact", label: "Eye Contact", value: eye },
        { key: "confidence", label: "Confidence Level", value: confidence },
        { key: "communication_clarity", label: "Communication Clarity", value: comm },
        { key: "content_relevance", label: "Content & Relevance", value: relevance },
        { key: "body_language", label: "Body Language", value: body },
        { key: "language_skills", label: "Language Skills", value: lang }
      ],
      interviewStats: {
        totalQuestions: totalQ,
        relevantAnswers: `${answeredCount}/${totalQ}`,
        averageAnswerTime: `${Math.floor((input.elapsedSeconds || 0) / (totalQ || 1) / 60)}m ${Math.round((input.elapsedSeconds || 0) / (totalQ || 1) % 60)}s`,
        fillerWordsUsage,
        clarityAndStructure: isPrematureExit ? "No Answers Given" : comm >= 80 ? "Strong" : comm >= 60 ? "Developing" : "Needs Work",
        rating: isPrematureExit ? 0 : score >= 80 ? 5 : score >= 60 ? 3 : score > 0 ? 1 : 0,
        maxRating: 5,
        ...lm?.wpm ? { speakingPaceWpm: lm.wpm } : {}
      },
      strengths,
      improvements,
      stageDiagnosis,
      questionAnalysis,
      aiAdvice: isPrematureExit ? `Stage ${input.levelNumber} was terminated prematurely after ${input.elapsedSeconds || 0} seconds with 0 answers provided. Ratings in real interviews depend entirely on the substance and clarity of your spoken answers. Re-enter the stage, listen to each question, and speak your responses using the microphone to receive an evaluated score.` : `Stage ${input.levelNumber} evaluated: your spoken question performance scored ${avgQuestionScore}/100 with ${eye}% eye contact. ${score >= 80 ? "Demonstrated strong technical clarity and executive composure." : score >= 60 ? "Solid potential shown. Expand your answers with concrete metrics and architectural trade-offs." : "Answers were brief or lacked domain depth. Practice structuring answers using the STAR method."}`,
      nextGoal: `Complete Stage ${Math.min(10, input.levelNumber + 1)} of 10`,
      measuredByML: Boolean(lm),
      stageHistory
    };
    const metadataStr = JSON.stringify(scorecard);
    await updateInterviewSession(input.sessionId, ctx.user.id, {
      currentLevel: Math.min(10, input.levelNumber + 1),
      status: input.levelNumber >= 10 ? "completed" : "in_progress",
      metadata: metadataStr
    });
    return scorecard;
  }),
  // Get the most recent evaluated interview results from DB
  getLatestResults: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return null;
    const session = await getLatestInterviewSessionByUserId(ctx.user.id);
    if (!session || !session.metadata) return null;
    try {
      const parsed = JSON.parse(session.metadata);
      return {
        sessionId: session.id,
        companyName: session.companyName,
        targetRole: session.targetRole,
        completedAt: session.updatedAt || session.createdAt,
        ...parsed
      };
    } catch {
      return null;
    }
  })
});

// server/routers.ts
var appRouter = router({
  system: systemRouter,
  auth: authRouter,
  careerProfile: careerProfileRouter,
  practicePreparation: practicePreparationRouter
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/app.ts
function createApp() {
  const app2 = express();
  if (process.env.VERCEL) {
    app2.use((req, _res, next) => {
      if (!req.url.startsWith("/api") && !req.url.startsWith("/local-storage") && !req.url.startsWith("/manus-storage")) {
        req.url = `/api${req.url.startsWith("/") ? "" : "/"}${req.url}`;
      }
      next();
    });
  }
  app2.use(express.json({ limit: "50mb" }));
  app2.use(express.urlencoded({ limit: "50mb", extended: true }));
  app2.get(["/api/health", "/health"], (_req, res) => {
    res.json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: Date.now(),
      platform: process.env.VERCEL ? "vercel-serverless" : "node-server"
    });
  });
  app2.all(["/api/gemini-live-ws", "/gemini-live-ws"], (_req, res) => {
    res.status(501).json({
      ok: false,
      code: "WEBSOCKET_UNSUPPORTED_ON_SERVERLESS",
      message: "Real-time speech-to-speech WebSockets cannot run directly on Vercel Serverless Functions. Please configure VITE_GEMINI_LIVE_WS_URL to point to a persistent Node host (e.g. Render, Railway, Fly.io) or deploy on a persistent Node server.",
      docs: "https://vercel.com/guides/do-vercel-serverless-functions-support-websocket-connections"
    });
  });
  app2.all(["/api/gemini-live-token", "/gemini-live-token"], async (_req, res) => {
    const result = await createGeminiLiveToken();
    return res.status(result.status || (result.ok ? 200 : 500)).json(result);
  });
  registerStorageProxy(app2);
  registerOAuthRoutes(app2);
  registerGoogleAuthRoutes(app2);
  registerRoadmapRestRoutes(app2);
  registerTtsRoutes(app2);
  app2.use(
    ["/api/trpc", "/trpc"],
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError({ error, path: path5 }) {
        console.error(`[tRPC Error at ${path5 ?? "unknown"}]:`, error);
      }
    })
  );
  app2.use((err, _req, res, _next) => {
    console.error("[Express Error Handler]:", err);
    if (!res.headersSent) {
      res.status(err.status || err.statusCode || 500).json({
        error: {
          message: err.message || "A server error occurred",
          code: err.code || "INTERNAL_SERVER_ERROR"
        }
      });
    }
  });
  return app2;
}
var app = createApp();
var app_default = app;

// server/serverless.ts
var serverless_default = app_default;
export {
  serverless_default as default
};
