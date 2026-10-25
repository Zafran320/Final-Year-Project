import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { z } from "zod";
import * as mammoth from "mammoth";
import { convert } from "@opendataloader/pdf";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { normalizePublicHttpsUrl as normalizeSharedPublicHttpsUrl } from "@shared/publicUrl";

// Polyfill DOMMatrix for Node.js / Vercel serverless environment (required by pdf-parse v2)
if (typeof (globalThis as any).DOMMatrix === "undefined") {
  (globalThis as any).DOMMatrix = class DOMMatrix {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    m11 = 1; m12 = 0; m13 = 0; m14 = 0;
    m21 = 0; m22 = 1; m23 = 0; m24 = 0;
    m31 = 0; m32 = 0; m33 = 1; m34 = 0;
    m41 = 0; m42 = 0; m43 = 0; m44 = 1;
    is2D = true; isIdentity = true;
    constructor(init?: any) {
      if (Array.isArray(init)) {
        this.a = init[0] ?? 1; this.b = init[1] ?? 0;
        this.c = init[2] ?? 0; this.d = init[3] ?? 1;
        this.e = init[4] ?? 0; this.f = init[5] ?? 0;
      }
    }
  };
}

export function getGeminiApiKey(): string | undefined {
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0) {
    return process.env.GEMINI_API_KEY.trim().replace(/^["']|["']$/g, "");
  }
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      const match = content.match(/^GEMINI_API_KEY=["']?([^"'\r\n]+)["']?/m);
      if (match && match[1]) {
        const key = match[1].trim().replace(/^["']|["']$/g, "");
        process.env.GEMINI_API_KEY = key;
        return key;
      }
    }
  } catch {}
  return undefined;
}

let _cachedModels: string[] = [];
let _modelsCachedAt = 0;

// Known-good ordered preference list – prioritize ultra-fast, modern flash models
const PREFERRED_MODEL_ORDER = [
  "gemini-3.1-flash-lite",
  "gemini-3.7-flash",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite-preview",
  "gemini-2.5-flash",
  "gemini-flash-latest",
];

// Skip models known to be unavailable, 404, or non-text
const SKIP_MODELS = new Set([
  "gemini-2.5-pro",         // 404 / slow
  "gemini-pro-latest",      // frequent 429
  "gemini-omni-flash-preview",
  "gemini-omni-1.1-flash",
  "deep-research-max-preview-04-2026",
  "deep-research-preview-04-2026",
  "deep-research-pro-preview-12-2025",
  "antigravity-preview-05-2026",
  "nano-banana-pro-preview",
]);

export async function getAutoDiscoveredGeminiModels(apiKey: string): Promise<string[]> {
  if (process.env.NODE_ENV === "test" || apiKey === "test-key") {
    return [process.env.GEMINI_MODEL || "gemini-1.5-flash"];
  }

  if (_cachedModels.length > 0 && Date.now() - _modelsCachedAt < 10 * 60 * 1000) {
    return _cachedModels;
  }

  let availableFromApi: string[] = [];
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = (await res.json()) as { models?: Array<{ name?: string; supportedGenerationMethods?: string[] }> };
      if (Array.isArray(data.models)) {
        availableFromApi = data.models
          .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
          .map((m) => (m.name || "").replace(/^models\//, ""))
          .filter((m) => Boolean(m) && !SKIP_MODELS.has(m) && !m.toLowerCase().includes("tts"));
      }
    }
  } catch {
    availableFromApi = PREFERRED_MODEL_ORDER.filter((m) => !SKIP_MODELS.has(m));
  }

  // Sort by preference order; anything not in preferred list goes to the end
  const sorted = [
    ...PREFERRED_MODEL_ORDER.filter((p) => availableFromApi.length === 0 || availableFromApi.includes(p)),
    ...availableFromApi.filter((a) => !PREFERRED_MODEL_ORDER.includes(a) && (a.includes("flash") || a.includes("pro")) && !a.toLowerCase().includes("tts")),
  ];

  _cachedModels = sorted;
  _modelsCachedAt = Date.now();
  return sorted;
}

const maxPromptCharacters = 80_000;
export const compactResumeSourceTextLimit = 28_000;
export const geminiResumeRequestTimeoutMs = 35_000;
export const geminiResumeFallbackTimeoutMs = 20_000;
export const geminiQualificationRecoveryTimeoutMs = 10_000;

const resumeFieldNames = ["fullName", "location", "phone", "contactEmail", "linkedinUrl", "portfolioUrl", "age", "education", "degree", "careerStatus", "currentJob", "company", "lookingFor", "careerField", "targetRole", "skills", "experience", "professionalSummary", "certifications", "languages", "projects", "verifiedDetails"] as const;
const fieldEvidenceSchema = z.object({
  confidence: z.number().min(0).max(1),
  sourceText: z.string().trim().max(360),
});
const evidenceShape = Object.fromEntries(resumeFieldNames.map((name) => [name, fieldEvidenceSchema])) as Record<(typeof resumeFieldNames)[number], typeof fieldEvidenceSchema>;
export const resumeProjectSchema = z.object({
  name: z.string().trim().max(140),
  summary: z.string().trim().max(700),
  link: z.string().trim().max(500),
  technologies: z.array(z.string().trim().min(1).max(80)).max(16),
});
export const resumeCertificationSchema = z.object({
  name: z.string().trim().max(140),
  issuer: z.string().trim().max(140),
  credentialId: z.string().trim().max(100),
  issuedOn: z.string().trim().max(40),
  link: z.string().trim().max(500),
});
export const resumeLanguageSchema = z.object({
  name: z.string().trim().max(80),
  proficiency: z.enum(["Native", "Professional", "Conversational", "Basic", ""]),
});
export const resumeVerifiedDetailSchema = z.object({
  category: z.enum(["Achievement", "Award", "Coursework", "Leadership", "Volunteer", "Publication", "Training", "Other"]),
  title: z.string().trim().min(1).max(120),
  detail: z.string().trim().min(1).max(260),
});

export const resumeSuggestionSchema = z.object({
  fullName: z.string().trim().max(160),
  location: z.string().trim().max(160),
  phone: z.string().trim().max(64),
  contactEmail: z.string().trim().max(320),
  linkedinUrl: z.string().trim().max(500),
  portfolioUrl: z.string().trim().max(500),
  age: z.number().int().min(0).max(120),
  education: z.enum(["Bachelor's", "Master's", "MPhil", "PhD", "Diploma", "Other", ""]),
  degree: z.string().trim().max(180),
  careerStatus: z.enum(["working", "seeking", ""]),
  currentJob: z.string().trim().max(180),
  company: z.string().trim().max(180),
  lookingFor: z.enum(["First Job", "Internship", "Freelance", "Career Switch", "Higher Studies", ""]),
  careerField: z.string().trim().max(120),
  targetRole: z.string().trim().max(180),
  skills: z.array(z.string().trim().min(1).max(120)).max(40),
  experience: z.string().trim().max(6000),
  professionalSummary: z.string().trim().max(1600),
  certifications: z.array(resumeCertificationSchema).max(12),
  languages: z.array(resumeLanguageSchema).max(10),
  projects: z.array(resumeProjectSchema).max(8),
  verifiedDetails: z.array(resumeVerifiedDetailSchema).max(16),
  fieldEvidence: z.object(evidenceShape),
});

export type ResumeSuggestions = z.infer<typeof resumeSuggestionSchema>;
type QualificationRecovery = Pick<ResumeSuggestions, "certifications" | "languages" | "projects"> & {
  fieldEvidence: Pick<ResumeSuggestions["fieldEvidence"], "certifications" | "languages" | "projects">;
};

const qualificationRecoverySchema = z.object({
  certifications: z.array(resumeCertificationSchema).max(12),
  languages: z.array(resumeLanguageSchema).max(10),
  projects: z.array(resumeProjectSchema).max(8),
  fieldEvidence: z.object({ certifications: fieldEvidenceSchema, languages: fieldEvidenceSchema, projects: fieldEvidenceSchema }),
});

const responseSchema = {
  type: "object",
  properties: {
    fullName: { type: "string" },
    location: { type: "string" },
    phone: { type: "string" },
    contactEmail: { type: "string" },
    linkedinUrl: { type: "string" },
    portfolioUrl: { type: "string" },
    age: { type: "integer", description: "Explicit age, or age calculated from an explicit date of birth; use 0 only when neither is present." },
    education: { type: "string", enum: ["Bachelor's", "Master's", "MPhil", "PhD", "Diploma", "Other", "unknown"] },
    degree: { type: "string" },
    careerStatus: { type: "string", enum: ["working", "seeking", "unknown"] },
    currentJob: { type: "string" },
    company: { type: "string" },
    lookingFor: { type: "string", enum: ["First Job", "Internship", "Freelance", "Career Switch", "Higher Studies", "unknown"] },
    careerField: { type: "string" },
    targetRole: { type: "string" },
    skills: { type: "array", items: { type: "string" } },
    experience: { type: "string" },
    professionalSummary: { type: "string" },
    certifications: { type: "array", items: { type: "object", properties: { name: { type: "string" }, issuer: { type: "string" }, credentialId: { type: "string" }, issuedOn: { type: "string" }, link: { type: "string" } }, required: ["name"] } },
    languages: { type: "array", items: { type: "object", properties: { name: { type: "string" }, proficiency: { type: "string", enum: ["Native", "Professional", "Conversational", "Basic", "unknown"] } }, required: ["name"] } },
    projects: { type: "array", items: { type: "object", properties: { name: { type: "string" }, summary: { type: "string" }, link: { type: "string" }, technologies: { type: "array", items: { type: "string" } } }, required: ["name"] } },
    verifiedDetails: { type: "array", items: { type: "object", properties: { category: { type: "string", enum: ["Achievement", "Award", "Coursework", "Leadership", "Volunteer", "Publication", "Training", "Other"] }, title: { type: "string" }, detail: { type: "string" } }, required: ["title", "detail"] } },
    fieldEvidence: {
      type: "object",
      properties: Object.fromEntries(resumeFieldNames.map((name) => [name, { type: "object", properties: { confidence: { type: "number" }, sourceText: { type: "string" } }, required: ["confidence", "sourceText"] }])),
    },
  },
  required: ["fullName", "skills", "experience"],
};

function normalizeUnknownEnumValues(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(normalizeUnknownEnumValues);
  const record = value as Record<string, unknown>;
  const normalized = Object.fromEntries(Object.entries(record).map(([key, child]) => [key, normalizeUnknownEnumValues(child)]));
  for (const key of ["education", "careerStatus", "lookingFor", "proficiency"]) if (normalized[key] === "unknown") normalized[key] = "";
  return normalized;
}

export const normalizePublicHttpsUrl = normalizeSharedPublicHttpsUrl;

export function compactResumeSourceText(documentText: string) {
  const seenLines = new Set<string>();
  const uniqueLines = documentText.split(/\n+/).map((line) => line.replace(/\s+/g, " ").trim()).filter((line) => {
    if (!line) return false;
    const key = line.toLocaleLowerCase();
    if (seenLines.has(key)) return false;
    seenLines.add(key);
    return true;
  });
  const compacted = uniqueLines.join("\n").trim();
  if (compacted.length <= compactResumeSourceTextLimit) return compacted;
  const firstSectionLength = Math.floor(compactResumeSourceTextLimit * 0.74);
  const finalSectionLength = compactResumeSourceTextLimit - firstSectionLength;
  return `${compacted.slice(0, firstSectionLength).trim()}\n[Resume content continues]\n${compacted.slice(-finalSectionLength).trim()}`;
}

const educationAliases: Record<string, ResumeSuggestions["education"]> = {
  bachelor: "Bachelor's", bachelors: "Bachelor's", "bachelor's": "Bachelor's", bsc: "Bachelor's", bs: "Bachelor's", be: "Bachelor's", bba: "Bachelor's",
  master: "Master's", masters: "Master's", "master's": "Master's", msc: "Master's", ms: "Master's", mba: "Master's",
  mphil: "MPhil", phd: "PhD", diploma: "Diploma", other: "Other",
};

function normalizeEducation(value: unknown) {
  if (typeof value !== "string") return "";
  const compact = value.trim().toLowerCase().replace(/[^a-z]/g, "");
  if (compact.includes("bachelor") || compact.startsWith("bsc") || compact.startsWith("bs")) return "Bachelor's";
  if (compact.includes("master") || compact.startsWith("msc") || compact.startsWith("ms") || compact.startsWith("mba")) return "Master's";
  if (compact.includes("mphil")) return "MPhil";
  if (compact.includes("phd")) return "PhD";
  if (compact.includes("diploma")) return "Diploma";
  return educationAliases[compact] ?? "";
}

function normalizeCareerStatus(value: unknown) {
  if (typeof value !== "string") return "";
  const compact = value.trim().toLowerCase();
  if (["working", "employed", "currently working", "currently employed"].includes(compact)) return "working";
  if (["seeking", "job seeker", "seeking opportunity", "looking for work", "open to work"].includes(compact)) return "seeking";
  return "";
}

function normalizeLookingFor(value: unknown) {
  if (typeof value !== "string") return "";
  const compact = value.trim().toLowerCase();
  if (["first job", "job", "graduate job", "entry level job"].includes(compact)) return "First Job";
  if (["intern", "internship"].includes(compact)) return "Internship";
  if (["freelance", "freelancing"].includes(compact)) return "Freelance";
  if (["career switch", "switching careers"].includes(compact)) return "Career Switch";
  if (["higher studies", "postgraduate studies", "further study"].includes(compact)) return "Higher Studies";
  return "";
}

function conciseText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maxLength) : "";
}

