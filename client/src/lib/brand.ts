/* Single source for product branding and branded browser-storage keys. */

export const BRAND_NAME = "FutureMaker AI";
export const BRAND_LOGO_SRC = "/branding/logo.png";

export const STORAGE_KEYS = {
  savedJobs: "futuremaker_saved_jobs",
  appliedJobs: "futuremaker_applied_jobs",
  userGeo: "futuremaker_user_geo",
  userLocation: "futuremaker_user_location",
  theme: "futuremaker-theme-v2",
} as const;

// Keys used before the rebrand; copied once so existing users keep their saved data.
const LEGACY_STORAGE_KEYS: Record<keyof typeof STORAGE_KEYS, string> = {
  savedJobs: "careertwin_saved_jobs",
  appliedJobs: "careertwin_applied_jobs",
  userGeo: "careertwin_user_geo",
  userLocation: "careertwin_user_location",
  theme: "careertwin-theme-v2",
};

export function migrateLegacyStorageKeys(target?: Storage | null): void {
  try {
    // Reading window.localStorage itself can throw when site data is blocked, so resolve it inside the try.
    const storage = target === undefined ? globalThis.localStorage : target;
    if (!storage) return;
    for (const name of Object.keys(STORAGE_KEYS) as (keyof typeof STORAGE_KEYS)[]) {
      const legacyKey = LEGACY_STORAGE_KEYS[name];
      const legacyValue = storage.getItem(legacyKey);
      if (legacyValue === null) continue;
      if (storage.getItem(STORAGE_KEYS[name]) === null) storage.setItem(STORAGE_KEYS[name], legacyValue);
      storage.removeItem(legacyKey);
    }
  } catch {
    // Storage can be unavailable (private mode, blocked site data); branding must never break startup.
  }
}
