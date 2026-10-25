import fs from "node:fs/promises";
import path from "node:path";
import { getSupabaseAdmin, getSupabaseClient } from "./supabase";

const STORAGE_BUCKET = "careertwin-storage";
const isServerlessEnv = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const LOCAL_STORAGE_DIR = isServerlessEnv
  ? path.resolve("/tmp", ".storage")
  : path.resolve(process.cwd(), ".storage");

let _bucketEnsured = false;

async function ensureLocalDir(filePath: string) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

async function ensureBucket() {
  if (_bucketEnsured) return;
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some(b => b.name === STORAGE_BUCKET);
    if (!exists) {
      await supabase.storage.createBucket(STORAGE_BUCKET, {
        public: true,
        fileSizeLimit: 10485760, // 10MB
      });
    }
    _bucketEnsured = true;
  } catch (err) {
    console.warn("[Storage] Note on bucket creation:", err);
  }
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const buffer = typeof data === "string" ? Buffer.from(data, "utf-8") : Buffer.from(data);

  // 1. Try Supabase Storage
  const supabase = getSupabaseAdmin() || getSupabaseClient();
  if (supabase) {
    try {
      await ensureBucket();
      const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(key, buffer, {
        contentType,
        upsert: true,
      });

      if (!error) {
        const { data: publicData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(key);
        if (publicData?.publicUrl) {
          // Also save locally as fast mirror
          try {
            const localPath = path.join(LOCAL_STORAGE_DIR, key);
            await ensureLocalDir(localPath);
            await fs.writeFile(localPath, buffer);
          } catch {}

          return { key, url: publicData.publicUrl };
        }
      } else {
        console.warn("[Storage] Supabase storage upload warning, saving to local mirror:", error.message);
      }
    } catch (supaErr) {
      console.warn("[Storage] Supabase storage exception:", supaErr);
    }
  }

  // 2. Local disk fallback (Always reliable)
  const localPath = path.join(LOCAL_STORAGE_DIR, key);
  await ensureLocalDir(localPath);
  await fs.writeFile(localPath, buffer);

  return { key, url: `/local-storage/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const supabase = getSupabaseAdmin() || getSupabaseClient();

  if (supabase) {
    const { data: publicData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(key);
    if (publicData?.publicUrl) {
      return { key, url: publicData.publicUrl };
    }
  }

  return { key, url: `/local-storage/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);

  // 1. Try Supabase Storage Signed URL
  const supabase = getSupabaseAdmin() || getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(key, 3600);
      if (!error && data?.signedUrl) {
        return data.signedUrl;
      }
    } catch {}

    const { data: publicData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(key);
    if (publicData?.publicUrl) {
      return publicData.publicUrl;
    }
  }

  // 2. Local storage URL fallback
  return `/local-storage/${key}`;
}

export async function storageGetBuffer(relKey: string): Promise<Buffer | null> {
  const key = normalizeKey(relKey);

  // 1. Try local disk first (fastest, zero network overhead)
  try {
    const localPath = path.join(LOCAL_STORAGE_DIR, key);
    const buf = await fs.readFile(localPath);
    if (buf && buf.length > 0) return buf;
  } catch {}

  // 2. Try Supabase Storage download
  const supabase = getSupabaseAdmin() || getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(key);
      if (!error && data) {
        const arrayBuf = await data.arrayBuffer();
        return Buffer.from(arrayBuf);
      }
    } catch {}
  }

  return null;
}
