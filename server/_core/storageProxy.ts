import type { Express } from "express";
import fs from "node:fs";
import path from "node:path";
import { getSupabaseAdmin, getSupabaseClient } from "../supabase";

const LOCAL_STORAGE_DIR = path.resolve(process.cwd(), ".storage");
const STORAGE_BUCKET = "careertwin-storage";

export function registerStorageProxy(app: Express) {
  const handleFileRequest = async (key: string, res: any) => {
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    // 1. Check local disk mirror first for ultra-fast response
    const localFilePath = path.join(LOCAL_STORAGE_DIR, key);
    if (fs.existsSync(localFilePath)) {
      res.sendFile(localFilePath);
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
