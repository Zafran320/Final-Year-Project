import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.warn("[Drizzle] DATABASE_URL / SUPABASE_DATABASE_URL is not set. Drizzle commands will require a valid PostgreSQL connection string.");
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString || "",
  },
});
