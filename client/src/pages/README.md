# Layer: Presentation (Client)

This folder is the **presentation layer** — React page components.

Each file maps directly to a route defined in `../App.tsx`.

## Pages

| File | Route | Description |
|------|-------|-------------|
| `Home.tsx` | `/` | Landing page / dashboard entry |
| `AuthPage.tsx` | `/login`, `/signup` | Authentication forms |
| `AuthCallback.tsx` | `/auth/callback` | OAuth redirect handler |
| `AccountDetails.tsx` | `/account` | User profile settings |
| `JobRadarPage.tsx` | `/jobs` | Job recommendations radar |
| `LiveInterview.tsx` | `/live-interview` | Real-time AI voice interview |
| `PracticeSetup.tsx` | `/practice-setup` | Interview session configuration |
| `InterviewPerformanceDashboard.tsx` | `/dashboard` | Performance analytics |
| `InterviewReportPage.tsx` | `/interview-report` | Detailed session report |
| `CompanyPreparation.tsx` | (modal/step) | Company research brief |
| `NotFound.tsx` | `*` | 404 fallback |

## Architecture Rules

- Pages depend on **hooks** (`../logic/`) for business logic.
- Pages depend on **lib** (`../services/`) for data access (tRPC, Supabase, query client).
- Pages depend on **components** (`../components/`) for UI.
- Pages must **not** contain direct API calls — use hooks and tRPC mutations.