function experienceEntryToTimelineText(value: unknown) {
  if (typeof value === "string") return conciseText(value, 900);
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const record = value as Record<string, unknown>;
  const role = conciseText(record.role ?? record.title ?? record.position ?? record.jobTitle, 180);
  const organization = conciseText(record.organization ?? record.company ?? record.employer ?? record.institution, 180);
  const location = conciseText(record.location ?? record.city, 120);
  const period = conciseText(record.period ?? record.dates ?? record.dateRange ?? record.duration, 120);
  const description = conciseText(record.description ?? record.summary ?? record.details ?? record.achievements, 440);
  const headline = [role, organization ? `at ${organization}` : ""].filter(Boolean).join(" ");
  const detail = [location, period].filter(Boolean).join(" | ");
  return [headline, detail ? `— ${detail}` : "", description].filter(Boolean).join(" ").trim().slice(0, 900);
}

function recoverExplicitEducation(documentText: string) {
  const candidates = documentText.match(/\b(?:bachelor(?:'s)?|bsc|b\.s\.?|bs|master(?:'s)?|msc|m\.s\.?|ms|mba|mphil|ph\.d\.?|phd|diploma)\b[^\n|•]{0,180}/gi) ?? [];
  const degree = conciseText(candidates[0], 180);
  return degree ? { education: normalizeEducation(degree), degree } : null;
}

