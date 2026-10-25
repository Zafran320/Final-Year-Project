# Layer: Data Access

This folder is the **data access layer** for the CareerTwin AI server.

It is responsible for:
- All database read/write operations (PostgreSQL via Drizzle ORM + Supabase REST fallback)
- Object/file storage access (Supabase Storage + local `.storage/` fallback)
- Supabase client initialization

## Files

| File | Responsibility |
|------|---------------|
| `db.ts` | Multi-tier durable data store: users, career profiles, interview sessions |
| `supabase.ts` | Supabase client factory (admin + anon client) |
| `storage.ts` | File upload/download via Supabase Storage with local fallback |

## Architecture Rules

- This layer **must not** contain business logic or route handling.
- All business-logic callers should import from here; direct DB access from routes is prohibited.
- Uses a 3-tier fallback strategy: PostgreSQL → Supabase REST API → local disk cache.
