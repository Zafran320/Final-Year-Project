# Setting Up Supabase for FutureMaker AI

FutureMaker AI's backend is powered by **Supabase PostgreSQL** via Drizzle ORM and the Supabase JavaScript SDK.

Follow these quick steps to connect your Supabase project:

---

## 1. Create a Supabase Project
1. Log in to [Supabase](https://supabase.com/).
2. Click **New Project** and select your organization.
3. Name your project (e.g. `futuremaker-ai`) and set a strong database password.

---

## 2. Configure Environment Variables
Copy `.env.example` to `.env` in the project root:
```bash
cp .env.example .env
```

In `.env`, configure your Supabase connection:
```env
# Supabase PostgreSQL Connection String
# Find this in: Project Settings -> Database -> Connection string -> URI
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"

# Optional Supabase API Keys (Project Settings -> API)
SUPABASE_URL="https://[PROJECT-REF].supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# App Security
JWT_SECRET="generate-a-secure-random-string-here"
```

> **Tip on Connection Pooling**: Supabase provides both direct connection (port 5432) and transaction connection pooler (port 6543 / PgBouncer). The backend is configured with `prepare: false` which is fully compatible with both!

---

## 3. Run the Database Schema Migration

You have two simple options to initialize the tables in Supabase:

### Option A: Using the Supabase Dashboard SQL Editor (Fastest)
1. Go to your Supabase Dashboard -> **SQL Editor**.
2. Click **New Query**.
3. Open [`supabase/schema.sql`](../supabase/schema.sql) from this repository, copy the entire SQL script, and paste it into the editor.
4. Click **Run**.
5. You're done! The `users` and `careerProfiles` tables and unique constraints are now created.

### Option B: Using Drizzle Kit
Run the following command from the project root:
```bash
npm run db:push
# or
pnpm db:push
```

---

## 4. Tables Created in Supabase

| Table | Description |
|---|---|
| `users` | User accounts, auth identity (`openId`), role (`user`/`admin`), and timestamps. |
| `careerProfiles` | Interview prep profile, resume metadata, contact details, experience, skills, and AI review caches. |

---

## 5. Starting the Application
```bash
npm run dev
# or
pnpm dev
```
The server will connect to your Supabase PostgreSQL instance and start on `http://localhost:3000`.
