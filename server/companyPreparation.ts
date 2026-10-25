import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as mammoth from "mammoth";
import { convert } from "@opendataloader/pdf";
import { z } from "zod";
import { invokeLLM, type MessageContent } from "./_core/llm";
import { normalizePublicHttpsUrl } from "./gemini";
import { practiceProfileCategories, practiceProfileCategoryIds, type PracticeProfileCategoryId } from "../shared/practiceContext";

const maxSourceBytes = 3 * 1024 * 1024;
const maxCombinedFileBytes = 7 * 1024 * 1024;
const maxSourceTextCharacters = 18_000;
const maxCombinedSourceCharacters = 58_000;
const fetchTimeoutMs = 8_000;
const maxRedirects = 3;
const allowedFileMimeTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const companyPreparationInput = z.object({
  companyName: z.string().trim().min(1, "Add the company name.").max(180),
  companyWebsite: z.string().trim().max(500).default(""),
  targetRole: z.string().trim().min(1, "Add the target role.").max(180),
  jobDescription: z.string().trim().max(18_000).default(""),
  notes: z.string().trim().max(8_000).default(""),
  profileCategoryIds: z.array(z.enum(practiceProfileCategoryIds)).max(practiceProfileCategories.length).default(practiceProfileCategoryIds),
  links: z.array(z.string().trim().max(500)).max(8).default([]),
  files: z.array(z.object({
    name: z.string().trim().min(1).max(180),
    mimeType: z.enum(allowedFileMimeTypes),
    contentBase64: z.string().min(4).max(4_500_000),
  })).max(4).default([]),
});

export type CompanyPreparationInput = z.infer<typeof companyPreparationInput>;

const companyBriefSchema = z.object({
  companySummary: z.string().trim().min(1).max(1_500),
  roleSummary: z.string().trim().min(1).max(1_500),
  responsibilities: z.array(z.string().trim().min(1).max(260)).max(10),
  requiredSkills: z.array(z.string().trim().min(1).max(100)).max(18),
  preferredSkills: z.array(z.string().trim().min(1).max(100)).max(18),
  technologySignals: z.array(z.string().trim().min(1).max(100)).max(14),
  interviewThemes: z.array(z.string().trim().min(1).max(180)).max(12),
  workingStyleSignals: z.array(z.string().trim().min(1).max(180)).max(10),
  sourceAttributions: z.array(z.object({
    sourceLabel: z.string().trim().min(1).max(180),
    support: z.string().trim().min(1).max(360),
  })).max(18),
  uncertaintyNotes: z.array(z.string().trim().min(1).max(260)).max(10),
});

export type CompanyBrief = z.infer<typeof companyBriefSchema>;

export type CompanySourceStatus = {
  label: string;
  kind: "website" | "link" | "document" | "image" | "job-details" | "notes";
  status: "analyzed" | "unavailable";
  url?: string;
  detail: string;
};

type PreparedSource = CompanySourceStatus & {
  text?: string;
  imageDataUrl?: string;
};

type ParsedPdf = { text: string };

function base64ByteSize(value: string) {
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  return Math.floor((value.length * 3) / 4) - padding;
}

function isPrivateAddress(address: string) {
  const version = isIP(address);
  if (version === 4) {
    const [a, b] = address.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
  }
  if (version === 6) {
    const normalized = address.toLowerCase();
    return normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb") || normalized.startsWith("::ffff:10.") || normalized.startsWith("::ffff:192.168.") || normalized.startsWith("::ffff:172.");
  }
  return true;
}

async function assertPublicUrl(raw: string) {
  const normalized = normalizePublicHttpsUrl(raw);
  if (!normalized) throw new Error("Use a valid public HTTP(S) source URL.");
  const url = new URL(normalized);
  if (url.username || url.password || (url.port && !["80", "443"].includes(url.port))) throw new Error("This source URL is not allowed.");
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) throw new Error("This source must resolve to a public address.");
  return url;
}

async function readResponseBytes(response: Response) {
  if (!response.body) return Buffer.from(await response.arrayBuffer());
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      total += part.value.byteLength;
      if (total > maxSourceBytes) throw new Error("This source is larger than the 3 MB analysis limit.");
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
}

function decodeHtmlEntities(value: string) {
  return value.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'");
}

function htmlToText(html: string) {
  const title = decodeHtmlEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/\s+/g, " ").trim().slice(0, 180);
  const text = decodeHtmlEntities(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<noscript[\s\S]*?<\/noscript>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()).slice(0, maxSourceTextCharacters);
  return { title, text };
}

