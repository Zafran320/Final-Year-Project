import { describe, expect, it } from "vitest";
import { STORAGE_KEYS, migrateLegacyStorageKeys } from "./brand";

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));
  return {
    get length() { return data.size; },
    clear: () => data.clear(),
    getItem: key => data.get(key) ?? null,
    key: index => Array.from(data.keys())[index] ?? null,
    removeItem: key => { data.delete(key); },
    setItem: (key, value) => { data.set(key, String(value)); },
  };
}

describe("migrateLegacyStorageKeys", () => {
  it("moves pre-rebrand values to the new keys and removes the old ones", () => {
    const storage = memoryStorage({
      careertwin_saved_jobs: '["job-1"]',
      careertwin_applied_jobs: '["job-2"]',
      "careertwin-theme-v2": "light",
    });

    migrateLegacyStorageKeys(storage);

    expect(storage.getItem(STORAGE_KEYS.savedJobs)).toBe('["job-1"]');
    expect(storage.getItem(STORAGE_KEYS.appliedJobs)).toBe('["job-2"]');
    expect(storage.getItem(STORAGE_KEYS.theme)).toBe("light");
    expect(storage.getItem("careertwin_saved_jobs")).toBeNull();
    expect(storage.getItem("careertwin-theme-v2")).toBeNull();
  });

  it("never overwrites a value already stored under the new key", () => {
    const storage = memoryStorage({ careertwin_saved_jobs: '["old"]', [STORAGE_KEYS.savedJobs]: '["new"]' });

    migrateLegacyStorageKeys(storage);

    expect(storage.getItem(STORAGE_KEYS.savedJobs)).toBe('["new"]');
    expect(storage.getItem("careertwin_saved_jobs")).toBeNull();
  });

  it("does nothing when storage is unavailable", () => {
    expect(() => migrateLegacyStorageKeys(null)).not.toThrow();
  });
});
