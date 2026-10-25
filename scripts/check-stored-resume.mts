import { storageGetSignedUrl } from "../server/storage";
import * as mammoth from "mammoth";

const key = process.argv[2];
if (!key) throw new Error("Usage: pnpm exec tsx scripts/check-stored-resume.mts <storage-key>");
const url = await storageGetSignedUrl(key);
const response = await fetch(url, { redirect: "follow" });
const bytes = Buffer.from(await response.arrayBuffer());
const extracted = await mammoth.extractRawText({ buffer: bytes });
console.log(JSON.stringify({ status: response.status, contentType: response.headers.get("content-type"), contentLength: response.headers.get("content-length"), bytes: bytes.length, magicHex: bytes.subarray(0, 16).toString("hex"), magicText: bytes.subarray(0, 16).toString("utf8").replace(/[^\x20-\x7e]/g, "."), textLength: extracted.value.length, textPreview: extracted.value.slice(0, 240), warnings: extracted.messages }, null, 2));