function recoverCurrentCareerDirection(experience: string) {
  const currentEntry = experience.split(";").map((entry) => entry.trim()).find((entry) => /\b(?:present|current)\b/i.test(entry));
  if (!currentEntry) return null;
  const match = currentEntry.match(/^(.+?)\s+at\s+(.+?)(?:\s+—|\s+\||$)/i);
  return {
    careerStatus: "working" as const,
    currentJob: conciseText(match?.[1] ?? currentEntry.split(/\s+—|\s+\|/)[0], 180),
    company: conciseText(match?.[2] ?? "", 180),
    sourceText: conciseText(currentEntry, 360),
  };
}

function recoverExplicitCertifications(documentText: string) {
  const seen = new Set<string>();
  return documentText.split(/\n+/).map((line) => conciseText(line, 140)).filter((line) => {
    const key = line.toLocaleLowerCase();
    const isCertification = /\b(?:certificate|certification|certified|course completion|training|credential)\b/i.test(line);
    if (!isCertification || line.length < 8 || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 12).map((name) => ({ name, issuer: "", credentialId: "", issuedOn: "", link: "" }));
}

export function extractExplicitAgeHint(text: string, now = new Date()): { age: number; sourceText: string } | null {
  const explicitAge = text.match(/\bage\s*[:\-]?\s*(\d{1,3})\b|\b(\d{1,3})\s*(?:years?\s*old|yrs?\s*old)\b/i);
  const ageValue = Number(explicitAge?.[1] ?? explicitAge?.[2]);
  if (Number.isInteger(ageValue) && ageValue >= 0 && ageValue <= 120) return { age: ageValue, sourceText: explicitAge?.[0].trim() ?? "" };

  const dob = text.match(/\b(?:date\s*of\s*birth|birth\s*date|dob)\s*[:\-]?\s*((?:\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})|(?:\d{4}[\/.\-]\d{1,2}[\/.\-]\d{1,2})|(?:\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}))/i);
  if (!dob?.[1]) return null;
  const value = dob[1].trim();
  let birthDate: Date | null = null;
  const numeric = value.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
  const iso = value.match(/^(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})$/);
  if (numeric) {
    const day = Number(numeric[1]); const month = Number(numeric[2]); const rawYear = Number(numeric[3]);
    const year = rawYear < 100 ? 1900 + rawYear : rawYear;
    birthDate = new Date(year, month - 1, day);
  } else if (iso) {
    birthDate = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  } else {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) birthDate = new Date(parsed);
  }
  if (!birthDate || Number.isNaN(birthDate.getTime()) || birthDate > now) return null;
  let age = now.getFullYear() - birthDate.getFullYear();
  if (now.getMonth() < birthDate.getMonth() || (now.getMonth() === birthDate.getMonth() && now.getDate() < birthDate.getDate())) age -= 1;
  return age >= 0 && age <= 120 ? { age, sourceText: dob[0].trim() } : null;
}

