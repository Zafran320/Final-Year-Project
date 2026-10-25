import { boolean, integer, pgEnum, pgTable, serial, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin"]);

/**
 * Core user table backing auth flow.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = pgTable("users", {
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
  lastSignedIn: timestamp("lastSignedIn", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * User-owned preparation profile. The real OAuth user remains the source of
 * account identity; this table stores details supplied for
 * interview preparation and career personalization.
 */
export const careerProfiles = pgTable("careerProfiles", {
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
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
}, (table) => [uniqueIndex("careerProfiles_userId_unique").on(table.userId)]);

export type CareerProfile = typeof careerProfiles.$inferSelect;
export type InsertCareerProfile = typeof careerProfiles.$inferInsert;

/**
 * 10-Level Mock Interview Progression Sessions.
 * Stores Gemini-generated level matrix, current progression status, and context.
 */
export const interviewSessions = pgTable("interviewSessions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  companyName: varchar("companyName", { length: 180 }),
  targetRole: varchar("targetRole", { length: 180 }),
  jobDescription: text("jobDescription"),
  resumeSummary: text("resumeSummary"),
  levels: text("levels").notNull(), // JSON string representing the 10 levels array
  currentLevel: integer("currentLevel").default(1).notNull(),
  status: varchar("status", { length: 32 }).default("generated").notNull(), // 'generated', 'in_progress', 'completed'
  metadata: text("metadata"),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

export type InterviewSession = typeof interviewSessions.$inferSelect;
export type InsertInterviewSession = typeof interviewSessions.$inferInsert;

