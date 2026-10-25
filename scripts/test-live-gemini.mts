import { storageGetSignedUrl } from "../server/storage";
const key = process.argv[2];
if (!key) throw new Error("Usage: pnpm exec tsx scripts/test-live-gemini.mts <storage-key>");
const suppliedMimeType = process.argv[3];
const mimeType = suppliedMimeType ?? (key.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
process.env.GEMINI_MODEL ||= "gemini-3.5-flash-lite";
const { extractResumeSuggestions } = await import("../server/gemini");
const signedUrl = await storageGetSignedUrl(key);
const response = await fetch(signedUrl, { redirect: "follow", signal: AbortSignal.timeout(10000) });
if (!response.ok) throw new Error(`Stored resume read failed: HTTP ${response.status}`);
const buffer = Buffer.from(await response.arrayBuffer());
try {
  const result = await extractResumeSuggestions(buffer, mimeType);
  console.log(JSON.stringify({ ok: true, mimeType, populatedFields: Object.entries(result).filter(([field, value]) => field !== "fieldEvidence" && (Array.isArray(value) ? value.length > 0 : value !== "" && value !== 0)).map(([field]) => field), evidenceFields: Object.keys(result.fieldEvidence ?? {}).filter((field) => result.fieldEvidence?.[field]?.sourceText), projectCardCount: result.projects.length, projectCardsWithExplicitLinks: result.projects.filter((project) => Boolean(project.link)).length, projectTechnologyTagCount: result.projects.reduce((total, project) => total + project.technologies.length, 0), certificationCount: result.certifications.length, certificationsWithIssuers: result.certifications.filter((certification) => Boolean(certification.issuer)).length, certificationsWithExplicitLinks: result.certifications.filter((certification) => Boolean(certification.link)).length, languageCount: result.languages.length, languagesWithExplicitProficiency: result.languages.filter((language) => Boolean(language.proficiency)).length }, null, 2));
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown Gemini failure";
  console.log(JSON.stringify({ ok: false, error: message.slice(0, 500) }, null, 2));
  process.exitCode = 2;
}
