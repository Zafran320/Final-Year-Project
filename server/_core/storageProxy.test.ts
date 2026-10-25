import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveLocalStoragePath } from "./storageProxy";

const STORAGE_DIR = path.resolve(process.cwd(), ".storage");

describe("resolveLocalStoragePath", () => {
  it("resolves normal keys inside the storage directory", () => {
    expect(resolveLocalStoragePath("resumes/user-1/cv.pdf")).toBe(path.join(STORAGE_DIR, "resumes/user-1/cv.pdf"));
  });

  it("rejects keys that traverse out of the storage directory", () => {
    expect(resolveLocalStoragePath("../.env")).toBeNull();
    expect(resolveLocalStoragePath("../../../../etc/passwd")).toBeNull();
    expect(resolveLocalStoragePath("resumes/../../server/supabase.ts")).toBeNull();
  });

  it("rejects absolute paths, the directory itself, and null bytes", () => {
    expect(resolveLocalStoragePath("/etc/passwd")).toBeNull();
    expect(resolveLocalStoragePath(".")).toBeNull();
    expect(resolveLocalStoragePath("")).toBeNull();
    expect(resolveLocalStoragePath("cv.pdf\0.png")).toBeNull();
  });
});