function flattenPdfElements(value: unknown, output: string[]) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) flattenPdfElements(item, output);
    return;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.content === "string" && record.content.trim()) output.push(record.content.trim());
  for (const [key, child] of Object.entries(record)) if (key !== "content") flattenPdfElements(child, output);
}

async function extractPdfText(buffer: Buffer): Promise<ParsedPdf> {
  const directory = await mkdtemp(join(tmpdir(), "careertwin-company-"));
  const inputPath = join(directory, "source.pdf");
  try {
    await writeFile(inputPath, buffer);
    await convert(inputPath, { outputDir: directory, format: ["json"], quiet: true, readingOrder: "xycut", keepLineBreaks: true, imageOutput: "off", threads: "1" });
    const parsed = JSON.parse(await readFile(join(directory, "source.json"), "utf8"));
    const parts: string[] = [];
    flattenPdfElements(parsed, parts);
    const text = parts.join("\n").replace(/\u0000/g, "").trim().slice(0, maxSourceTextCharacters);
    if (!text) throw new Error("No readable text was found in this PDF.");
    return { text };
  } finally {
    await rm(directory, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function preparePublicSource(rawUrl: string, label: string, kind: "website" | "link") {
  try {
    let currentUrl = await assertPublicUrl(rawUrl);
    for (let redirect = 0; redirect <= maxRedirects; redirect += 1) {
      const response = await fetch(currentUrl, { redirect: "manual", headers: { Accept: "text/html,text/plain,application/pdf,image/jpeg,image/png,image/webp", "User-Agent": "CareerTwin-AI-source-preview/1.0" }, signal: AbortSignal.timeout(fetchTimeoutMs) });
      if (response.status >= 300 && response.status < 400) {
        if (redirect === maxRedirects) throw new Error("This source redirected too many times.");
        const location = response.headers.get("location");
        if (!location) throw new Error("This source returned an incomplete redirect.");
        currentUrl = await assertPublicUrl(new URL(location, currentUrl).toString());
        continue;
      }
      if (!response.ok) throw new Error(`Source returned HTTP ${response.status}.`);
      const declaredLength = Number(response.headers.get("content-length") ?? 0);
      if (declaredLength > maxSourceBytes) throw new Error("This source is larger than the 3 MB analysis limit.");
      const bytes = await readResponseBytes(response);
      const contentType = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
      if (contentType === "text/html" || contentType === "text/plain" || (!contentType && !currentUrl.pathname.toLowerCase().endsWith(".pdf"))) {
        const { title, text } = htmlToText(bytes.toString("utf8"));
        if (!text) throw new Error("No readable text was found on this source.");
        return { label: title || label, kind, status: "analyzed" as const, url: currentUrl.toString(), detail: "Public source fetched and summarized for this analysis.", text } satisfies PreparedSource;
      }
      if (contentType === "application/pdf" || currentUrl.pathname.toLowerCase().endsWith(".pdf")) {
        const { text } = await extractPdfText(bytes);
        return { label, kind, status: "analyzed" as const, url: currentUrl.toString(), detail: "Public PDF fetched and parsed for this analysis.", text } satisfies PreparedSource;
      }
      if (contentType.startsWith("image/")) {
        return { label, kind: "image" as const, status: "analyzed" as const, url: currentUrl.toString(), detail: "Public image fetched for visual analysis.", imageDataUrl: `data:${contentType};base64,${bytes.toString("base64")}` } satisfies PreparedSource;
      }
      throw new Error("This source type is not supported for analysis.");
    }
    throw new Error("The source could not be followed safely.");
  } catch (error) {
    return { label, kind, status: "unavailable" as const, url: normalizePublicHttpsUrl(rawUrl) || undefined, detail: error instanceof Error ? error.message.slice(0, 180) : "Source could not be read." } satisfies PreparedSource;
  }
}

async function prepareUploadedSource(file: CompanyPreparationInput["files"][number]): Promise<PreparedSource> {
  const base64Size = base64ByteSize(file.contentBase64);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(file.contentBase64) || base64Size <= 0 || base64Size > maxSourceBytes) return { label: file.name, kind: file.mimeType.startsWith("image/") ? "image" : "document", status: "unavailable", detail: "This file is larger than the 3 MB analysis limit or could not be validated." };
  try {
    const bytes = Buffer.from(file.contentBase64, "base64");
    if (file.mimeType === "image/jpeg" || file.mimeType === "image/png" || file.mimeType === "image/webp") return { label: file.name, kind: "image", status: "analyzed", detail: "User-uploaded image prepared for visual analysis.", imageDataUrl: `data:${file.mimeType};base64,${file.contentBase64}` };
    if (file.mimeType === "application/pdf") {
      const { text } = await extractPdfText(bytes);
      return { label: file.name, kind: "document", status: "analyzed", detail: "User-uploaded PDF parsed for this analysis.", text };
    }
    if (file.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const text = (await mammoth.extractRawText({ buffer: bytes })).value.replace(/\s+/g, " ").trim().slice(0, maxSourceTextCharacters);
      if (!text) throw new Error("No readable text was found in this DOCX file.");
      return { label: file.name, kind: "document", status: "analyzed", detail: "User-uploaded DOCX parsed for this analysis.", text };
    }
    throw new Error("Legacy DOC files need to be converted to PDF or DOCX before analysis.");
  } catch (error) {
    return { label: file.name, kind: "document", status: "unavailable", detail: error instanceof Error ? error.message.slice(0, 180) : "File could not be read." };
  }
}

type ProfileContextSummary = {
  text: string;
  includedCategoryIds: PracticeProfileCategoryId[];
  includedFieldCount: number;
};

function profileContext(profile: Record<string, unknown> | null, selectedCategoryIds: PracticeProfileCategoryId[]): ProfileContextSummary {
  if (!profile) return { text: "No saved CareerTwin profile is available. Use only the selected company and role material.", includedCategoryIds: [], includedFieldCount: 0 };
  const selected = new Set(selectedCategoryIds);
  const contextLines: string[] = [];
  const includedCategoryIds: PracticeProfileCategoryId[] = [];
  let includedFieldCount = 0;
  for (const category of practiceProfileCategories) {
    if (!selected.has(category.id)) continue;
    const values = category.fields.map((field) => [field, profile[field]] as const).filter(([, value]) => typeof value === "string" && value.trim()).map(([field, value]) => `${field}: ${String(value).slice(0, 6_000)}`);
    if (!values.length) continue;
    includedCategoryIds.push(category.id);
    includedFieldCount += values.length;
    contextLines.push(`${category.label}:\n${values.join("\n")}`);
  }
  return {
    text: contextLines.length ? contextLines.join("\n\n") : "No selected saved CareerTwin profile fields are available. Use only the selected company and role material.",
    includedCategoryIds,
    includedFieldCount,
  };
}

function contentText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((item) => contentText(item)).join("\n");
  if (content && typeof content === "object" && "text" in content) return String((content as { text?: unknown }).text ?? "");
  return "";
}

function parseModelJson(value: string) {
  const cleaned = value.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try { return JSON.parse(cleaned); } catch { const start = cleaned.indexOf("{"); const end = cleaned.lastIndexOf("}"); if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1)); throw new Error("Gemini returned an unreadable company brief."); }
}

