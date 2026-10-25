import type { Express } from "express";
import fs from "node:fs";
import path from "node:path";
import { getSupabaseAdmin, getSupabaseClient } from "../supabase";

const LOCAL_STORAGE_DIR = path.resolve(process.cwd(), ".storage");
const STORAGE_BUCKET = "careertwin-storage";

/**
 * Resolves a storage key to a path inside LOCAL_STORAGE_DIR, or null when the key
 * would escape it (e.g. "../.env" or an absolute path).
 */
export function resolveLocalStoragePath(key: string): string | null {
  if (!key || key.includes("\0")) return null;
  const resolved = path.resolve(LOCAL_STORAGE_DIR, key);
  if (!resolved.startsWith(LOCAL_STORAGE_DIR + path.sep)) return null;
  return resolved;
}

export function registerStorageProxy(app: Express) {
  const handleFileRequest = async (key: string, res: any) => {
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    const localFilePath = resolveLocalStoragePath(key);
    if (!localFilePath) {
      res.status(400).send("Invalid storage key");
      return;
    }

    // 1. Check local disk mirror first for ultra-fast response.
    // dotfiles: "allow" is needed because the mirror itself lives in ".storage".
    if (fs.existsSync(localFilePath) && fs.statSync(localFilePath).isFile()) {
      res.sendFile(localFilePath, { dotfiles: "allow" });
      return;
    }

    // 2. Fallback to Supabase public / signed URL
    const supabase = getSupabaseAdmin() || getSupabaseClient();
    if (supabase) {
      try {
        const { data: publicData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(key);
        if (publicData?.publicUrl) {
          res.redirect(307, publicData.publicUrl);
          return;
        }
      } catch (err) {
        console.warn("[StorageProxy] Supabase redirect error:", err);
      }
    }

    res.status(404).send("File not found");
  };

  app.get("/local-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    await handleFileRequest(key, res);
  });

  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    await handleFileRequest(key, res);
  });
}