export function normalizeResumePayload(value: unknown, documentText = ""): unknown {
  const normalized = normalizeUnknownEnumValues(value);
  if (!normalized || typeof normalized !== "object" || Array.isArray(normalized)) return normalized;
  const record = normalized as Record<string, unknown>;
  for (const field of ["fullName", "location", "phone", "contactEmail", "linkedinUrl", "portfolioUrl", "degree", "currentJob", "company", "careerField", "targetRole", "professionalSummary"]) {
    if (typeof record[field] !== "string") record[field] = "";
  }
  record.fullName = conciseText(record.fullName, 160);
  record.location = conciseText(record.location, 160);
  record.phone = conciseText(record.phone, 64);
  record.contactEmail = conciseText(record.contactEmail, 320);
  record.degree = conciseText(record.degree, 180);
  record.currentJob = conciseText(record.currentJob, 180);
  record.company = conciseText(record.company, 180);
  record.careerField = conciseText(record.careerField, 120);
  record.targetRole = conciseText(record.targetRole, 180);
  record.professionalSummary = conciseText(record.professionalSummary, 1600);
  record.linkedinUrl = normalizePublicHttpsUrl(record.linkedinUrl);
  record.portfolioUrl = normalizePublicHttpsUrl(record.portfolioUrl);
  record.education = normalizeEducation(record.education);
  record.careerStatus = normalizeCareerStatus(record.careerStatus);
  record.lookingFor = normalizeLookingFor(record.lookingFor);
  const numericAge = typeof record.age === "number" ? record.age : Number(record.age);
  record.age = Number.isInteger(numericAge) && numericAge >= 0 && numericAge <= 120 ? numericAge : 0;
  
  // Intelligent contact / location regex fallbacks from document text if omitted by model
  if (documentText) {
    if (!record.contactEmail) {
      const emailMatch = documentText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) record.contactEmail = conciseText(emailMatch[0], 320);
    }
    if (!record.phone) {
      const phoneMatch = documentText.match(/(?:\+?\d{1,4}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/);
      if (phoneMatch && phoneMatch[0].replace(/\D/g, "").length >= 7) {
        record.phone = conciseText(phoneMatch[0], 64);
      }
    }
    if (!record.linkedinUrl) {
      const linkedinMatch = documentText.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_\-\.%]+/i);
      if (linkedinMatch) record.linkedinUrl = normalizePublicHttpsUrl(linkedinMatch[0]);
    }
    if (!record.portfolioUrl) {
      const githubMatch = documentText.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9_\-\.%]+/i);
      if (githubMatch) record.portfolioUrl = normalizePublicHttpsUrl(githubMatch[0]);
    }
  }

  const rawSkills = Array.isArray(record.skills) ? record.skills : typeof record.skills === "string" ? record.skills.split(/[\n,•|]/) : [];
  const seenSkills = new Set<string>();
  record.skills = rawSkills.map((skill) => String(skill).trim()).filter((skill) => {
    if (!skill || seenSkills.has(skill.toLocaleLowerCase())) return false;
    seenSkills.add(skill.toLocaleLowerCase());
    return true;
  }).slice(0, 40);
  const rawExperience = Array.isArray(record.experience) ? record.experience : record.experience ? [record.experience] : [];
  record.experience = rawExperience.map(experienceEntryToTimelineText).filter(Boolean).join("; ").slice(0, 6000);
  const seenCertifications = new Set<string>();
  const rawCertifications = Array.isArray(record.certifications) ? record.certifications : typeof record.certifications === "string" && record.certifications.trim() ? [{ name: record.certifications }] : [];
  record.certifications = rawCertifications.map((certification) => {
    const source = certification && typeof certification === "object" && !Array.isArray(certification) ? certification as Record<string, unknown> : {};
    return {
      name: typeof source.name === "string" ? source.name.trim().slice(0, 140) : "",
      issuer: typeof source.issuer === "string" ? source.issuer.trim().slice(0, 140) : "",
      credentialId: typeof source.credentialId === "string" ? source.credentialId.trim().slice(0, 100) : "",
      issuedOn: typeof source.issuedOn === "string" ? source.issuedOn.trim().slice(0, 40) : "",
      link: normalizePublicHttpsUrl(source.link).slice(0, 500),
    };
  }).filter((certification) => {
    const key = certification.name.toLocaleLowerCase();
    if (!key || seenCertifications.has(key)) return false;
    seenCertifications.add(key);
    return true;
  }).slice(0, 20);
  const rawLanguages = Array.isArray(record.languages) ? record.languages : typeof record.languages === "string" ? record.languages.split(/[\n,•|]/).map((name) => ({ name })) : [];
  const seenLanguages = new Set<string>();
  record.languages = rawLanguages.map((language) => {
    const source = language && typeof language === "object" && !Array.isArray(language) ? language as Record<string, unknown> : {};
    const name = typeof source.name === "string" ? source.name.trim().slice(0, 80) : "";
    const rawProficiency = typeof source.proficiency === "string" ? source.proficiency.trim().toLowerCase() : "";
    const proficiency = rawProficiency === "native" ? "Native" : rawProficiency === "professional" || rawProficiency === "fluent" ? "Professional" : rawProficiency === "conversational" || rawProficiency === "intermediate" ? "Conversational" : rawProficiency === "basic" || rawProficiency === "beginner" ? "Basic" : "";
    return { name, proficiency };
  }).filter((language) => {
    const key = language.name.toLocaleLowerCase();
    if (!key || seenLanguages.has(key)) return false;
    seenLanguages.add(key);
    return true;
  }).slice(0, 10);
  const seenProjects = new Set<string>();
  record.projects = (Array.isArray(record.projects) ? record.projects : []).map((project) => {
    const source = project && typeof project === "object" && !Array.isArray(project) ? project as Record<string, unknown> : {};
    const rawTech = source.technologies ?? source.tech ?? source.tools ?? source.stack ?? [];
    const rawTechnologies = Array.isArray(rawTech) ? rawTech : typeof rawTech === "string" ? rawTech.split(/[\n,•|]/) : [];
    const seenTechnologies = new Set<string>();
    const technologies = rawTechnologies.map((technology) => String(technology).trim()).filter((technology) => {
      if (!technology || seenTechnologies.has(technology.toLocaleLowerCase())) return false;
      seenTechnologies.add(technology.toLocaleLowerCase());
      return true;
    }).slice(0, 16);
    const rawSummary = source.summary ?? source.description ?? source.details ?? "";
    const summary = typeof rawSummary === "string" ? rawSummary.trim().slice(0, 700) : Array.isArray(rawSummary) ? rawSummary.join(" ").trim().slice(0, 700) : "";
    return {
      name: typeof source.name === "string" ? source.name.trim().slice(0, 140) : "",
      summary,
      link: normalizePublicHttpsUrl(source.link).slice(0, 500),
      technologies,
    };
  }).filter((project) => {
    const key = project.name.toLocaleLowerCase();
    if (!key || seenProjects.has(key)) return false;
    seenProjects.add(key);
    return true;
  }).slice(0, 20);
  const verifiedDetailCategories = new Set(["Achievement", "Award", "Coursework", "Leadership", "Volunteer", "Publication", "Training", "Other"]);
  const normalizedDetailSource = documentText.replace(/\s+/g, " ").trim().toLocaleLowerCase();
  const seenVerifiedDetails = new Set<string>();
  record.verifiedDetails = (Array.isArray(record.verifiedDetails) ? record.verifiedDetails : []).map((detail) => {
    const source = detail && typeof detail === "object" && !Array.isArray(detail) ? detail as Record<string, unknown> : {};
    const category = typeof source.category === "string" && verifiedDetailCategories.has(source.category) ? source.category : "Other";
    return { category, title: conciseText(source.title, 120), detail: conciseText(source.detail, 260) };
  }).filter((detail) => {
    const key = `${detail.category}|${detail.title}|${detail.detail}`.toLocaleLowerCase();
    const detailIsGrounded = !normalizedDetailSource ||
      normalizedDetailSource.includes(detail.detail.replace(/\s+/g, " ").toLocaleLowerCase()) ||
      normalizedDetailSource.includes(detail.title.replace(/\s+/g, " ").toLocaleLowerCase());
    if (!detail.title || !detail.detail || !detailIsGrounded || seenVerifiedDetails.has(key)) return false;
    seenVerifiedDetails.add(key);
    return true;
  }).slice(0, 20);
  const rawEvidence = record.fieldEvidence && typeof record.fieldEvidence === "object" && !Array.isArray(record.fieldEvidence) ? record.fieldEvidence as Record<string, unknown> : {};
  const normalizedDocumentText = documentText.replace(/\s+/g, " ").trim().toLocaleLowerCase();
  const fieldEvidence = Object.fromEntries(resumeFieldNames.map((name) => {
    const item = rawEvidence[name] && typeof rawEvidence[name] === "object" && !Array.isArray(rawEvidence[name]) ? rawEvidence[name] as Record<string, unknown> : {};
    const numericConfidence = typeof item.confidence === "number" ? item.confidence : Number(item.confidence);
    const sourceText = typeof item.sourceText === "string" ? item.sourceText.trim().slice(0, 360) : "";
    const sourceIsGrounded = !normalizedDocumentText || !sourceText || normalizedDocumentText.includes(sourceText.replace(/\s+/g, " ").toLocaleLowerCase());
    return [name, sourceIsGrounded ? { confidence: Number.isFinite(numericConfidence) ? Math.max(0, Math.min(1, numericConfidence)) : 0, sourceText } : { confidence: 0, sourceText: "" }];
  }));
  const explicitAge = record.age === 0 ? extractExplicitAgeHint(documentText) : null;
  if (explicitAge) {
    record.age = explicitAge.age;
    fieldEvidence.age = { confidence: explicitAge.sourceText.toLowerCase().includes("dob") || explicitAge.sourceText.toLowerCase().includes("birth") ? 0.9 : 0.98, sourceText: explicitAge.sourceText };
  }
  const explicitEducation = documentText && (!record.education || !record.degree) ? recoverExplicitEducation(documentText) : null;
  if (explicitEducation) {
    if (!record.education && explicitEducation.education) record.education = explicitEducation.education;
    if (!record.degree) record.degree = explicitEducation.degree;
    if (!fieldEvidence.education.sourceText && explicitEducation.education) fieldEvidence.education = { confidence: 0.9, sourceText: explicitEducation.degree };
    if (!fieldEvidence.degree.sourceText) fieldEvidence.degree = { confidence: 0.9, sourceText: explicitEducation.degree };
  }
  const experienceText = typeof record.experience === "string" ? record.experience : "";
  const currentCareer = (!record.careerStatus || !record.currentJob || !record.company) ? recoverCurrentCareerDirection(experienceText) : null;
  if (currentCareer) {
    if (!record.careerStatus) record.careerStatus = currentCareer.careerStatus;
    if (!record.currentJob) record.currentJob = currentCareer.currentJob;
    if (!record.company) record.company = currentCareer.company;
    if (!fieldEvidence.careerStatus.sourceText) fieldEvidence.careerStatus = { confidence: 0.94, sourceText: currentCareer.sourceText };
    if (!fieldEvidence.currentJob.sourceText && currentCareer.currentJob) fieldEvidence.currentJob = { confidence: 0.94, sourceText: currentCareer.sourceText };
    if (!fieldEvidence.company.sourceText && currentCareer.company) fieldEvidence.company = { confidence: 0.94, sourceText: currentCareer.sourceText };
  }
  if (!record.targetRole && record.currentJob) {
    record.targetRole = record.currentJob;
  }
  if (!record.careerField && record.targetRole) {
    record.careerField = record.targetRole;
  }
  const normalizedCertifications = Array.isArray(record.certifications) ? record.certifications : [];
  if (normalizedCertifications.length === 0 && documentText) {
    const explicitCertifications = recoverExplicitCertifications(documentText);
    if (explicitCertifications.length) {
      record.certifications = explicitCertifications;
      fieldEvidence.certifications = { confidence: 0.86, sourceText: explicitCertifications[0]!.name };
    }
  }
  if (!record.contactEmail && documentText) {
    const emailMatch = documentText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
    if (emailMatch) {
      record.contactEmail = emailMatch[0].trim();
      if (!fieldEvidence.contactEmail.sourceText) {
        fieldEvidence.contactEmail = { confidence: 0.95, sourceText: emailMatch[0].trim() };
      }
    }
  }
  if (!record.phone && documentText) {
    const phoneMatch = documentText.match(/(?:\+?\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,5}/);
    if (phoneMatch && phoneMatch[0].replace(/\D/g, "").length >= 7) {
      record.phone = phoneMatch[0].trim();
      if (!fieldEvidence.phone.sourceText) {
        fieldEvidence.phone = { confidence: 0.92, sourceText: phoneMatch[0].trim() };
      }
    }
  }
  if (!record.linkedinUrl && documentText) {
    const linkedinMatch = documentText.match(/https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/i) || documentText.match(/linkedin\.com\/in\/[a-zA-Z0-9_-]+/i);
    if (linkedinMatch) {
      const url = linkedinMatch[0].startsWith("http") ? linkedinMatch[0] : `https://${linkedinMatch[0]}`;
      record.linkedinUrl = normalizePublicHttpsUrl(url);
      if (!fieldEvidence.linkedinUrl.sourceText) {
        fieldEvidence.linkedinUrl = { confidence: 0.96, sourceText: linkedinMatch[0] };
      }
    }
  }
  if (!record.portfolioUrl && documentText) {
    const githubMatch = documentText.match(/https?:\/\/(?:www\.)?github\.com\/[a-zA-Z0-9_-]+/i) || documentText.match(/github\.com\/[a-zA-Z0-9_-]+/i);
    if (githubMatch) {
      const url = githubMatch[0].startsWith("http") ? githubMatch[0] : `https://${githubMatch[0]}`;
      record.portfolioUrl = normalizePublicHttpsUrl(url);
      if (!fieldEvidence.portfolioUrl.sourceText) {
        fieldEvidence.portfolioUrl = { confidence: 0.95, sourceText: githubMatch[0] };
      }
    }
  }
  if (!record.fullName && documentText) {
    const lines = documentText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const candidateName = lines.find((l) => l.length >= 3 && l.length <= 50 && !l.includes("@") && !l.includes("http") && !/curriculum|resume|cv\b/i.test(l));
    if (candidateName) {
      record.fullName = candidateName;
      if (!fieldEvidence.fullName.sourceText) {
        fieldEvidence.fullName = { confidence: 0.85, sourceText: candidateName };
      }
    }
  }
  return { ...record, fieldEvidence } as any;
}