type RecoveryText = { value: string; usable: boolean; repaired: boolean };

type RecoveryResult = { brief?: CompanyBrief; repaired: boolean };

function recoverText(value: unknown, max: number, fallback: string): RecoveryText {
  if (typeof value !== "string") return { value: fallback, usable: false, repaired: value !== undefined };
  const trimmed = value.trim();
  if (!trimmed) return { value: fallback, usable: false, repaired: true };
  return { value: trimmed.slice(0, max), usable: true, repaired: trimmed !== value || trimmed.length > max };
}

function recoverList(value: unknown, maxItems: number, maxItemLength: number): { values: string[]; repaired: boolean } {
  if (value === undefined) return { values: [], repaired: false };
  if (!Array.isArray(value)) return { values: [], repaired: true };
  let repaired = false;
  const values: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") {
      repaired = true;
      continue;
    }
    const trimmed = item.trim();
    if (!trimmed) {
      repaired = true;
      continue;
    }
    const bounded = trimmed.slice(0, maxItemLength);
    repaired ||= bounded !== item;
    values.push(bounded);
  }
  if (values.length > maxItems) repaired = true;
  return { values: values.slice(0, maxItems), repaired };
}

function recoverAttributions(value: unknown): { values: CompanyBrief["sourceAttributions"]; repaired: boolean } {
  if (value === undefined) return { values: [], repaired: false };
  if (!Array.isArray(value)) return { values: [], repaired: true };
  let repaired = false;
  const values: CompanyBrief["sourceAttributions"] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") {
      repaired = true;
      continue;
    }
    const record = item as Record<string, unknown>;
    const sourceLabel = typeof record.sourceLabel === "string" ? record.sourceLabel.trim() : "";
    const support = typeof record.support === "string" ? record.support.trim() : "";
    if (!sourceLabel || !support) {
      repaired = true;
      continue;
    }
    values.push({ sourceLabel: sourceLabel.slice(0, 180), support: support.slice(0, 360) });
    repaired ||= sourceLabel.length > 180 || support.length > 360;
  }
  if (values.length > 18) repaired = true;
  return { values: values.slice(0, 18), repaired };
}

