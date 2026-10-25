# Layer: Data Access (Client)

This folder is the **data access layer** for the client — it manages all API communication, caching, and external service clients.

## Files

| File | Responsibility |
|------|---------------|
| `trpc.ts` | tRPC client setup with React Query integration |
| `queryClient.ts` | TanStack Query client singleton configuration |
| `supabase.ts` | Supabase browser client for auth state and realtime |
| `geminiLive.ts` | Gemini Live WebSocket client (voice interview stream) |
| `neuralTTS.ts` | Neural TTS client for AI voice playback |
| `candidateMetrics.ts` | Candidate performance metric calculations |
| `languageDetector.ts` | Language/locale detection utility |
| `practiceNavigation.ts` | Practice session navigation state helpers |
| `profileImage.ts` | Profile image upload and crop helpers |
| `utils.ts` | Shared utility functions (cn, formatting, etc.) |

## Architecture Rules

- This layer owns all API calls (`trpc`, `supabase`).
- Business logic in hooks (`../logic/`) calls functions here.
- No JSX — pure TypeScript utilities and clients.
