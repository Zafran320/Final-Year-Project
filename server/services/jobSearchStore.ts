/**
 * Cache + monthly quota guard shared by the paid local-job providers (JSearch, SerpApi).
 *
 * Both have small free plans, so every provider gets:
 * - results cached per query on disk (dev-server restarts don't refetch);
 * - identical concurrent searches sharing one API call;
 * - a monthly request counter that stops calling the API at the plan limit and serves stale cache.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ScrapedJob } from "./careerOpsScraper";

export type LocalJobSearchStatus = "ok" | "cached" | "not-configured" | "quota-exhausted" | "error";
export type ProviderResult = { jobs: ScrapedJob[]; status: LocalJobSearchStatus };

/** What one API call produced. `remaining` is the provider's own count of requests left, when it reports one. */
export type RequestOutcome =
  | { kind: "ok"; jobs: ScrapedJob[]; remaining?: number }
  | { kind: "quota-exhausted" }
  | { kind: "error" };

type CacheEntry = { jobs: ScrapedJob[]; fetchedAt: number };
export type StoreState = { month: string; requestsThisMonth: number; entries: Record<string, CacheEntry> };

const DEFAULT_CACHE_MINUTES = 720;
const ENTRY_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function currentMonth(now = new Date()) {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function emptyState(): StoreState {
  return { month: currentMonth(), requestsThisMonth: 0, entries: {} };
}

export function cacheTtlMs() {
  const minutes = Number(process.env.JOB_SEARCH_CACHE_MINUTES);
  return (Number.isFinite(minutes) && minutes > 0 ? minutes : DEFAULT_CACHE_MINUTES) * 60_000;
}

export class JobSearchStore {
  private state: StoreState | null = null;
  private loading: Promise<StoreState> | null = null;
  private readonly inFlight = new Map<string, Promise<ProviderResult>>();

  constructor(
    private readonly name: string,
    private readonly limitEnvVar: string,
    private readonly defaultMonthlyLimit: number
  ) {}

  monthlyLimit() {
    const limit = Number(process.env[this.limitEnvVar]);
    return Number.isFinite(limit) && limit > 0 ? limit : this.defaultMonthlyLimit;
  }

  private filePath() {
    // Serverless hosts (Vercel) only allow writes under the temp directory.
    const dir = process.env.VERCEL ? tmpdir() : path.resolve(process.cwd(), ".data");
    return path.join(dir, `job-search-cache-${this.name}.json`);
  }

  private async load(): Promise<StoreState> {
    if (!this.state) {
      this.loading ??= (async () => {
        try {
          const parsed = JSON.parse(await readFile(this.filePath(), "utf8")) as StoreState;
          this.state = parsed?.entries ? parsed : emptyState();
        } catch {
          this.state = emptyState();
        }
        return this.state;
      })();
      await this.loading;
    }
    const state = this.state!;
    if (state.month !== currentMonth()) {
      state.month = currentMonth();
      state.requestsThisMonth = 0;
    }
    return state;
  }

  private async persist() {
    if (!this.state || process.env.NODE_ENV === "test") return;
    try {
      const cutoff = Date.now() - ENTRY_MAX_AGE_MS;
      for (const [key, entry] of Object.entries(this.state.entries)) {
        if (entry.fetchedAt < cutoff) delete this.state.entries[key];
      }
      await mkdir(path.dirname(this.filePath()), { recursive: true });
      await writeFile(this.filePath(), JSON.stringify(this.state));
    } catch (error) {
      console.warn(`[Jobs] Could not save ${this.name} cache:`, error instanceof Error ? error.message : error);
    }
  }

  /** Returns cached jobs when fresh, otherwise runs `request` once (respecting the monthly limit). */
  async search(cacheKey: string, request: () => Promise<RequestOutcome>): Promise<ProviderResult> {
    const state = await this.load();
    const hit = state.entries[cacheKey];
    if (hit && Date.now() - hit.fetchedAt < cacheTtlMs()) return { jobs: hit.jobs, status: "ok" };

    const pending = this.inFlight.get(cacheKey);
    if (pending) return pending;

    const run = (async (): Promise<ProviderResult> => {
      if (state.requestsThisMonth >= this.monthlyLimit()) return { jobs: hit?.jobs ?? [], status: "quota-exhausted" };
      state.requestsThisMonth += 1;
      try {
        const outcome = await request();
        if (outcome.kind === "ok") {
          if (outcome.remaining !== undefined && Number.isFinite(outcome.remaining)) {
            // The provider's own count beats ours (e.g. after the cache file was deleted).
            state.requestsThisMonth = Math.max(state.requestsThisMonth, this.monthlyLimit() - outcome.remaining);
          }
          state.entries[cacheKey] = { jobs: outcome.jobs, fetchedAt: Date.now() };
          return { jobs: outcome.jobs, status: "ok" };
        }
        if (outcome.kind === "quota-exhausted") {
          state.requestsThisMonth = this.monthlyLimit();
          return { jobs: hit?.jobs ?? [], status: "quota-exhausted" };
        }
        return { jobs: hit?.jobs ?? [], status: hit ? "cached" : "error" };
      } catch (error) {
        console.warn(`[Jobs] ${this.name} request failed:`, error instanceof Error ? error.message : error);
        return { jobs: hit?.jobs ?? [], status: hit ? "cached" : "error" };
      } finally {
        await this.persist();
      }
    })().finally(() => this.inFlight.delete(cacheKey));

    this.inFlight.set(cacheKey, run);
    return run;
  }

  /** Test hook: replace in-memory state so each test starts clean. */
  reset(initial?: StoreState) {
    this.state = initial ?? emptyState();
    this.loading = Promise.resolve(this.state);
    this.inFlight.clear();
  }
}
