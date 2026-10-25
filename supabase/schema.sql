-- Supabase PostgreSQL Schema for FutureMaker AI
-- Run this script in the Supabase Dashboard -> SQL Editor -> New query -> Run

-- 1. Create Role Enum type
DO $$ BEGIN
    CREATE TYPE "role" AS ENUM ('user', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Users Table
CREATE TABLE IF NOT EXISTS "users" (
    "id" SERIAL PRIMARY KEY,
    "openId" VARCHAR(64) NOT NULL,
    "name" TEXT,
    "email" VARCHAR(320),
    "loginMethod" VARCHAR(64),
    "role" "role" DEFAULT 'user'::"role" NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    "lastSignedIn" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- High-speed indexes on users
CREATE UNIQUE INDEX IF NOT EXISTS "users_openId_unique" ON "users" ("openId");
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");
CREATE INDEX IF NOT EXISTS "users_lastSignedIn_idx" ON "users" ("lastSignedIn" DESC);

-- 3. Career Profiles Table
CREATE TABLE IF NOT EXISTS "careerProfiles" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "fullName" VARCHAR(160),
    "location" VARCHAR(160),
    "phone" VARCHAR(64),
    "contactEmail" VARCHAR(320),
    "linkedinUrl" VARCHAR(500),
    "portfolioUrl" VARCHAR(500),
    "age" INTEGER,
    "education" VARCHAR(80),
    "degree" VARCHAR(180),
    "careerStatus" VARCHAR(32),
    "currentJob" VARCHAR(180),
    "company" VARCHAR(180),
    "lookingFor" VARCHAR(80),
    "careerField" VARCHAR(120),
    "targetRole" VARCHAR(180),
    "skills" TEXT,
    "experience" TEXT,
    "professionalSummary" TEXT,
    "certifications" TEXT,
    "languages" TEXT,
    "projects" TEXT,
    "verifiedDetails" TEXT,
    "resumeReviewCache" TEXT,
    "resumeReviewCacheKey" VARCHAR(500),
    "resumeKey" VARCHAR(500),
    "resumeUrl" VARCHAR(500),
    "resumeName" VARCHAR(260),
    "resumeSize" INTEGER,
    "resumeMimeType" VARCHAR(120),
    "profilePhotoKey" VARCHAR(500),
    "profilePhotoUrl" VARCHAR(500),
    "profilePhotoSize" INTEGER,
    "profilePhotoMimeType" VARCHAR(120),
    "personalizationEnabled" BOOLEAN DEFAULT TRUE NOT NULL,
    "jobRecommendationsEnabled" BOOLEAN DEFAULT TRUE NOT NULL,
    "professionalConnectionsEnabled" BOOLEAN DEFAULT TRUE NOT NULL,
    "isComplete" BOOLEAN DEFAULT FALSE NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- High-speed indexes on careerProfiles
CREATE UNIQUE INDEX IF NOT EXISTS "careerProfiles_userId_unique" ON "careerProfiles" ("userId");
CREATE INDEX IF NOT EXISTS "careerProfiles_updatedAt_idx" ON "careerProfiles" ("updatedAt" DESC);

-- 4. Enable Row Level Security (RLS) & Grant Policies
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "careerProfiles" ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow all access on users" ON "users";
    CREATE POLICY "Allow all access on users" ON "users" FOR ALL USING (true) WITH CHECK (true);
EXCEPTION
    WHEN others THEN null;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow all access on careerProfiles" ON "careerProfiles";
    CREATE POLICY "Allow all access on careerProfiles" ON "careerProfiles" FOR ALL USING (true) WITH CHECK (true);
EXCEPTION
    WHEN others THEN null;
END $$;