function extractTextFromResponse(payload: any) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts) && parts.length > 0) {
    const texts = parts.map((p: any) => (typeof p?.text === "string" ? p.text : "")).filter(Boolean);
    if (texts.length > 0) return texts.join("");
  }
  const directText = payload?.candidates?.[0]?.content?.text;
  if (typeof directText === "string" && directText.trim()) return directText;
  throw new Error("Gemini returned no structured resume suggestions.");
}

function isGeminiTimeout(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (error instanceof DOMException && error.name === "TimeoutError") || message.includes("timeout");
}

async function retryTemporaryProviderDemand(request: () => Promise<Response>) {
  let response = await request();
  if (response.status !== 503) return response;
  console.warn("[Resume AI] Gemini reported temporary high demand; retrying once.");
  await new Promise((resolve) => setTimeout(resolve, 600));
  response = await request();
  return response;
}

export function parseGeminiJson(text: string) {
  let cleaned = text.trim();
  const codeBlockMatch = cleaned.match(/```(?:json|json5)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    cleaned = codeBlockMatch[1].trim();
  } else {
    cleaned = cleaned.replace(/^```[a-z0-9_-]*\s*/i, "").replace(/\s*```$/, "").trim();
  }

  // Remove control characters except tab, newline, carriage return
  cleaned = cleaned.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");

  // Remove trailing commas before object/array closing
  cleaned = cleaned.replace(/,\s*([\}\]])/g, "$1");

  try {
    return JSON.parse(cleaned);
  } catch (initialError) {
    const start = cleaned.indexOf("{");
    if (start < 0) throw initialError;

    // 1. Try finding complete balanced object
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < cleaned.length; index += 1) {
      const character = cleaned[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (character === "\\") escaped = true;
        else if (character === '"') inString = false;
        continue;
      }
      if (character === '"') inString = true;
      else if (character === "{") depth += 1;
      else if (character === "}") {
        depth -= 1;
        if (depth === 0) {
          try {
            const slice = cleaned.slice(start, index + 1).replace(/,\s*([\}\]])/g, "$1");
            return JSON.parse(slice);
          } catch {}
        }
      }
    }

    // 2. Try auto-closing open strings, arrays, and objects if truncated
    try {
      let candidate = cleaned.slice(start);
      const stack: ("{" | "[")[] = [];
      let inStr = false;
      let esc = false;
      for (let i = 0; i < candidate.length; i++) {
        const char = candidate[i];
        if (inStr) {
          if (esc) esc = false;
          else if (char === "\\") esc = true;
          else if (char === '"') inStr = false;
        } else {
          if (char === '"') inStr = true;
          else if (char === "{") stack.push("{");
          else if (char === "[") stack.push("[");
          else if (char === "}" && stack.length > 0 && stack[stack.length - 1] === "{") stack.pop();
          else if (char === "]" && stack.length > 0 && stack[stack.length - 1] === "[") stack.pop();
        }
      }

      let repaired = candidate;
      if (inStr) repaired += '"';
      repaired = repaired.replace(/,\s*$/, "");
      while (stack.length > 0) {
        const top = stack.pop();
        repaired += top === "{" ? "}" : "]";
      }
      repaired = repaired.replace(/,\s*([\}\]])/g, "$1");
      const parsed = JSON.parse(repaired);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {}

    throw initialError;
  }
}

function resumeDecodeFailureCategory(error: unknown) {
  if (error instanceof SyntaxError) return "json-syntax";
  const message = error instanceof Error ? error.message.toLocaleLowerCase() : "";
  if (message.includes("no structured resume suggestions")) return "missing-text-part";
  return "unexpected-shape";
}

function compactResumePrompt() {
  return `Extract a private resume into one compact JSON object. Use only facts printed in the resume. Return only valid JSON: no markdown or commentary. Include only fields you can support; the server fills unknown fields safely. Use these names when present: fullName, location, phone, contactEmail, linkedinUrl, portfolioUrl, age, education, degree, careerStatus, currentJob, company, lookingFor, careerField, targetRole, skills, experience, professionalSummary, certifications, languages, projects, verifiedDetails. Keep strings concise. Return every distinct named technical, domain, business, tool, automation, coursework, and professional skill as a standalone tag, not a grouped summary; limit skills to 40, certifications to 8, languages to 6, projects to 5, and verifiedDetails to 10. Certifications use name, issuer, credentialId, issuedOn, link. Languages use name, proficiency. Projects use name, summary below 180 characters, link, technologies with at most 8 items. For every public LinkedIn, portfolio, certification, or project link, return a valid absolute HTTPS URL; add https:// when the resume prints only a domain, and omit invalid, private, credentialed, or non-web links. verifiedDetails captures only extra explicit resume facts not represented above: category is Achievement, Award, Coursework, Leadership, Volunteer, Publication, Training, or Other; title is a short label; detail is an exact resume phrase below 220 characters. Omit unsupported fields and never invent values, links, technologies, or details.`;
}

function needsQualificationRecovery(suggestions: ResumeSuggestions) {
  // If the primary pass already extracted candidate info with skills or experience,
  // do not waste another 10+ seconds on a redundant recovery pass.
  if (suggestions.fullName && (suggestions.skills.length > 0 || suggestions.experience.length > 0)) {
    return false;
  }
  return false;
}

export function mergeQualificationRecovery(primary: ResumeSuggestions, recovery: QualificationRecovery): ResumeSuggestions {
  const recoveredCertifications = new Map(recovery.certifications.map((certification) => [certification.name.toLocaleLowerCase(), certification]));
  const certifications = primary.certifications.map((certification) => {
    const recovered = recoveredCertifications.get(certification.name.toLocaleLowerCase());
    return recovered ? { name: certification.name, issuer: certification.issuer || recovered.issuer, credentialId: certification.credentialId || recovered.credentialId, issuedOn: certification.issuedOn || recovered.issuedOn, link: certification.link || recovered.link } : certification;
  });
  for (const certification of recovery.certifications) if (!certifications.some((item) => item.name.toLocaleLowerCase() === certification.name.toLocaleLowerCase())) certifications.push(certification);
  const recoveredLanguages = new Map(recovery.languages.map((language) => [language.name.toLocaleLowerCase(), language]));
  const languages = primary.languages.map((language) => ({ ...language, proficiency: (language.proficiency || recoveredLanguages.get(language.name.toLocaleLowerCase())?.proficiency || "") as ResumeSuggestions["languages"][number]["proficiency"] }));
  for (const language of recovery.languages) if (!languages.some((item) => item.name.toLocaleLowerCase() === language.name.toLocaleLowerCase())) languages.push(language);
  const recoveredProjects = new Map(recovery.projects.map((project) => [project.name.toLocaleLowerCase(), project]));
  const projects = primary.projects.map((project) => {
    const recovered = recoveredProjects.get(project.name.toLocaleLowerCase());
    return recovered ? { name: project.name, summary: project.summary || recovered.summary, link: project.link || recovered.link, technologies: project.technologies.length ? project.technologies : recovered.technologies } : project;
  });
  for (const project of recovery.projects) if (!projects.some((item) => item.name.toLocaleLowerCase() === project.name.toLocaleLowerCase())) projects.push(project);
  const fieldEvidence = { ...primary.fieldEvidence };
  for (const field of ["certifications", "languages", "projects"] as const) if (!fieldEvidence[field].sourceText && recovery[field].length) fieldEvidence[field] = recovery.fieldEvidence[field];
  return { ...primary, certifications: certifications.slice(0, 12), languages: languages.slice(0, 10), projects: projects.slice(0, 8), fieldEvidence };
}

function normalizeQualificationRecoveryPayload(value: unknown) {
  const normalized = normalizeResumePayload(value) as Partial<ResumeSuggestions>;
  return {
    certifications: normalized.certifications ?? [],
    languages: normalized.languages ?? [],
    projects: normalized.projects ?? [],
    fieldEvidence: {
      certifications: normalized.fieldEvidence?.certifications ?? { confidence: 0, sourceText: "" },
      languages: normalized.fieldEvidence?.languages ?? { confidence: 0, sourceText: "" },
      projects: normalized.fieldEvidence?.projects ?? { confidence: 0, sourceText: "" },
    },
  };
}

type ParsedPdfEvidence = { text: string; citations: string };

function flattenPdfElements(value: unknown, output: string[] = [], citations: string[] = []): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) flattenPdfElements(item, output, citations);
    return;
  }
  const record = value as Record<string, unknown>;
  const content = typeof record.content === "string" ? record.content.trim() : "";
  if (content) {
    output.push(content);
    const page = record["page number"] ?? record.page;
    const bbox = record["bounding box"] ?? record.bbox;
    const location = [page ? `page ${page}` : "", Array.isArray(bbox) ? `position ${bbox.join(", ")}` : ""].filter(Boolean).join(", ");
    citations.push(location ? `[${location}] ${content}` : content);
  }
  for (const [key, child] of Object.entries(record)) {
    if (key !== "content") flattenPdfElements(child, output, citations);
  }
}