function recoverCompanyBrief(value: unknown, sourceCount: number): RecoveryResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { repaired: false };
  const record = value as Record<string, unknown>;
  const companySummary = recoverText(record.companySummary, 1_500, "Gemini did not return a company summary. Review the selected company sources.");
  const roleSummary = recoverText(record.roleSummary, 1_500, "Gemini did not return a role summary. Review the selected role material.");
  const responsibilities = recoverList(record.responsibilities, 10, 260);
  const requiredSkills = recoverList(record.requiredSkills, 18, 100);
  const preferredSkills = recoverList(record.preferredSkills, 18, 100);
  const technologySignals = recoverList(record.technologySignals, 14, 100);
  const interviewThemes = recoverList(record.interviewThemes, 12, 180);
  const workingStyleSignals = recoverList(record.workingStyleSignals, 10, 180);
  const sourceAttributions = recoverAttributions(record.sourceAttributions);
  const uncertaintyNotes = recoverList(record.uncertaintyNotes, 10, 260);
  let repaired = [companySummary, roleSummary, responsibilities, requiredSkills, preferredSkills, technologySignals, interviewThemes, workingStyleSignals, sourceAttributions, uncertaintyNotes].some((part) => part.repaired);
  const hasUsableEvidence = [responsibilities, requiredSkills, preferredSkills, technologySignals, interviewThemes, workingStyleSignals, sourceAttributions].some((part) => part.values.length > 0);
  if (!companySummary.usable && !roleSummary.usable && !hasUsableEvidence) return { repaired, brief: undefined };
  const notes = uncertaintyNotes.values.slice(0, 10);
  if (repaired && sourceCount > 0) {
    const recoveryNote = "Some model-provided details were blank or malformed and were omitted. Verify the selected sources before relying on this brief.";
    if (!notes.includes(recoveryNote)) {
      if (notes.length >= 10) notes.pop();
      notes.push(recoveryNote);
    }
  }
  return {
    repaired,
    brief: {
      companySummary: companySummary.value,
      roleSummary: roleSummary.value,
      responsibilities: responsibilities.values,
      requiredSkills: requiredSkills.values,
      preferredSkills: preferredSkills.values,
      technologySignals: technologySignals.values,
      interviewThemes: interviewThemes.values,
      workingStyleSignals: workingStyleSignals.values,
      sourceAttributions: sourceAttributions.values,
      uncertaintyNotes: notes,
    },
  };
}

const companyBriefResponseSchema = {
  type: "object",
  properties: {
    companySummary: { type: "string" }, roleSummary: { type: "string" },
    responsibilities: { type: "array", items: { type: "string" } }, requiredSkills: { type: "array", items: { type: "string" } }, preferredSkills: { type: "array", items: { type: "string" } }, technologySignals: { type: "array", items: { type: "string" } }, interviewThemes: { type: "array", items: { type: "string" } }, workingStyleSignals: { type: "array", items: { type: "string" } },
    sourceAttributions: { type: "array", items: { type: "object", properties: { sourceLabel: { type: "string" }, support: { type: "string" } }, required: ["sourceLabel", "support"], additionalProperties: false } },
    uncertaintyNotes: { type: "array", items: { type: "string" } },
  },
  required: ["companySummary", "roleSummary", "responsibilities", "requiredSkills", "preferredSkills", "technologySignals", "interviewThemes", "workingStyleSignals", "sourceAttributions", "uncertaintyNotes"],
  additionalProperties: false,
};

