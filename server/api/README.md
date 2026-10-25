# Layer: Routes / tRPC Routers (Server)

This folder contains **tRPC routers** — the primary API contract between client and server.

Each file defines a namespaced tRPC router that is assembled in `../routers.ts`.

## Files

| File | Responsibility |
|------|---------------|
| `auth.ts` | Authentication: sign up, sign in (email + Google + OAuth), sign out, session |
| `careerProfile.ts` | Career profile CRUD, resume upload/parse, job scraping, photo upload |
| `practicePreparation.ts` | Interview session management, company prep, evaluation scoring |

## Architecture Rules

- Routers depend on **services** (`../domain/`) and **data** (`../repository/`).
- Routers must **not** contain business logic — delegate to services.
- Use `protectedProcedure` for authenticated endpoints, `publicProcedure` for open ones.