async function extractPdfWithOpenDataLoader(buffer: Buffer): Promise<ParsedPdfEvidence | null> {
  try {
    const directory = await mkdtemp(join(tmpdir(), "careertwin-resume-"));
    const inputPath = join(directory, "resume.pdf");
    try {
      await writeFile(inputPath, buffer);
      await convert(inputPath, { outputDir: directory, format: ["json"], quiet: true, readingOrder: "xycut", keepLineBreaks: true, imageOutput: "off", threads: "1" });
      const parsed = JSON.parse(await readFile(join(directory, "resume.json"), "utf8"));
      const textParts: string[] = [];
      const citationParts: string[] = [];
      flattenPdfElements(parsed, textParts, citationParts);
      const text = textParts.join("\n").replace(/\u0000/g, "").trim().slice(0, maxPromptCharacters);
      if (!text) return null;
      return { text, citations: citationParts.join("\n").slice(0, maxPromptCharacters) };
    } finally {
      await rm(directory, { recursive: true, force: true }).catch(() => undefined);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message.split("\n")[0] : String(error);
    console.warn(`[Resume AI] OpenDataLoader fallback skipped: ${msg}`);
    return null;
  }
}

// Pure JS fallback that decodes FlateDecode PDF content streams without external dependencies or Java
function extractPdfTextPureJs(buffer: Buffer): string {
  try {
    const raw = buffer.toString("latin1");
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match: RegExpExecArray | null;
    const textPieces: string[] = [];

    while ((match = streamRegex.exec(raw)) !== null) {
      let streamBuffer = Buffer.from(match[1], "latin1");
      try {
        streamBuffer = Buffer.from(zlib.inflateSync(streamBuffer));
      } catch {
        // Uncompressed stream or alternate filter, keep as is
      }
      const streamStr = streamBuffer.toString("latin1");
      const tjMatches = streamStr.match(/\(([^)]*)\)\s*Tj/g);
      if (tjMatches) {
        for (const tj of tjMatches) {
          const inner = tj.slice(1, tj.lastIndexOf(")")).replace(/\\([()\\])/g, "$1");
          if (inner.trim()) textPieces.push(inner.trim());
        }
      }
      const tjArrayMatches = streamStr.match(/\[(.*?)\]\s*TJ/g);
      if (tjArrayMatches) {
        for (const tja of tjArrayMatches) {
          const innerStrings = tja.match(/\(([^)]*)\)/g);
          if (innerStrings) {
            const reconstructed = innerStrings
              .map((s) => s.slice(1, -1).replace(/\\([()\\])/g, "$1"))
              .join("");
            if (reconstructed.trim()) textPieces.push(reconstructed.trim());
          }
        }
      }
    }
    return textPieces.join(" ").replace(/\s+/g, " ").trim();
  } catch {
    return "";
  }
}

