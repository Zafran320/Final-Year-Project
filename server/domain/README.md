# Layer: Business Logic / Services

This folder is the **service layer** (business logic) for the FutureMaker AI server.

It contains all domain logic, AI integrations, and third-party service wrappers.

## Files

| File | Responsibility |
|------|---------------|
| `gemini.ts` | Gemini API client: resume parsing, LLM invocations, model discovery |
| `companyPreparation.ts` | Company research & interview brief generation via LLM |
| `roadmapService.ts` | 10-level interview progression matrix generation |
| `github.ts` | GitHub repository metadata fetching for profile enrichment |
| `geminiLiveProxy.ts` | Real-time WebSocket proxy for Gemini Live speech-to-speech |
| `ttsRouter.ts` | Text-to-speech REST endpoint using Gemini voices |
| `careerOpsScraper.ts` | Live job listing scraper and evaluator |

## Architecture Rules

- Services depend on the **data access layer** (`../repository/`) for persistence.
- Services depend on **`infrastructure/`** for infrastructure (LLM client, env, auth).
- Services must **not** import from `routes/` or `routers/`.