export async function analyzeCompanyPreparation(input: CompanyPreparationInput, profile: Record<string, unknown> | null) {
  const sources: PreparedSource[] = [];
  const seenUrls = new Set<string>();
  const urlInputs = [input.companyWebsite, ...input.links].map((value) => value.trim()).filter(Boolean);
  for (const rawUrl of urlInputs) {
    const normalized = normalizePublicHttpsUrl(rawUrl);
    if (!normalized || seenUrls.has(normalized)) {
      if (!normalized) sources.push({ label: rawUrl.slice(0, 180), kind: "link", status: "unavailable", detail: "Use a valid public HTTP(S) source URL." });
      continue;
    }
    seenUrls.add(normalized);
    sources.push(await preparePublicSource(normalized, input.companyWebsite && normalized === normalizePublicHttpsUrl(input.companyWebsite) ? "Company website" : "Public source", input.companyWebsite && normalized === normalizePublicHttpsUrl(input.companyWebsite) ? "website" : "link"));
  }
  const totalFileBytes = input.files.reduce((sum, file) => sum + base64ByteSize(file.contentBase64), 0);
  if (totalFileBytes > maxCombinedFileBytes) throw new Error("Keep supporting files under 7 MB combined for one analysis.");
  for (const file of input.files) sources.push(await prepareUploadedSource(file));
  if (input.jobDescription) sources.push({ label: "Role description", kind: "job-details", status: "analyzed", detail: "User-provided role details included.", text: input.jobDescription });
  if (input.notes) sources.push({ label: "Preparation notes", kind: "notes", status: "analyzed", detail: "User-provided notes included.", text: input.notes });

  const readableSources = sources.filter((source) => source.status === "analyzed");
  const textSources = readableSources.filter((source) => source.text).map((source) => `SOURCE: ${source.label}\nTYPE: ${source.kind}\nCONTENT:\n${source.text}`).join("\n\n").slice(0, maxCombinedSourceCharacters);
  const imageSources = readableSources.filter((source) => source.imageDataUrl).slice(0, 3);
  if (!textSources && !imageSources.length) throw new Error("Add readable company or role material before starting analysis.");

  const sourceLabels = sources.map((source) => `${source.label} (${source.status})`).join(", ");
  const accountContext = profileContext(profile, input.profileCategoryIds);
  const prompt = `You are CareerTwin AI's company-preparation analyst for a private interview-practice workspace. Analyze only the user-supplied company and role material below, then connect it to the saved CareerTwin preparation profile. Do not claim that you visited a source unless it is listed as analyzed. Do not invent company facts, open roles, compensation, culture, employees, locations, interview stages, or technologies. Separate explicit evidence from preparation hypotheses in uncertaintyNotes. Do not output phone numbers, email addresses, private URLs, or raw resume text. Return JSON only.

Company: ${input.companyName}
Target role: ${input.targetRole}
Selected saved CareerTwin preparation context (only the enabled categories below):
${accountContext.text}

Excluded by design: contact identity fields, uploaded resume file contents, and all local illustrative LinkedIn, Indeed, GitHub, Upwork, and Fiverr connector fixtures. Do not reference excluded data.

Available source statuses: ${sourceLabels}

Return a concise reviewable brief with:
- companySummary: evidence-grounded company or product summary
- roleSummary: what this target role appears to involve
- responsibilities: explicit responsibilities and careful preparation-oriented inferences
- requiredSkills: skills explicitly required or strongly signaled
- preferredSkills: optional or adjacent skills
- technologySignals: explicit tools, languages, platforms, or technical areas
- interviewThemes: themes CareerTwin can use for later question generation
- workingStyleSignals: only explicit or carefully qualified signals
- sourceAttributions: sourceLabel plus a short support statement for the strongest claims
- uncertaintyNotes: any missing context, inference, or ambiguity the user should verify

Company/job sources:
${textSources || "No text extraction was available; use the supplied images only."}`;
  const messageContent: MessageContent[] = [{ type: "text", text: prompt }, ...imageSources.map((source) => ({ type: "image_url" as const, image_url: { url: source.imageDataUrl!, detail: "auto" as const } }))];

  let response;
  try {
    response = await invokeLLM({ model: "gemini-3-flash-preview", messages: [{ role: "system", content: "You produce precise, privacy-safe JSON for interview preparation." }, { role: "user", content: messageContent }], maxTokens: 8_000, response_format: { type: "json_schema", json_schema: { name: "company_preparation_brief", strict: true, schema: companyBriefResponseSchema } } });
  } catch (error) {
    console.warn(`[Company AI] Analysis request failed: ${error instanceof Error ? error.message.slice(0, 180) : "unknown error"}`);
    throw new Error("Company and role analysis is unavailable right now. Your material was not saved; please retry in a moment.");
  }
  const text = contentText(response.choices[0]?.message?.content);
  const rawBrief = parseModelJson(text);
  const recovered = recoverCompanyBrief(rawBrief, sources.length);
  if (!recovered.brief) {
    console.warn("[Company AI] Structured brief had no usable company or role evidence after normalization");
    throw new Error("Gemini returned an incomplete company brief. Your material was not saved; please retry the analysis.");
  }
  if (recovered.repaired) {
    console.warn("[Company AI] Recovered a partial brief by omitting blank or malformed model details");
  }
  return {
    brief: recovered.brief,
    sources: sources.map(({ text: _text, imageDataUrl: _imageDataUrl, ...source }) => source),
    accountContext: {
      includedCategoryIds: accountContext.includedCategoryIds,
      includedFieldCount: accountContext.includedFieldCount,
      connectorContextIncluded: false as const,
      persisted: false as const,
    },
  };
}