async function extractPdfText(buffer: Buffer): Promise<ParsedPdfEvidence | null> {
  // 1. Fast in-memory extraction using pdf-parse (~30ms)
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse(new Uint8Array(buffer));
    const result = await parser.getText();
    const cleanText = (typeof result === "string" ? result : result?.text || "").replace(/\u0000/g, "").trim();
    if (cleanText.length > 20) {
      await parser.destroy().catch(() => undefined);
      return { text: cleanText.slice(0, maxPromptCharacters), citations: cleanText.slice(0, maxPromptCharacters) };
    }
  } catch (err) {
    console.warn(`[Resume AI] Fast in-memory pdf-parse note: ${err instanceof Error ? err.message : err}`);
  }

  // 2. Pure JS stream text extraction (in-memory, no Java, zero disk I/O)
  try {
    const pureJsText = extractPdfTextPureJs(buffer);
    if (pureJsText.length > 20) {
      return { text: pureJsText.slice(0, maxPromptCharacters), citations: pureJsText.slice(0, maxPromptCharacters) };
    }
  } catch {}

  // 3. OpenDataLoader fallback
  try {
    return await extractPdfWithOpenDataLoader(buffer);
  } catch {
    return null;
  }
}

async function resumeTextForLegacyDocument(buffer: Buffer, mimeType: string) {
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  if (mimeType === "application/msword") {
    throw new Error("AI import currently supports PDF and DOCX resumes. Your DOC file is still saved securely; please review the fields manually.");
  }
  return null;
}

export async function extractResumeSuggestions(buffer: Buffer, mimeType: string): Promise<ResumeSuggestions> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error("Resume intelligence is not configured yet. Please ensure GEMINI_API_KEY is set in .env.");
  if (buffer.length === 0) throw new Error("The uploaded resume is empty.");

  const today = new Date().toISOString().slice(0, 10);
  const prompt = `You are a precision resume intake assistant for CareerTwin AI. Extract ALL information printed in the resume into valid JSON. Capture every single skill, project, certification, language, work experience entry, education details, and awards without omitting anything. Use only facts explicitly stated in the resume; do not invent details.

Return all fields:
- fullName: Full candidate name from header
- location: City, Country / State
- phone: Phone number / Mobile
- contactEmail: Primary contact email
- linkedinUrl: Complete LinkedIn URL (https://...)
- portfolioUrl: Complete GitHub, portfolio, or personal website URL (https://...)
- age: Integer age if stated or calculated from birth date (0 if omitted)
- education: Highest level ("Bachelor's", "Master's", "MPhil", "PhD", "Diploma", or "Other")
- degree: Full program and institution name (e.g., "BS in Computer Science from FAST-NUCES")
- careerStatus: "working" if currently employed, "seeking" if looking for opportunities
- currentJob: Current / most recent job title
- company: Current / most recent employer name
- lookingFor: "First Job", "Internship", "Freelance", "Career Switch", "Higher Studies", or ""
- careerField: Field of expertise (e.g., "Software Engineering", "Artificial Intelligence", "Web Development")
- targetRole: Target or primary job role (e.g., "Full Stack Developer", "AI Engineer")
- skills: Array of EVERY distinct technical skill, programming language, tool, library, framework, database, and domain competency (e.g. ["React", "TypeScript", "Node.js", "Python", "Docker", "PostgreSQL", ...])
- experience: Clean timeline format for all roles: "Role at Company — Location | Dates Description; ..."
- professionalSummary: 2-4 sentence executive profile from the resume
- certifications: Array of objects [{ name, issuer, credentialId, issuedOn, link }]
- languages: Array of objects [{ name, proficiency: "Native" | "Professional" | "Conversational" | "Basic" }]
- projects: Array of objects [{ name, summary, link, technologies: [...] }]
- verifiedDetails: Array of objects [{ category: "Achievement" | "Award" | "Coursework" | "Leadership" | "Volunteer" | "Publication" | "Training" | "Other", title, detail }]

Resume content follows:`;
  const parts: Array<Record<string, unknown>> = [{ text: prompt }];
  let documentTextForHints = "";

  if (mimeType === "application/pdf") {
    let parsedPdf: ParsedPdfEvidence | null = null;
    try {
      parsedPdf = await extractPdfText(buffer);
    } catch (error) {
      const reason = error instanceof Error ? error.message.split("\n")[0].slice(0, 180) : "unknown parser failure";
      console.warn(`[Resume AI] PDF extraction note: ${reason}`);
      parsedPdf = null;
    }
    if (parsedPdf?.text && parsedPdf.text.length > 50) {
      documentTextForHints = parsedPdf.text;
      parts[0] = { text: `${prompt}\n\nExtracted Resume Content:\n${parsedPdf.text}` };
    } else if (buffer.length > 0 && buffer.length < 16 * 1024 * 1024) {
      // Scanned or image-based PDF where text extraction could not find text
      parts.push({ inline_data: { mime_type: mimeType, data: buffer.toString("base64") } });
    }
  } else {
    const text = await resumeTextForLegacyDocument(buffer, mimeType);
    const normalizedText = (text || "").replace(/\u0000/g, "").trim().slice(0, maxPromptCharacters);
    if (!normalizedText) throw new Error("No readable text was found in this resume.");
    documentTextForHints = normalizedText;
    parts[0] = { text: `${prompt}\n\n${normalizedText}` };
  }

  const models = await getAutoDiscoveredGeminiModels(apiKey);

  const requestGemini = async (generationConfig: Record<string, unknown>, timeoutMs: number, requestParts = parts): Promise<Response> => {
    let lastError: Error | null = null;
    let lastResponse: Response | null = null;
    for (const model of models) {
      const t0 = Date.now();
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: requestParts }],
              generationConfig: {
                ...generationConfig,
              },
            }),
            signal: AbortSignal.timeout(timeoutMs),
          }
        );
        const ms = Date.now() - t0;
        if (response.ok) {
          console.log(`[Resume AI] ✅ ${model} responded OK in ${ms}ms`);
          return response;
        }
        lastResponse = response;
        const status = response.status;
        console.warn(`[Resume AI] ❌ ${model} returned HTTP ${status} in ${ms}ms, trying next...`);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        const reason = lastError.message.toLowerCase().includes("timeout") ? "timeout" : lastError.message.slice(0, 60);
        console.warn(`[Resume AI] ❌ ${model} network error in ${Date.now() - t0}ms: ${reason}`);
      }
    }
    if (lastResponse) return lastResponse;
    throw lastError || new Error("All auto-discovered Gemini candidate models failed to respond.");
  };

  const compactParts = documentTextForHints
    ? [{ text: `${compactResumePrompt()}\n\nResume text:\n${compactResumeSourceText(documentTextForHints)}` }]
    : [{ text: compactResumePrompt() }, ...parts.filter((part) => "inline_data" in part)];
  const requestCompactFallback = () => requestGemini({ responseMimeType: "application/json", temperature: 0.1, maxOutputTokens: 2048 }, geminiResumeFallbackTimeoutMs, compactParts);

  const ensureSuccessfulGeminiResponse = async (candidate: Response) => {
    if (candidate.ok) return;
    const detail = await candidate.text().catch(() => "");
    let providerMessage = "no provider detail";
    try { providerMessage = String(JSON.parse(detail)?.error?.message ?? providerMessage).slice(0, 240); } catch { providerMessage = detail.replace(/\s+/g, " ").slice(0, 240) || providerMessage; }
    console.warn(`[Resume AI] Gemini request failed (${candidate.status}): ${providerMessage}`);
    if (candidate.status === 429) throw new Error("Gemini’s free-tier limit was reached. Your resume is saved; please try AI import again later.");
    if (candidate.status === 400 && mimeType === "application/pdf") throw new Error("Gemini could not read this PDF. Check that it opens normally and is not password-protected, then retry AI review. Your resume is saved securely.");
    throw new Error(detail.includes("API key") ? "The Gemini API key was rejected. Please check the server configuration." : "Gemini could not analyze this resume right now. Your resume is saved securely. You can retry the AI review below.");
  };

  const decodeResumeResponse = async (candidate: Response) => {
    const rawJson = await candidate.json();
    const text = extractTextFromResponse(rawJson);
    const parsed = parseGeminiJson(text);
    return normalizeResumePayload(parsed, documentTextForHints);
  };

  let response: Response;
  try {
    response = await retryTemporaryProviderDemand(() =>
      requestGemini({ responseMimeType: "application/json", responseSchema, temperature: 0.1, maxOutputTokens: 4096 }, geminiResumeRequestTimeoutMs)
    );
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.message.toLowerCase().includes("timeout") || error.message.toLowerCase().includes("aborted"))) {
      console.warn("[Resume AI] Primary request timed out, retrying with compact JSON fallback...");
      try {
        response = await retryTemporaryProviderDemand(requestCompactFallback);
      } catch (fallbackError) {
        if (fallbackError instanceof Error && (fallbackError.name === "TimeoutError" || fallbackError.message.toLowerCase().includes("timeout") || fallbackError.message.toLowerCase().includes("aborted"))) {
          throw new Error("Gemini is taking longer than usual to analyze this resume right now. Your resume is saved securely; please retry AI review in a moment.");
        }
        throw fallbackError;
      }
    } else {
      throw error;
    }
  }

  if (!response.ok) {
    console.warn("[Resume AI] Primary structured request failed, retrying with compact JSON fallback...");
    response = await retryTemporaryProviderDemand(requestCompactFallback);
  }

  await ensureSuccessfulGeminiResponse(response);

  let decoded: unknown;
  try {
    decoded = await decodeResumeResponse(response);
  } catch (error) {
    console.warn(`[Resume AI] Primary response decode failed (${resumeDecodeFailureCategory(error)}); retrying with compact format...`);
    response = await retryTemporaryProviderDemand(requestCompactFallback);
    await ensureSuccessfulGeminiResponse(response);
    try {
      decoded = await decodeResumeResponse(response);
    } catch {
      throw new Error("Gemini could not return a readable resume review right now. Your resume is saved securely; please retry AI review in a moment.");
    }
  }

  let parsed = resumeSuggestionSchema.safeParse(decoded);
  if (!parsed.success) {
    const paths = parsed.error.issues.map((issue) => `${issue.path.join(".") || "root"} (${issue.code})`).slice(0, 12).join(", ");
    console.warn(`[Resume AI] Validation note at: ${paths}; normalizing output safely.`);
  }

  const result = (decoded as ResumeSuggestions) || normalizeResumePayload({}, documentTextForHints);

  if (!documentTextForHints || !needsQualificationRecovery(result)) {
    return result;
  }

  const recoveryPrompt = `You are completing a private resume intake audit. Extract only explicit CERTIFICATIONS, LANGUAGES, and PROJECTS that were omitted or left incomplete in an earlier pass. Use the exact resume text below. Never infer facts. Return JSON only with certifications (name, issuer, credentialId, issuedOn, link), languages (name, proficiency), projects (name, summary, link, technologies), and fieldEvidence for exactly those three fields. Use empty strings or arrays when absent. Return a certificate issuer, identifier, date, public credential link, language proficiency, project link, or technology only if printed in the resume. Use valid absolute HTTPS URLs for any returned public link. Keep evidence excerpts exact and below 180 characters.\n\nResume text:\n${compactResumeSourceText(documentTextForHints)}`;
  try {
    const recoveryResponse = await requestGemini({ responseMimeType: "application/json", temperature: 0, maxOutputTokens: 2400 }, geminiQualificationRecoveryTimeoutMs, [{ text: recoveryPrompt }]);
    if (!recoveryResponse.ok) {
      console.warn(`[Resume AI] Qualification recovery skipped after provider HTTP ${recoveryResponse.status}.`);
      return result;
    }
    const recoveryPayload = await recoveryResponse.json();
    const recovery = qualificationRecoverySchema.safeParse(normalizeQualificationRecoveryPayload(parseGeminiJson(extractTextFromResponse(recoveryPayload))));
    if (!recovery.success) {
      console.warn("[Resume AI] Qualification recovery returned an invalid structure; preserving the primary result.");
      return result;
    }
    return mergeQualificationRecovery(result, recovery.data);
  } catch (error) {
    const reason = isGeminiTimeout(error) ? "timed out" : "failed";
    console.warn(`[Resume AI] Qualification recovery ${reason}; preserving the primary result.`);
    return result;
  }
}
